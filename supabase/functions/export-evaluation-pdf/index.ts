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
// « evaluations » chiffrées sous org_id/exercice/, par audience, et
// resservies telles quelles aux appels suivants : le document de
// référence ne doit pas changer entre deux téléchargements.
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
const NAVY    = rgb(0.086, 0.318, 0.612);   // #16519C
const NAVY_L  = rgb(0.898, 0.925, 0.961);   // aplat clair
const COPPER  = rgb(0.902, 0.455, 0.200);   // #E67433
const INK     = rgb(0.106, 0.125, 0.153);
const INK_2   = rgb(0.278, 0.314, 0.361);
const MUTED   = rgb(0.502, 0.545, 0.596);
const RULE    = rgb(0.886, 0.906, 0.925);
const ZEBRA   = rgb(0.973, 0.980, 0.988);
const WHITE   = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const M = 46;
const W = A4[0] - M * 2;

// Helvetica est encodée en WinAnsi, qui couvre le français. Tout
// caractère hors jeu ferait échouer drawText : on les remplace.
function safe(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
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
const MODES: Record<string, string> = {
  simple: 'moyenne arithmétique', duree: 'pondérée par la durée',
  charge: 'pondérée par la charge réelle',
};

// ============================================================
// Moteur de mise en page
// ============================================================
class Layout {
  doc!: any; page!: any; y = 0;
  reg!: any; bold!: any;
  pageNo = 0; runTitle = ''; footer = '';

  async init(runTitle: string, footer: string) {
    this.doc = await PDFDocument.create();
    this.reg = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.runTitle = runTitle; this.footer = footer;
    this.newPage(true);
    return this;
  }

  newPage(first = false) {
    this.page = this.doc.addPage(A4);
    this.pageNo += 1;
    this.y = A4[1] - M;
    if (!first) {
      // Filet de rappel discret en tête des pages suivantes
      this.page.drawRectangle({ x: 0, y: A4[1] - 4, width: A4[0], height: 4, color: NAVY });
      this.page.drawText(safe(this.runTitle), {
        x: M, y: this.y - 10, size: 7.5, font: this.bold, color: MUTED,
      });
      this.y -= 30;
    }
  }

  need(h: number) { if (this.y - h < M + 30) this.newPage(); }
  gap(h = 10) { this.y -= h; }

  w(s: string, size: number, b = false) {
    return (b ? this.bold : this.reg).widthOfTextAtSize(safe(s), size);
  }

  txt(s: string, x: number, y: number, size = 9.5, b = false, color = INK) {
    this.page.drawText(safe(s), { x, y, size, font: b ? this.bold : this.reg, color });
  }

  txtR(s: string, xRight: number, y: number, size = 9.5, b = false, color = INK) {
    this.txt(s, xRight - this.w(s, size, b), y, size, b, color);
  }

  wrap(s: string, width: number, size = 9.5, b = false): string[] {
    const f = b ? this.bold : this.reg;
    const words = safe(s).split(/\s+/).filter(Boolean);
    const out: string[] = []; let cur = '';
    for (const word of words) {
      const t = cur ? `${cur} ${word}` : word;
      if (f.widthOfTextAtSize(t, size) > width && cur) { out.push(cur); cur = word; }
      else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }

  para(s: string, opts: { size?: number; x?: number; width?: number; color?: any; lead?: number } = {}) {
    const size = opts.size ?? 9.5;
    const x = opts.x ?? M;
    const width = opts.width ?? (M + W - x);
    const lead = opts.lead ?? size * 1.45;
    for (const line of this.wrap(s, width, size)) {
      this.need(lead);
      this.txt(line, x, this.y, size, false, opts.color ?? INK_2);
      this.y -= lead;
    }
  }

  // Titre de section : filet cuivre + libellé navy
  section(label: string) {
    this.need(30);
    this.gap(6);
    this.page.drawRectangle({ x: M, y: this.y - 3, width: 22, height: 2.2, color: COPPER });
    this.txt(label.toUpperCase(), M + 30, this.y - 6.5, 8.5, true, NAVY);
    this.y -= 18;
  }

  rule(y = this.y, color = RULE, th = 0.6) {
    this.page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: th, color });
  }

  // Barre de progression horizontale
  bar(x: number, y: number, width: number, pct: number, color = NAVY, h = 4) {
    this.page.drawRectangle({ x, y, width, height: h, color: RULE });
    const fill = Math.max(0, Math.min(1, pct)) * width;
    if (fill > 0) this.page.drawRectangle({ x, y, width: fill, height: h, color });
  }

  finish() {
    const total = this.doc.getPageCount();
    this.doc.getPages().forEach((p: any, i: number) => {
      const left = safe(this.footer);
      const right = safe(`${i + 1} / ${total}`);
      p.drawLine({ start: { x: M, y: 34 }, end: { x: M + W, y: 34 }, thickness: 0.5, color: RULE });
      p.drawText(left, { x: M, y: 23, size: 7, font: this.reg, color: MUTED });
      p.drawText(right, {
        x: M + W - this.reg.widthOfTextAtSize(right, 7), y: 23,
        size: 7, font: this.reg, color: MUTED,
      });
    });
    return this.doc.save();
  }
}

