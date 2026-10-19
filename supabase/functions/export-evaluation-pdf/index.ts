// ============================================================
// MISSION-DGC — export-evaluation-pdf
//
// Produit le PDF d'une évaluation ou d'une synthèse d'exercice.
//
// L'appel se fait avec le JWT du demandeur : les fonctions
// get_evaluation_pdf_data / get_synthese_pdf_data rejouent les
// règles du module, donc l'autorisation n'est pas réimplantée ici.
// Un collaborateur n'obtient jamais le PDF d'un brouillon.
//
// Les évaluations validées sont archivées dans le bucket
// « evaluations » chiffrées sous org_id/exercice/, par audience, et resservies telles
// quelles aux appels suivants : le document de référence ne doit
// pas changer entre deux téléchargements.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { evaluationArchivePath, encryptArchive, decryptArchive } from './archive.ts';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

// L'audit de sécurité a demandé de ne pas renvoyer '*'.
const ALLOWED = (Deno.env.get('APP_ORIGINS') ?? 'https://mamission.abodje.com')
  .split(',').map((o) => o.trim());

function cors(origin: string | null) {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ── Palette D&G CONSEIL ──
const NAVY   = rgb(0.086, 0.318, 0.612);   // #16519C
const COPPER = rgb(0.902, 0.455, 0.200);   // #E67433
const INK    = rgb(0.12, 0.14, 0.17);
const MUTED  = rgb(0.42, 0.45, 0.50);
const RULE   = rgb(0.85, 0.87, 0.90);
const ZEBRA  = rgb(0.973, 0.976, 0.980);

const A4: [number, number] = [595.28, 841.89];
const M = 48;                 // marge
const W = A4[0] - M * 2;      // largeur utile

// Helvetica est encodée en WinAnsi, qui couvre le français.
// Tout caractère hors jeu ferait échouer drawText : on les remplace.
function safe(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '');
}

function dateFR(v: unknown): string {
  if (!v) return '';
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function num(v: unknown, dec = 2): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return isNaN(n) ? '—' : n.toFixed(dec).replace('.', ',');
}

const STATUTS: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Transmise',
  observations_recues: 'Observations reçues', revisee: 'Révisée',
  validee: 'Validée', arbitrage: 'En arbitrage', cloturee: 'Clôturée',
};
const ACTIONS: Record<string, string> = {
  envoi: 'Transmission au collaborateur', observations: 'Observations du collaborateur',
  revision: 'Révision par l’évaluateur', approbation: 'Approbation du collaborateur',
  desaccord: 'Désaccord signalé', validation: 'Validation',
  arbitrage_demande: 'Arbitrage demandé', arbitrage_decision: 'Décision d’arbitrage',
};
const TYPES: Record<string, string> = {
  mission: 'Évaluation de mission', annuelle: 'Évaluation annuelle',
  fin_stage: 'Évaluation de fin de stage',
};
const PRACTICES: Record<string, string> = {
  comptable: 'Comptable', conseil: 'Conseil', juridique: 'Juridique & Fiscale',
};

// ============================================================
// Petit moteur de mise en page : il porte la pagination, pour
// qu'une grille de huit catégories ne déborde pas de la page.
// ============================================================
class Layout {
  declare doc: PDFDocument;
  declare page: any;
  y = 0;
  declare regular: any;
  declare bold: any;
  pageNo = 0;
  title = '';
  subtitle = '';

  async init(title: string, subtitle: string) {
    this.doc = await PDFDocument.create();
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.title = title;
    this.subtitle = subtitle;
    this.newPage();
    return this;
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.pageNo += 1;
    this.y = A4[1] - M;

    if (this.pageNo > 1) {
      this.page.drawText(safe(this.title), {
        x: M, y: this.y - 8, size: 8, font: this.bold, color: MUTED,
      });
      this.y -= 26;
    }
  }

  need(h: number) {
    if (this.y - h < M + 28) this.newPage();
  }