// ── Bandeau d'en-tête de première page ──
function headerBand(L: Layout, org: string, docType: string, right1: string, right2: string) {
  const h = 44;
  const top = A4[1];
  L.page.drawRectangle({ x: 0, y: top - h, width: A4[0], height: h, color: NAVY });
  L.page.drawRectangle({ x: 0, y: top - h, width: A4[0], height: 2, color: COPPER });

  L.txt(org.toUpperCase(), M, top - 21, 11.5, true, WHITE);
  L.txt(docType, M + L.w(org.toUpperCase(), 11.5, true) + 14, top - 21, 9, false, rgb(0.74, 0.82, 0.93));

  L.txtR(right1, M + W, top - 17, 7.5, true, rgb(0.78, 0.85, 0.94));
  L.txtR(right2, M + W, top - 29, 7, false, rgb(0.66, 0.76, 0.89));

  L.y = top - h - 22;
}

// ── Bloc d'identification, en carte claire ──
function identity(L: Layout, rows: [string, string][]) {
  const cols = 4;
  const colW = W / cols;
  // Une valeur longue (nom de mission, intitulé) tient sur deux lignes
  // plutôt que d'être tronquée.
  const wrapped = rows.map(([k, v]) => [k, L.wrap(v || '—', colW - 20, 9).slice(0, 2)] as [string, string[]]);
  const rowsCount = Math.ceil(rows.length / cols);
  const rowH: number[] = [];
  for (let r = 0; r < rowsCount; r++) {
    const slice = wrapped.slice(r * cols, r * cols + cols);
    rowH.push(Math.max(...slice.map(([, l]) => l.length)) === 2 ? 40 : 30);
  }
  const h = rowH.reduce((a, b) => a + b, 0) + 12;
  L.need(h + 10);
  L.page.drawRectangle({
    x: M, y: L.y - h + 4, width: W, height: h,
    color: rgb(0.980, 0.984, 0.990), borderColor: RULE, borderWidth: 0.6,
  });
  wrapped.forEach(([k, vLines], i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = M + 14 + c * colW;
    const yy = L.y - 10 - rowH.slice(0, r).reduce((a, b) => a + b, 0);
    L.txt(k.toUpperCase(), x, yy, 6.5, true, MUTED);
    vLines.forEach((ln, k2) => L.txt(ln, x, yy - 12 - k2 * 11, 9, false, INK));
  });
  L.y -= h + 10;
}