  text(s: string, opts: { size?: number; font?: 'r' | 'b'; color?: any; x?: number; indent?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.font === 'b' ? this.bold : this.regular;
    this.page.drawText(safe(s), {
      x: opts.x ?? (M + (opts.indent ?? 0)),
      y: this.y, size, font, color: opts.color ?? INK,
    });
  }

  // Texte à droite d'une position donnée
  right(s: string, xRight: number, opts: { size?: number; font?: 'r' | 'b'; color?: any } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.font === 'b' ? this.bold : this.regular;
    const str = safe(s);
    const w = font.widthOfTextAtSize(str, size);
    this.page.drawText(str, { x: xRight - w, y: this.y, size, font, color: opts.color ?? INK });
  }

  // Découpe un paragraphe à la largeur disponible
  wrap(s: string, width: number, size = 9.5, font: 'r' | 'b' = 'r'): string[] {
    const f = font === 'b' ? this.bold : this.regular;
    const words = safe(s).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  paragraph(s: string, opts: { size?: number; indent?: number; color?: any; width?: number } = {}) {
    const size = opts.size ?? 9.5;
    const width = opts.width ?? (W - (opts.indent ?? 0));
    for (const line of this.wrap(s, width, size)) {
      this.need(size + 4);
      this.text(line, { size, indent: opts.indent, color: opts.color });
      this.y -= size + 3.5;
    }
  }

  rule(color = RULE) {
    this.page.drawLine({
      start: { x: M, y: this.y }, end: { x: M + W, y: this.y },
      thickness: 0.6, color,
    });
  }

  band(label: string) {
    this.need(34);
    this.y -= 6;
    this.page.drawRectangle({ x: M, y: this.y - 4, width: 3, height: 13, color: COPPER });
    this.text(label.toUpperCase(), { size: 9, font: 'b', color: NAVY, indent: 10 });
    this.y -= 10;
    this.rule();
    this.y -= 14;
  }

  gap(h = 10) { this.y -= h; }

  // Mention d'édition : elle se pose en bas de la page courante plutôt
  // que de provoquer une page supplémentaire pour deux lignes.
  footnote(s: string) {
    const lines = this.wrap(s, W, 7.5);
    const h = lines.length * 10;
    let y = Math.max(this.y - 10, M + 14);
    if (this.y - 10 - h < M + 14) y = M + 14 + h;
    this.page.drawLine({
      start: { x: M, y: y + 6 }, end: { x: M + W, y: y + 6 },
      thickness: 0.5, color: RULE,
    });
    lines.forEach((ln, i) => {
      this.page.drawText(safe(ln), {
        x: M, y: y - i * 10, size: 7.5, font: this.regular, color: MUTED,
      });
    });
    this.y = Math.min(this.y, y - h);
  }

  finish() {
    const total = this.doc.getPageCount();
    this.doc.getPages().forEach((p, i) => {
      const s = safe(`${this.subtitle}  ·  Page ${i + 1} / ${total}`);
      const w = this.regular.widthOfTextAtSize(s, 7.5);
      p.drawText(s, { x: (A4[0] - w) / 2, y: 26, size: 7.5, font: this.regular, color: MUTED });
    });
    return this.doc.save();
  }
}

// ── En-tête de première page ──
function header(L: Layout, org: string, docTitle: string, docRef: string) {
  L.text(safe(org).toUpperCase(), { size: 13, font: 'b', color: NAVY });
  L.right(docRef, M + W, { size: 8, color: MUTED });
  L.y -= 16;
  L.text(docTitle, { size: 10.5, font: 'b' });
  L.y -= 8;
  L.rule(NAVY);
  L.y -= 18;
}

// ── Bloc d'informations en deux colonnes ──
function infoGrid(L: Layout, rows: [string, string][]) {
  const colW = W / 2;
  for (let i = 0; i < rows.length; i += 2) {
    L.need(16);
    const pair = rows.slice(i, i + 2);
    pair.forEach(([k, v], j) => {
      const x = M + j * colW;
      L.page.drawText(safe(k), { x, y: L.y, size: 7.5, font: L.bold, color: MUTED });
      L.page.drawText(safe(v || '—'), { x, y: L.y - 11, size: 9.5, font: L.regular, color: INK });
    });
    L.y -= 28;
  }
}

// ============================================================
// PDF d'une évaluation
// ============================================================
async function buildEvaluation(d: any): Promise<Uint8Array> {
  const ev = d.evaluation ?? {};
  const org = d.organisation?.nom ?? 'Cabinet';
  const typeLabel = TYPES[ev.type] ?? 'Évaluation';
  const L = await new Layout().init(
    `${typeLabel} — ${d.collaborateur?.nom ?? ''}`,
    `${org} — ${typeLabel}`,
  );

  header(L, org, typeLabel,
    `Réf. ${String(ev.id ?? '').slice(0, 8).toUpperCase()}`);

  // ── Identification ──
  infoGrid(L, [
    ['COLLABORATEUR', d.collaborateur?.nom],
    ['ÉVALUATEUR', d.evaluateur?.nom],
    ['GRADE', `${d.collaborateur?.grade ?? ''}${ev.echelon ? ` — ${ev.echelon}` : ''}`],
    ['GRADE ÉVALUATEUR', d.evaluateur?.grade],
    ['PRACTICE', PRACTICES[ev.practice] ?? ev.practice],
    ['EXERCICE', ev.exercice ? String(ev.exercice) : ''],
    ...(ev.type === 'mission'
      ? ([
          ['MISSION', `${ev.code_mission ? ev.code_mission + ' — ' : ''}${ev.mission ?? ''}`],
          ['CLIENT', ev.client],
        ] as [string, string][])
      : []),
    ['PÉRIODE', ev.periode_debut
      ? `${dateFR(ev.periode_debut)} au ${dateFR(ev.periode_fin)}` : ''],
    ['STATUT', STATUTS[ev.statut] ?? ev.statut],
  ]);

  // ── Résultat ──
  L.need(74);
  const boxY = L.y - 58;
  L.page.drawRectangle({
    x: M, y: boxY, width: W, height: 58,
    color: rgb(0.969, 0.976, 0.988),
    borderColor: NAVY, borderWidth: 0.8,
  });
  L.page.drawText('SCORE PONDÉRÉ', {
    x: M + 16, y: boxY + 38, size: 7.5, font: L.bold, color: MUTED,
  });
  L.page.drawText(safe(`${num(ev.score)} / 100`), {
    x: M + 16, y: boxY + 14, size: 20, font: L.bold, color: NAVY,
  });
  const appr = safe(ev.appreciation ?? '—');
  const apprW = L.bold.widthOfTextAtSize(appr, 11);
  L.page.drawText('APPRÉCIATION', {
    x: M + W - 16 - L.bold.widthOfTextAtSize('APPRÉCIATION', 7.5),
    y: boxY + 38, size: 7.5, font: L.bold, color: MUTED,
  });
  L.page.drawText(appr, {
    x: M + W - 16 - apprW, y: boxY + 15, size: 11, font: L.bold, color: COPPER,
  });
  L.y = boxY - 18;

  // Un brouillon imprimé doit se signaler comme tel.
  if (ev.statut === 'brouillon') {
    L.need(20);
    L.text('Document provisoire : évaluation non transmise au collaborateur.',
      { size: 8.5, font: 'b', color: COPPER });
    L.y -= 16;
  }

  // ── La grille ──
  L.band('Grille d’évaluation');

  const cats: any[] = d.categories ?? [];
  const xNote = M + W - 34;
  const xWeight = M + W - 96;

  for (const c of cats) {
    L.need(30);
    // Ligne de catégorie
    L.page.drawRectangle({
      x: M, y: L.y - 5, width: W, height: 16, color: rgb(0.937, 0.949, 0.965),
    });
    L.text(`${c.code}. ${c.libelle}`, { size: 9, font: 'b', color: NAVY, indent: 6 });
    L.right(`${num(Number(c.ponderation) * 100, 1)} %`, xWeight, { size: 8.5, font: 'b', color: MUTED });
    L.right(c.note ? `${num(c.note)} / 5` : '—', M + W - 6, { size: 9, font: 'b', color: INK });
    L.y -= 20;

    const subs: any[] = c.sous_criteres ?? [];
    subs.forEach((s, i) => {
      const lines = L.wrap(s.libelle, W - 90, 8.5);
      L.need(lines.length * 12 + 6);
      if (i % 2 === 1) {
        L.page.drawRectangle({
          x: M, y: L.y - 4 - (lines.length - 1) * 12,
          width: W, height: lines.length * 12 + 2, color: ZEBRA,
        });
      }
      lines.forEach((ln, k) => {
        L.text(ln, { size: 8.5, indent: 12, color: INK });
        if (k === 0) {
          L.right(s.note ? String(s.note) : '—', M + W - 10,
            { size: 9, font: 'b', color: s.note ? NAVY : MUTED });
        }
        L.y -= 12;
      });
      if (s.commentaire) {
        L.paragraph(s.commentaire, { size: 8, indent: 20, color: MUTED, width: W - 110 });
        L.y -= 2;
      }
    });
    L.gap(6);
  }

  // ── Commentaires ──
  if (ev.commentaire_evaluateur) {
    L.band('Axes de développement — évaluateur');
    L.paragraph(ev.commentaire_evaluateur);
  }
  if (ev.observations_collaborateur) {
    L.band('Observations du collaborateur');
    L.paragraph(ev.observations_collaborateur);
    if (ev.objection) {
      L.gap(4);
      L.text('Le collaborateur a émis une objection sur sa notation.',
        { size: 8.5, font: 'b', color: COPPER });
      L.y -= 14;
    }
  }
  if (ev.desaccord) {
    L.band('Désaccord signalé');
    L.paragraph(ev.motif_desaccord ?? 'Motif non précisé.', { color: INK });
    L.gap(4);
    L.paragraph(
      'Conformément à la procédure, le désaccord est consigné et transmis à la direction. ' +
      'L’évaluateur demeure seul responsable de la validation.',
      { size: 8.5, color: MUTED },
    );
  }

  // ── Avis consultatifs (§5.5), absents du PDF du collaborateur ──
  const avis: any[] = d.avis_consultatifs ?? [];
  if (avis.length) {
    L.band('Avis consultatifs (§5.5)');
    L.paragraph(
      'Avis recueillis à titre consultatif. Ils n’entrent pas dans le calcul du score ' +
      'et ne sont pas communiqués au collaborateur.',
      { size: 8.5, color: MUTED },
    );
    L.gap(6);
    for (const a of avis) {
      L.need(30);
      L.text(`${a.contributeur}${a.grade ? ` (${a.grade})` : ''}`, { size: 9, font: 'b' });
      L.right(`${a.appreciation ?? '—'} / 5`, M + W, { size: 9, font: 'b', color: NAVY });
      L.y -= 13;
      if (a.points_forts) L.paragraph(`Points forts : ${a.points_forts}`, { size: 8.5, indent: 10, color: MUTED });
      if (a.axes_progres) L.paragraph(`Axes de progrès : ${a.axes_progres}`, { size: 8.5, indent: 10, color: MUTED });
      L.gap(5);
    }
  }

  // ── Historique ──
  const ech: any[] = d.echanges ?? [];
  if (ech.length) {
    L.band('Historique des échanges');
    for (const x of ech) {
      L.need(16);
      L.text(dateFR(x.date), { size: 8.5, color: MUTED });
      L.text(ACTIONS[x.action] ?? x.action, { size: 8.5, font: 'b', indent: 62 });
      L.right(safe(x.auteur ?? ''), M + W - 60, { size: 8.5, color: MUTED });
      if (x.score_apres !== null && x.score_apres !== undefined) {
        L.right(num(x.score_apres), M + W, { size: 8.5, font: 'b', color: NAVY });
      }
      L.y -= 12;
      if (x.commentaire) {
        L.paragraph(x.commentaire, { size: 8, indent: 62, color: MUTED, width: W - 130 });
      }
      L.gap(3);
    }
  }

  // ── Validation ──
  L.band('Validation');
  infoGrid(L, [
    ['TRANSMISE LE', dateFR(ev.envoyee_le)],
    ['OBSERVÉE LE', dateFR(ev.observee_le)],
    ['VALIDÉE LE', dateFR(ev.validee_le)],
    ['VALIDÉE PAR', ev.validee_par],
  ]);

  if (ev.statut === 'validee' || ev.statut === 'cloturee') {
    L.need(56);
    L.gap(10);
    const sy = L.y;
    [['Le collaborateur', d.collaborateur?.nom], ['L’évaluateur', d.evaluateur?.nom]]
      .forEach(([role, nom], i) => {
        const x = M + i * (W / 2);
        L.page.drawLine({
          start: { x, y: sy - 30 }, end: { x: x + W / 2 - 40, y: sy - 30 },
          thickness: 0.6, color: RULE,
        });
        L.page.drawText(safe(role as string), { x, y: sy - 42, size: 7.5, font: L.bold, color: MUTED });
        L.page.drawText(safe((nom as string) ?? ''), { x, y: sy - 53, size: 8.5, font: L.regular, color: INK });
      });
    L.y = sy - 62;
  }

  return L.finish();
}

// ============================================================
// PDF d'une synthèse d'exercice
// ============================================================
async function buildSynthese(d: any): Promise<Uint8Array> {
  const s = d.synthese ?? {};
  const h = d.historique ?? {};
  const org = d.organisation?.nom ?? 'Cabinet';
  const exLabel = String(s.exercice ?? '');

  const L = await new Layout().init(
    `Synthèse d’évaluation — ${s.collaborateur ?? ''}`,
    `${org} — Grille d’évaluation globale`,
  );

  header(L, org, `Grille d’évaluation globale — exercice ${exLabel}`,
    `Éditée le ${dateFR(new Date().toISOString())}`);

  infoGrid(L, [
    ['COLLABORATEUR', s.collaborateur],
    ['GRADE', `${s.grade ?? ''}${s.echelon ? ` — ${s.echelon}` : ''}`],
    ['PRACTICE', PRACTICES[s.practice] ?? s.practice],
    ['EXERCICE', exLabel],
  ]);

  // ── Les trois scores ──
  const pm = Number(s.ponderation?.missions ?? 0) * 100;
  const pa = Number(s.ponderation?.annuelle ?? 0) * 100;
  L.need(82);
  const by = L.y - 64;
  const colW = W / 3;
  const cells: [string, string, any][] = [
    [`MISSIONS (${num(pm, 0)} %)`, num(s.score_missions), INK],
    [`ANNUELLE (${num(pa, 0)} %)`, num(s.score_annuelle), INK],
    ['SCORE GLOBAL', num(s.score_global), NAVY],
  ];
  L.page.drawRectangle({
    x: M, y: by, width: W, height: 64,
    color: rgb(0.969, 0.976, 0.988), borderColor: NAVY, borderWidth: 0.8,
  });
  cells.forEach(([label, val, color], i) => {
    const x = M + i * colW + 14;
    L.page.drawText(safe(label), { x, y: by + 44, size: 7, font: L.bold, color: MUTED });
    L.page.drawText(safe(val), {
      x, y: by + 18, size: i === 2 ? 19 : 15, font: L.bold, color,
    });
    if (i > 0) {
      L.page.drawLine({
        start: { x: M + i * colW, y: by + 8 }, end: { x: M + i * colW, y: by + 56 },
        thickness: 0.5, color: RULE,
      });
    }
  });
  L.y = by - 16;

  L.text(`Appréciation : ${s.appreciation_label ?? '—'}`, { size: 10, font: 'b', color: COPPER });
  L.y -= 18;

  if (s.provisoire) {
    L.paragraph(
      s.annuelle_disponible === false
        ? 'Synthèse provisoire : l’évaluation annuelle de l’exercice n’est pas encore validée. ' +
          'Le score affiché est l’agrégat des missions, et la conséquence RH n’est pas établie.'
        : 'Synthèse provisoire : aucune évaluation de mission validée sur l’exercice.',
      { size: 8.5, color: COPPER },
    );
    L.gap(6);
  } else if (s.consequence_rh) {
    L.band('Conséquence RH usuelle');
    L.paragraph(s.consequence_rh, { size: 9 });
  }

  // ── Les missions et leurs évaluateurs ──
  const agg = s.agregat_missions ?? {};
  L.band('Évaluations de mission de l’exercice');

  const MODES: Record<string, string> = {
    simple: 'moyenne arithmétique', duree: 'pondérée par la durée',
    charge: 'pondérée par la charge réelle',
  };
  L.paragraph(
    `${agg.nb_missions ?? 0} mission(s) significative(s), évaluée(s) par ` +
    `${agg.nb_evaluateurs ?? 0} chef(s) de mission. Agrégation : ${MODES[agg.mode] ?? agg.mode}.`,
    { size: 8.5, color: MUTED },
  );
  L.gap(4);

  if (agg.dispersion_forte) {
    L.paragraph(
      `Les notes attribuées s’échelonnent de ${num(agg.score_min)} à ${num(agg.score_max)}, ` +
      `soit une étendue de ${num(agg.etendue)} points. La moyenne ne rend pas compte de cet écart ` +
      `entre évaluateurs.`,
      { size: 8.5, color: COPPER },
    );
    L.gap(6);
  }

  // Tableau des missions
  const miss: any[] = s.missions ?? [];
  if (miss.length) {
    L.need(20);
    const cols = [M, M + 72, M + 250, M + 380, M + 470, M + W];
    L.page.drawRectangle({ x: M, y: L.y - 4, width: W, height: 15, color: rgb(0.937, 0.949, 0.965) });
    ['CODE', 'MISSION', 'ÉVALUATEUR', 'PÉRIODE', 'SCORE'].forEach((t, i) => {
      L.page.drawText(t, { x: cols[i] + 4, y: L.y, size: 7, font: L.bold, color: MUTED });
    });
    L.y -= 18;

    miss.forEach((m, i) => {
      const nameLines = L.wrap(m.mission_name ?? '', 170, 8);
      const rowH = Math.max(nameLines.length * 10, 11) + 4;
      L.need(rowH + 4);
      if (i % 2 === 1) {
        L.page.drawRectangle({ x: M, y: L.y - rowH + 9, width: W, height: rowH, color: ZEBRA });
      }
      const struck = m.significative === false;
      const col = struck ? MUTED : INK;
      L.page.drawText(safe(m.mission_code ?? '—'), { x: cols[0] + 4, y: L.y, size: 8, font: L.regular, color: col });
      nameLines.forEach((ln, k) => {
        L.page.drawText(safe(ln), { x: cols[1] + 4, y: L.y - k * 10, size: 8, font: L.regular, color: col });
      });
      L.page.drawText(safe(m.evaluateur ?? ''), { x: cols[2] + 4, y: L.y, size: 8, font: L.regular, color: col });
      L.page.drawText(safe(dateFR(m.periode_fin)), { x: cols[3] + 4, y: L.y, size: 8, font: L.regular, color: col });
      const sc = safe(num(m.score));
      L.page.drawText(sc, {
        x: cols[5] - 4 - L.bold.widthOfTextAtSize(sc, 8.5), y: L.y,
        size: 8.5, font: L.bold, color: struck ? MUTED : NAVY,
      });
      if (struck) {
        L.page.drawText('écartée', { x: cols[4] + 4, y: L.y, size: 7, font: L.regular, color: MUTED });
      }
      L.y -= rowH;
    });
    L.gap(6);
  }

  // Détail par évaluateur
  const parEv: any[] = agg.par_evaluateur ?? [];
  if (parEv.length > 1) {
    L.band('Détail par évaluateur');
    parEv.forEach((e) => {
      L.need(14);
      L.text(`${e.evaluateur}${e.grade ? ` (${e.grade})` : ''}`, { size: 8.5 });
      L.right(`${e.nb_missions} mission(s)`, M + 400, { size: 8.5, color: MUTED });
      L.right(num(e.score_moyen), M + W, { size: 8.5, font: 'b', color: NAVY });
      L.y -= 13;
    });
    L.gap(4);
  }

  // ── Évaluation annuelle ──
  if (s.annuelle) {
    L.band('Évaluation annuelle');
    infoGrid(L, [
      ['ÉVALUATEUR', s.annuelle.evaluateur],
      ['VALIDÉE LE', dateFR(s.annuelle.validated_at)],
      ['SCORE', `${num(s.annuelle.score)} / 100`],
      ['APPRÉCIATION', s.annuelle.appreciation],
    ]);
  }

  // ── Objectifs ──
  const objs: any[] = s.objectifs ?? [];
  if (objs.length) {
    L.band('Objectifs de l’exercice');
    if (s.objectifs_taux_moyen !== null && s.objectifs_taux_moyen !== undefined) {
      L.paragraph(
        `Taux moyen de réalisation : ${num(s.objectifs_taux_moyen, 1)} % ` +
        `(${s.objectifs_notes} objectif(s) noté(s) sur ${s.objectifs_total}). ` +
        `Les objectifs n’entrent pas dans le calcul pondéré.`,
        { size: 8.5, color: MUTED },
      );
      L.gap(6);
    }
    objs.forEach((o) => {
      L.need(20);
      L.text(safe(o.title), { size: 9, font: 'b' });
      L.right(o.achievement_rate !== null && o.achievement_rate !== undefined
        ? `${o.achievement_rate} %` : 'non noté',
        M + W, { size: 8.5, font: 'b', color: NAVY });
      L.y -= 12;
      if (o.deadline) {
        L.text(`Échéance : ${dateFR(o.deadline)}`, { size: 8, indent: 10, color: MUTED });
        L.y -= 11;
      }
      if (o.achievement_comment) {
        L.paragraph(o.achievement_comment, { size: 8, indent: 10, color: MUTED });
      }
      L.gap(4);
    });
  }

  // ── Trajectoire (§11.1) ──
  const cycles: any[] = h.cycles ?? [];
  if (cycles.length) {
    L.band('Trajectoire sur les derniers cycles (§11.1)');
    cycles.forEach((c) => {
      L.need(14);
      L.text(String(c.exercice), { size: 8.5, font: 'b' });
      L.text(safe(c.appreciation_label ?? ''), { size: 8.5, indent: 54, color: MUTED });
      L.right(num(c.score_global), M + W, { size: 9, font: 'b', color: NAVY });
      L.y -= 13;
    });
    L.gap(4);
    const TEND: Record<string, string> = {
      progression: 'En progression', stable: 'Stable', recul: 'En recul',
    };
    if (h.tendance) {
      L.paragraph(
        `${TEND[h.tendance] ?? h.tendance} (${(Number(h.variation) > 0 ? '+' : '')}${num(h.variation)} points). ` +
        `Moyenne sur ${h.cycles_disponibles} cycle(s) : ${num(h.score_moyen)}.`,
        { size: 8.5 },
      );
    }
    if (!h.eligible_decision) {
      L.gap(2);
      L.paragraph(
        'Un seul cycle disponible. Le manuel §11.1 observe le score sur deux à trois cycles ' +
        'avant une décision d’avancement.',
        { size: 8.5, color: COPPER },
      );
    }
  }

  L.footnote(
    `Document établi à partir des données validées dans Mission-DGC. ` +
    `Édité par ${d.lecteur ?? ''} le ${dateFR(new Date().toISOString())}.`,
  );

  return L.finish();
}

// ============================================================
// Point d'entrée
// ============================================================
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const ch = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...ch, 'Content-Type': 'application/json' } });
  }

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const archiveSecret = Deno.env.get('EVALUATION_PDF_ARCHIVE_KEY');
    if (!url || !anonKey || !archiveSecret) throw new Error('Configuration du service incomplète');

    // Client porteur du JWT de l'appelant : les RPC appliquent ses droits.
    const sb = createClient(
      url,
      anonKey,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: authenticated, error: authError } = await sb.auth.getUser(auth.slice(7));
    if (authError || !authenticated.user) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const schema = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('evaluation'), evaluation_id: z.string().uuid() }),
      z.object({ kind: z.literal('synthese'), user_id: z.string().uuid(), exercice: z.number().int().min(1).max(32767) }),
    ]);
    const input = await req.json().catch(() => null);
    const parsed = schema.safeParse(input && typeof input === 'object' ? { ...input, kind: input.kind ?? 'evaluation' } : input);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides : identifiant UUID et exercice entier requis.' }),
        { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
    const body = parsed.data;
    const kind = body.kind;

    let bytes: Uint8Array;
    let filename: string;
    let archivePath: string | null = null;
    let evaluationId: string | null = null;
    let userId: string | null = null;
    let exercice: number | null = null;

    if (body.kind === 'evaluation') {
      if (!body.evaluation_id) throw new Error('evaluation_id manquant');
      evaluationId = body.evaluation_id;

      const { data, error } = await sb.rpc('get_evaluation_pdf_data', {
        _evaluation_id: body.evaluation_id,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Évaluation introuvable');

      const ev = data.evaluation ?? {};
      exercice = ev.exercice ?? null;
      archivePath = evaluationArchivePath(data);

      // Un document validé déjà archivé est resservi tel quel.
      if (archivePath) {
        const dl = await sb.storage.from('evaluations').download(archivePath);
        if (dl.data) {
          const buf = await decryptArchive(new Uint8Array(await dl.data.arrayBuffer()), archiveSecret, archivePath);
          await sb.rpc('log_evaluation_export', {
            _kind: 'evaluation', _evaluation_id: evaluationId,
            _exercice: exercice, _storage_path: archivePath, _file_size: buf.length,
          });
          return new Response(buf, {
            headers: {
              ...ch,
              'Content-Type': 'application/pdf',
              'Content-Disposition':
                `attachment; filename="evaluation-${String(ev.code_mission ?? ev.type).replace(/[^A-Za-z0-9_-]/g, '-')}.pdf"`,
              'Cache-Control': 'no-store',
            },
          });
        }
      }

      bytes = await buildEvaluation(data);
      const slug = String(ev.code_mission ?? ev.type ?? 'evaluation')
        .replace(/[^A-Za-z0-9_-]/g, '-');
      filename = `evaluation-${slug}.pdf`;

      if (archivePath) {
        const encrypted = await encryptArchive(bytes, archiveSecret, archivePath);
        const { error: uploadError } = await sb.storage.from('evaluations').upload(archivePath, encrypted, {
          contentType: 'application/octet-stream', upsert: false,
        });
        if (uploadError) {
          // A concurrent first export may already have created the immutable archive.
          const existing = await sb.storage.from('evaluations').download(archivePath);
          if (!existing.data) throw new Error('Archivage du PDF impossible');
          bytes = await decryptArchive(new Uint8Array(await existing.data.arrayBuffer()), archiveSecret, archivePath);
        }
      }
    } else if (body.kind === 'synthese') {
      userId = body.user_id ?? null;
      exercice = body.exercice ?? null;
      if (!userId || !exercice) throw new Error('user_id et exercice requis');

      const { data, error } = await sb.rpc('get_synthese_pdf_data', {
        _user_id: userId, _exercice: exercice,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Synthèse introuvable');

      bytes = await buildSynthese(data);
      filename = `synthese-evaluation-${exercice}.pdf`;
    } else {
      throw new Error(`Type de document inconnu : ${kind}`);
    }

    await sb.rpc('log_evaluation_export', {
      _kind: kind, _evaluation_id: evaluationId, _user_id: userId,
      _exercice: exercice, _storage_path: archivePath, _file_size: bytes.length,
    });

    return new Response(bytes, {
      headers: {
        ...ch,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inattendue';
    // Les messages des RPC sont en français et destinés à l'utilisateur.
    const refus = /Accès refusé|introuvable|requis|manquant/i.test(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: refus ? 403 : 500,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