// ── Score, échelle à cinq niveaux, appréciation ──
function scoreHero(L: Layout, score: number | null, appreciation: string, scale: any[]) {
  const h = 86;
  L.need(h + 12);
  const top = L.y;
  L.page.drawRectangle({
    x: M, y: top - h, width: W, height: h,
    color: NAVY_L, borderColor: rgb(0.80, 0.86, 0.93), borderWidth: 0.8,
  });

  L.txt('SCORE PONDÉRÉ', M + 20, top - 20, 6.5, true, NAVY);
  const s = score === null ? '—' : num(score);
  L.txt(s, M + 20, top - 48, 25, true, NAVY);
  L.txt('/ 100', M + 22 + L.w(s, 25, true), top - 48, 10, false, MUTED);

  L.txtR('APPRÉCIATION', M + W - 20, top - 20, 6.5, true, NAVY);
  const lines = L.wrap(appreciation || '—', 200, 11, true);
  lines.slice(0, 2).forEach((ln, i) =>
    L.txtR(ln, M + W - 20, top - 40 - i * 14, 11, true, COPPER));

  // Échelle : cinq segments, le segment atteint en navy, un repère sur la position
  const bx = M + 20, bw = W - 40, by = top - h + 22, bh = 7;
  const seg = scale.length ? scale : [];
  if (seg.length) {
    const minAll = Number(seg[0].min ?? 0);
    const maxAll = Number(seg[seg.length - 1].max ?? 100);
    const span = Math.max(1, maxAll - minAll);
    seg.forEach((s2: any, i: number) => {
      const a = (Number(s2.min) - minAll) / span, b = (Number(s2.max) - minAll) / span;
      const x = bx + a * bw, wgt = Math.max(1, (b - a) * bw - 1.5);
      const reached = score !== null && Number(score) >= Number(s2.min);
      L.page.drawRectangle({
        x, y: by, width: wgt, height: bh,
        color: reached ? NAVY : rgb(0.84, 0.88, 0.93),
      });
      L.txt(String(i + 1), x + wgt / 2 - 1.6, by - 9, 6, false, MUTED);
    });
    if (score !== null) {
      const px = bx + ((Number(score) - minAll) / span) * bw;
      L.page.drawRectangle({ x: px - 1, y: by - 3.5, width: 2, height: bh + 7, color: COPPER });
    }
  }
  L.y = top - h - 16;
}

// ── Une catégorie de la grille ──
function categoryBlock(L: Layout, c: any, idx: number) {
  const weight = Number(c.ponderation) * 100;
  const note = c.note === null || c.note === undefined ? null : Number(c.note);
  const contrib = note === null ? 0 : (note / 5) * weight;

  // L'en-tête de catégorie ne doit jamais rester seul en bas de page :
  // on réserve aussi la première ligne de sous-critère.
  // Un libellé long passe sur deux lignes : le tronquer vaudrait moins
  // que d'agrandir le bandeau, et rapprocher la pondération du texte
  // serrerait la lecture.
  // 200 pt : tous les libellés tiennent sur une ligne sauf le plus long,
  // tout en laissant respirer la colonne de pondération.
  const labelMax = 200;
  const labelLines = L.wrap(c.libelle, labelMax, 9.5, true).slice(0, 2);
  const bandH = labelLines.length > 1 ? 38 : 27;

  L.need(bandH + 26);
  const top = L.y;
  L.page.drawRectangle({ x: M, y: top + 4 - bandH, width: W, height: bandH, color: rgb(0.945, 0.957, 0.969) });

  L.txt(c.code, M + 12, top - 11, 10, true, NAVY);
  labelLines.forEach((ln, i) => L.txt(ln, M + 28, top - 11 - i * 11, 9.5, true, INK));

  L.txtR(`${num(weight, weight % 1 === 0 ? 0 : 1)} %`, M + W - 215, top - 11, 8.5, true, MUTED);
  L.txtR(note === null ? '—' : num(note, 1), M + W - 150, top - 11, 9.5, true, INK);
  // Score de la catégorie, exprimé en pourcentage : note ÷ 5
  L.txtR(note === null ? '—' : `${num(note / 5 * 100, 0)} %`, M + W - 78, top - 11, 9.5, true, INK);
  L.txtR(num(contrib), M + W - 10, top - 11, 9.5, true, NAVY);

  L.y = top - bandH - 11;

  const subs: any[] = c.sous_criteres ?? [];
  subs.forEach((s, i) => {
    const lines = L.wrap(s.libelle, labelMax, 8.5);
    const rowH = lines.length * 10.5 + 3;
    L.need(rowH + 4);
    if (i % 2 === 1) {
      L.page.drawRectangle({ x: M, y: L.y - rowH + 11, width: W, height: rowH, color: ZEBRA });
    }
    lines.forEach((ln, k) => {
      L.txt(ln, M + 28, L.y - k * 10.5, 8.5, false, INK_2);
    });
    // Les notes des sous-critères partagent l'alignement de la colonne Note.
    const v = s.note;
    if (v !== null && v !== undefined) {
      L.txtR(num(v, 0), M + W - 150, L.y, 8.5, true, NAVY);
    } else {
      L.txtR('—', M + W - 150, L.y, 8.5, false, MUTED);
    }
    L.y -= rowH;
    if (s.commentaire) {
      L.para(s.commentaire, { size: 7.8, x: M + 36, width: labelMax - 8, color: MUTED, lead: 10 });
      L.gap(2);
    }
  });
  L.gap(3);
}

// ── Bloc de citation : commentaire d'une partie ──
function quote(L: Layout, who: string, text: string, accent = NAVY) {
  const lines = L.wrap(text, W - 40, 9);
  const h = lines.length * 13 + 30;
  L.need(h + 6);
  const top = L.y;
  L.page.drawRectangle({
    x: M, y: top - h + 10, width: W, height: h,
    color: rgb(0.984, 0.988, 0.992), borderColor: RULE, borderWidth: 0.5,
  });
  L.txt(who.toUpperCase(), M + 16, top - 6, 6.5, true, MUTED);
  lines.forEach((ln, i) => L.txt(ln, M + 16, top - 22 - i * 13, 9, false, INK));
  L.y = top - h;
}

// ── Historique des échanges ──
function timeline(L: Layout, items: any[]) {
  items.forEach((x, i) => {
    L.need(20);
    const y = L.y;
    // Puce et filet vertical
    L.page.drawCircle({ x: M + 4, y: y + 3, size: 2.6, color: i === items.length - 1 ? COPPER : NAVY });
    L.txt(dateFR(x.date), M + 16, y, 8, false, MUTED);
    L.txt(ACTIONS[x.action] ?? x.action, M + 68, y, 8.5, true, INK);
    L.txtR(safe(x.auteur ?? ''), M + W - 58, y, 8, false, MUTED);
    if (x.score_apres !== null && x.score_apres !== undefined) {
      L.txtR(num(x.score_apres), M + W, y, 8.5, true, NAVY);
    }
    L.y -= 15;
    if (x.commentaire) {
      L.para(x.commentaire, { size: 7.8, x: M + 68, width: W - 130, color: MUTED, lead: 10 });
      L.gap(3);
    }
  });
}

// ── Bloc de signatures ──
function signatures(L: Layout, pairs: [string, string][]) {
  L.need(58);
  L.gap(10);
  // Sur une page largement vide, les signatures descendent au pied du
  // document : une pièce que deux personnes paraphent se signe en bas,
  // pas au milieu d'une page blanche.
  if (L.y - 62 > M + 150) L.y = M + 130;
  const top = L.y;
  const colW = W / pairs.length;
  pairs.forEach(([role, nom], i) => {
    const x = M + i * colW;
    L.txt(role.toUpperCase(), x, top, 6.5, true, MUTED);
    L.txt(nom ?? '', x, top - 13, 9.5, true, INK);
    L.page.drawLine({
      start: { x, y: top - 42 }, end: { x: x + colW - 34, y: top - 42 },
      thickness: 0.6, color: RULE,
    });
    L.txt('Date et signature', x, top - 52, 6.5, false, MUTED);
  });
  L.y = top - 62;
}

// ============================================================
// PDF d'une évaluation
// ============================================================
async function buildEvaluation(d: any): Promise<Uint8Array> {
  const ev = d.evaluation ?? {};
  const org = d.organisation?.nom ?? 'Cabinet';
  const typeLabel = TYPES[ev.type] ?? 'Évaluation';
  const who = d.collaborateur?.nom ?? '';

  const L = await new Layout().init(
    `${typeLabel} — ${who}`,
    `${org} · ${typeLabel} · ${who}`,
  );

  headerBand(L, org, typeLabel,
    `RÉF. ${String(ev.id ?? '').slice(0, 8).toUpperCase()}`,
    `Éditée le ${dateFR(new Date().toISOString())}`);

  // Un brouillon imprimé doit se signaler comme tel, avant tout le reste.
  if (ev.statut === 'brouillon') {
    L.need(26);
    L.page.drawRectangle({
      x: M, y: L.y - 16, width: W, height: 24,
      color: rgb(0.996, 0.953, 0.914), borderColor: COPPER, borderWidth: 0.7,
    });
    L.txt('DOCUMENT PROVISOIRE', M + 14, L.y - 3, 8, true, COPPER);
    L.txt('Évaluation non transmise au collaborateur.', M + 136, L.y - 3, 8, false, INK_2);
    L.y -= 32;
  }

  identity(L, [
    ['Collaborateur', d.collaborateur?.nom],
    ['Grade', d.collaborateur?.grade],
    ['Échelon', ev.echelon],
    ['Évaluateur', d.evaluateur?.nom],
    ['Grade évaluateur', d.evaluateur?.grade],
    ['Practice', PRACTICES[ev.practice] ?? ev.practice],
    ...(ev.type === 'mission'
      ? ([['Mission', `${ev.code_mission ?? ''} ${ev.mission ?? ''}`.trim()],
          ['Client', ev.client]] as [string, string][])
      : ([['Exercice', ev.exercice ? String(ev.exercice) : '']] as [string, string][])),
    ['Période', ev.periode_debut ? `${dateFR(ev.periode_debut)} au ${dateFR(ev.periode_fin)}` : ''],
    ['Statut', STATUTS[ev.statut] ?? ev.statut],
  ]);

  scoreHero(L, ev.score === null || ev.score === undefined ? null : Number(ev.score),
            ev.appreciation ?? '', d.echelle ?? []);

  // Rappel de la règle de calcul, une fois, en petit
  L.txt('Note = moyenne des sous-critères · Score catégorie = note ÷ 5 · Contribution = score catégorie × pondération × 100.',
        M, L.y, 7.5, false, MUTED);
  L.y -= 18;

  // ── La grille ──
  L.section('Grille d’évaluation');

  // En-têtes de colonnes de la grille
  L.need(16);
  L.txt('CRITÈRES', M + 12, L.y, 6.5, true, MUTED);
  L.txtR('PONDÉRATION', M + W - 215, L.y, 6.5, true, MUTED);
  L.txtR('NOTE (1-5)', M + W - 150, L.y, 6.5, true, MUTED);
  L.txtR('SCORE CATÉGORIE', M + W - 78, L.y, 6.5, true, MUTED);
  L.txtR('CONTRIBUTION', M + W - 10, L.y, 6.5, true, MUTED);
  L.y -= 6;
  L.rule(L.y); L.y -= 10;

  const cats: any[] = d.categories ?? [];
  cats.forEach((c, i) => categoryBlock(L, c, i));

  // Total de la grille
  L.need(26);
  L.rule(L.y + 8, NAVY, 0.8);
  const totalW = cats.reduce((a, c) => a + Number(c.ponderation) * 100, 0);
  L.txt('ÉVALUATION GLOBALE PONDÉRÉE', M + 12, L.y - 6, 8.5, true, NAVY);
  L.txtR(`${num(totalW, 0)} %`, M + W - 215, L.y - 6, 8.5, true, MUTED);
  L.txtR(num(ev.score), M + W - 10, L.y - 6, 10, true, NAVY);
  L.y -= 26;

  // ── Commentaires ──
  if (ev.commentaire_evaluateur) {
    L.section('Axes de développement');
    quote(L, `${d.evaluateur?.nom ?? 'Évaluateur'} — évaluateur`, ev.commentaire_evaluateur, NAVY);
  }

  if (ev.observations_collaborateur) {
    L.section('Observations du collaborateur');
    quote(L, `${who} — collaborateur`, ev.observations_collaborateur,
          ev.objection ? COPPER : NAVY);
    if (ev.objection) {
      L.gap(6);
      L.txt('Le collaborateur a émis une objection sur sa notation.', M, L.y, 8.5, true, COPPER);
      L.y -= 14;
    }
  }

  if (ev.desaccord) {
    L.section('Désaccord signalé');
    quote(L, 'Motif invoqué', ev.motif_desaccord ?? 'Motif non précisé.', COPPER);
    L.gap(8);
    L.para('Conformément à la procédure, le désaccord est consigné et transmis à la direction. '
         + 'L’évaluateur demeure seul responsable de la validation.',
      { size: 8, color: MUTED });
  }

  // ── Avis consultatifs (§5.5), absents de l'exemplaire du collaborateur ──
  const avis: any[] = d.avis_consultatifs ?? [];
  if (avis.length) {
    L.section('Avis consultatifs (§5.5)');
    L.para('Avis recueillis à titre consultatif. Ils n’entrent pas dans le calcul du score '
         + 'et ne sont pas communiqués au collaborateur.', { size: 8, color: MUTED });
    L.gap(8);
    for (const a of avis) {
      L.need(30);
      L.txt(`${a.contributeur}${a.grade ? ` (${a.grade})` : ''}`, M, L.y, 9, true, INK);
      L.txtR(`${a.appreciation ?? '—'} / 5`, M + W, L.y, 9, true, NAVY);
      L.y -= 13;
      if (a.points_forts) L.para(`Points forts : ${a.points_forts}`, { size: 8, x: M + 12, color: MUTED, lead: 10 });
      if (a.axes_progres) L.para(`Axes de progrès : ${a.axes_progres}`, { size: 8, x: M + 12, color: MUTED, lead: 10 });
      L.gap(6);
    }
  }

  // ── Historique ──
  const ech: any[] = d.echanges ?? [];
  if (ech.length) {
    L.section('Historique des échanges');
    timeline(L, ech);
  }

  // ── Validation et signatures ──
  // Réservées ensemble : une page de signatures orpheline n'a pas de sens
  // sur une pièce que deux personnes doivent parapher.
  const signe = ev.statut === 'validee' || ev.statut === 'cloturee';
  L.need(30 + 94 + (signe ? 70 : 0));
  L.section('Validation');
  identity(L, [
    ['Transmise le', dateFR(ev.envoyee_le)],
    ['Observée le', dateFR(ev.observee_le)],
    ['Validée le', dateFR(ev.validee_le)],
    ['Validée par', ev.validee_par],
    ['Échanges', ev.nb_echanges != null ? `${ev.nb_echanges} / 2` : ''],
    ['Accusé de lecture', dateFR(ev.accuse_lecture_le)],
  ]);

  if (ev.statut === 'validee' || ev.statut === 'cloturee') {
    signatures(L, [
      ['Le collaborateur', d.collaborateur?.nom ?? ''],
      ['L’évaluateur', d.evaluateur?.nom ?? ''],
    ]);
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
  const ex = String(s.exercice ?? '');
  const who = s.collaborateur ?? '';

  const L = await new Layout().init(
    `Synthèse d’évaluation — ${who}`,
    `${org} · Grille d’évaluation globale · exercice ${ex}`,
  );

  headerBand(L, org, `Grille d’évaluation globale — exercice ${ex}`,
    'DIRECTION DES RESSOURCES HUMAINES',
    `Éditée le ${dateFR(new Date().toISOString())}`);

  identity(L, [
    ['Collaborateur', who],
    ['Grade', s.grade],
    ['Échelon', s.echelon],
    ['Practice de rattachement', PRACTICES[s.practice] ?? s.practice],
    ['Exercice', ex],
    ['Missions évaluées', String(s.nb_missions ?? 0)],
  ]);

  // ── Les trois scores ──
  const pm = Number(s.ponderation?.missions ?? 0) * 100;
  const pa = Number(s.ponderation?.annuelle ?? 0) * 100;
  const hh = 78;
  L.need(hh + 12);
  const top = L.y;
  L.page.drawRectangle({
    x: M, y: top - hh, width: W, height: hh,
    color: NAVY_L, borderColor: rgb(0.80, 0.86, 0.93), borderWidth: 0.8,
  });
  const third = W / 3;
  const cells: [string, string, boolean][] = [
    [`MISSIONS (${num(pm, 0)} %)`, num(s.score_missions), false],
    [`ANNUELLE (${num(pa, 0)} %)`, num(s.score_annuelle), false],
    ['SCORE GLOBAL', num(s.score_global), true],
  ];
  cells.forEach(([label, val, strong], i) => {
    const x = M + i * third + 18;
    if (strong) L.page.drawRectangle({ x: M + 2 * third, y: top - hh, width: third, height: hh, color: rgb(0.855, 0.898, 0.953) });
    L.txt(label, x, top - 20, 6.5, true, NAVY);
    L.txt(val, x, top - 50, strong ? 22 : 17, true, strong ? NAVY : INK);
    if (i > 0) L.page.drawLine({
      start: { x: M + i * third, y: top - hh + 10 }, end: { x: M + i * third, y: top - 10 },
      thickness: 0.5, color: rgb(0.80, 0.86, 0.93),
    });
  });
  L.wrap(s.appreciation_label ?? '—', third - 36, 9.5, true).slice(0, 2)
   .forEach((ln, i) => L.txt(ln, M + 2 * third + 18, top - 60 - i * 12, 9.5, true, COPPER));
  L.y = top - hh - 16;

  if (s.provisoire) {
    const msg = s.annuelle_disponible === false
      ? 'Synthèse provisoire : l’évaluation annuelle de l’exercice n’est pas encore validée. '
        + 'Le score affiché est l’agrégat des missions, et la conséquence RH n’est pas établie.'
      : 'Synthèse provisoire : aucune évaluation de mission validée sur l’exercice.';
    const lines = L.wrap(msg, W - 44, 8.5);
    const bh = lines.length * 12 + 18;
    L.need(bh + 8);
    L.page.drawRectangle({
      x: M, y: L.y - bh + 10, width: W, height: bh,
      color: rgb(0.996, 0.953, 0.914), borderColor: COPPER, borderWidth: 0.7,
    });
    lines.forEach((ln, i) => L.txt(ln, M + 20, L.y - 4 - i * 12, 8.5, false, COPPER));
    L.y -= bh + 8;
  } else if (s.consequence_rh) {
    L.section('Conséquence RH usuelle');
    quote(L, 'Manuel §11', s.consequence_rh, NAVY);
  }

  // ── Missions de l'exercice ──
  const agg = s.agregat_missions ?? {};
  L.section('Évaluations de mission de l’exercice');
  L.para(`${agg.nb_missions ?? 0} mission(s) significative(s), évaluée(s) par `
       + `${agg.nb_evaluateurs ?? 0} chef(s) de mission. Agrégation : ${MODES[agg.mode] ?? agg.mode}.`,
    { size: 8.5, color: MUTED });

  if (agg.dispersion_forte) {
    L.gap(4);
    const msg = `Les notes attribuées s’échelonnent de ${num(agg.score_min)} à ${num(agg.score_max)}, `
      + `soit une étendue de ${num(agg.etendue)} points. La moyenne ne rend pas compte de cet écart `
      + `entre évaluateurs.`;
    const lines = L.wrap(msg, W - 44, 8.5);
    const bh = lines.length * 12 + 16;
    L.need(bh + 6);
    L.page.drawRectangle({
      x: M, y: L.y - bh + 10, width: W, height: bh,
      color: rgb(0.996, 0.953, 0.914), borderColor: COPPER, borderWidth: 0.7,
    });
    lines.forEach((ln, i) => L.txt(ln, M + 20, L.y - 4 - i * 12, 8.5, false, COPPER));
    L.y -= bh + 8;
  }
  L.gap(4);

  const miss: any[] = s.missions ?? [];
  if (miss.length) {
    const cx = [M, M + 62, M + 212, M + 322, M + 408, M + W];
    L.need(20);
    L.page.drawRectangle({ x: M, y: L.y - 5, width: W, height: 16, color: rgb(0.945, 0.957, 0.969) });
    ['CODE', 'MISSION', 'ÉVALUATEUR', 'PRACTICE', 'FIN', 'SCORE'].forEach((t, i) => {
      if (i >= 4) L.txtR(t, (i === 4 ? cx[5] - 58 : cx[5] - 6), L.y, 6.5, true, MUTED);
      else L.txt(t, cx[i] + 6, L.y, 6.5, true, MUTED);
    });
    L.y -= 20;
    miss.forEach((m, i) => {
      const nm = L.wrap(m.mission_name ?? '', 160, 8);
      const rowH = Math.max(nm.length * 10, 11) + 5;
      L.need(rowH + 4);
      if (i % 2 === 1) L.page.drawRectangle({ x: M, y: L.y - rowH + 10, width: W, height: rowH, color: ZEBRA });
      const off = m.significative === false;
      const col = off ? MUTED : INK_2;
      L.txt(m.mission_code ?? '—', cx[0] + 6, L.y, 8, false, col);
      nm.forEach((ln, k) => L.txt(ln, cx[1] + 6, L.y - k * 10, 8, false, col));
      L.txt(m.evaluateur ?? '', cx[2] + 6, L.y, 8, false, col);
      L.txt((PRACTICES[m.practice] ?? m.practice ?? '').slice(0, 14), cx[3] + 6, L.y, 8, false, col);
      L.txtR(dateFR(m.periode_fin), cx[5] - 58, L.y, 8, false, col);
      L.txtR(num(m.score), cx[5] - 6, L.y, 8.5, true, off ? MUTED : NAVY);
      if (off) L.txtR('écartée', cx[5] - 58, L.y - 10, 6.5, false, MUTED);
      L.y -= rowH;
    });
    L.gap(8);
  }

  // ── Détail par évaluateur, avec barres ──
  const parEv: any[] = agg.par_evaluateur ?? [];
  if (parEv.length > 1) {
    L.section('Détail par évaluateur');
    const maxS = Math.max(...parEv.map((e) => Number(e.score_moyen) || 0), 1);
    parEv.forEach((e) => {
      L.need(18);
      L.txt(`${e.evaluateur}${e.grade ? ` (${e.grade})` : ''}`, M, L.y, 8.5, false, INK);
      L.txt(`${e.nb_missions} mission(s)`, M + 180, L.y, 8, false, MUTED);
      L.bar(M + 250, L.y + 1, W - 300, Number(e.score_moyen) / 100, NAVY, 5);
      L.txtR(num(e.score_moyen), M + W, L.y, 8.5, true, NAVY);
      L.y -= 16;
    });
    L.gap(4);
  }

  // ── Évaluation annuelle ──
  if (s.annuelle) {
    L.section('Évaluation annuelle');
    identity(L, [
      ['Évaluateur', s.annuelle.evaluateur],
      ['Validée le', dateFR(s.annuelle.validated_at)],
      ['Score', `${num(s.annuelle.score)} / 100`],
      ['Appréciation', s.annuelle.appreciation],
    ]);
  }

  // ── Objectifs ──
  const objs: any[] = s.objectifs ?? [];
  if (objs.length) {
    L.section('Objectifs de l’exercice');
    if (s.objectifs_taux_moyen !== null && s.objectifs_taux_moyen !== undefined) {
      L.para(`Taux moyen de réalisation : ${num(s.objectifs_taux_moyen, 1)} % `
           + `(${s.objectifs_notes} objectif(s) noté(s) sur ${s.objectifs_total}). `
           + `Les objectifs n’entrent pas dans le calcul pondéré.`,
        { size: 8, color: MUTED });
      L.gap(6);
    }
    objs.forEach((o) => {
      L.need(26);
      L.txt(o.title, M, L.y, 9, true, INK);
      const r = o.achievement_rate;
      L.txtR(r !== null && r !== undefined ? `${r} %` : 'non noté', M + W, L.y, 8.5, true,
             r !== null && r !== undefined ? NAVY : MUTED);
      L.y -= 11;
      if (o.deadline) { L.txt(`Échéance : ${dateFR(o.deadline)}`, M, L.y, 7.5, false, MUTED); L.y -= 10; }
      if (o.achievement_comment) L.para(o.achievement_comment, { size: 7.8, color: MUTED, lead: 10 });
      L.gap(6);
    });
  }

  // ── Trajectoire ──
  const cycles: any[] = h.cycles ?? [];
  if (cycles.length) {
    L.section('Trajectoire sur les derniers cycles (§11.1)');
    cycles.forEach((c) => {
      L.need(18);
      L.txt(String(c.exercice), M, L.y, 8.5, true, INK);
      L.txt(c.appreciation_label ?? '', M + 54, L.y, 8, false, MUTED);
      L.bar(M + 250, L.y + 1, W - 300, Number(c.score_global) / 100, NAVY, 5);
      L.txtR(num(c.score_global), M + W, L.y, 9, true, NAVY);
      L.y -= 16;
    });
    L.gap(4);
    const TEND: Record<string, string> = {
      progression: 'En progression', stable: 'Stable', recul: 'En recul',
    };
    if (h.tendance) {
      L.para(`${TEND[h.tendance] ?? h.tendance} (${Number(h.variation) > 0 ? '+' : ''}${num(h.variation)} points). `
           + `Moyenne sur ${h.cycles_disponibles} cycle(s) : ${num(h.score_moyen)}.`,
        { size: 8.5, color: INK_2 });
    }
    if (!h.eligible_decision) {
      L.gap(2);
      L.para('Un seul cycle disponible. Le manuel §11.1 observe le score sur deux à trois cycles '
           + 'avant une décision d’avancement.', { size: 8, color: COPPER });
    }
  }

  L.gap(10);
  L.need(26);
  L.rule(L.y + 6);
  L.gap(4);
  L.para(`Document établi à partir des données validées dans Mission-DGC. `
       + `Édité par ${d.lecteur ?? ''} le ${dateFR(new Date().toISOString())}.`,
    { size: 7.5, color: MUTED });

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
      evaluationId = body.evaluation_id;

      const { data, error } = await sb.rpc('get_evaluation_pdf_data', {
        _evaluation_id: body.evaluation_id,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Évaluation introuvable');

      const ev = data.evaluation ?? {};
      exercice = ev.exercice ?? null;
      // Le chemin dérive de l'organisation et du rôle du lecteur
      // renvoyés par la base, jamais d'une valeur fournie par l'appelant.
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
          return new Response(new Uint8Array(buf).buffer, {
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
      userId = body.user_id;
      exercice = body.exercice;

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

    return new Response(new Uint8Array(bytes).buffer, {
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
