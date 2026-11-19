import { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  ETAT_LABELS, EtatAction, LigneDisponibilite, formatHeures, useDisponibilite, useOccupationDuJour,
} from '@/hooks/useTimesheetDetails';

type Periode = 'semaine' | 'suivante' | 'mois' | 'libre';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function bornes(p: Periode): [string, string] {
  const lundi = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (p === 'suivante') { const l = addWeeks(lundi, 1); return [iso(l), iso(addDays(l, 4))]; }
  if (p === 'mois') return [iso(startOfMonth(new Date())), iso(endOfMonth(new Date()))];
  return [iso(lundi), iso(addDays(lundi, 4))];
}

function Occupation({ l }: { l: LigneDisponibilite }) {
  const t = l.taux_occupation;
  const surcharge = t != null && t > 100;
  return (
    <div className="min-w-[160px] space-y-1">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full', surcharge ? 'bg-destructive' : 'bg-primary')} style={{ width: `${Math.min(t ?? 0, 100)}%` }} />
      </div>
      <div className={cn('text-xs tabular-nums', surcharge ? 'text-destructive font-medium' : 'text-muted-foreground')}>
        {t == null ? 'Aucun jour ouvrable' : `${Number(t).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`}
        {surcharge && ' - surchargé'}
      </div>
    </div>
  );
}

function Lignes({ lignes, onOpen }: { lignes: LigneDisponibilite[]; onOpen: (l: LigneDisponibilite) => void }) {
  if (lignes.length === 0) return <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun collaborateur</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collaborateur</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Missions</TableHead>
            <TableHead>Occupation</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.collaborateur_id} className="h-11 cursor-pointer" onClick={() => onOpen(l)}>
              <TableCell className="font-medium">{l.collaborateur}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{l.grade}</Badge></TableCell>
              <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{l.missions || '-'}</TableCell>
              <TableCell><Occupation l={l} /></TableCell>
              <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                {formatHeures(Number(l.heures_disponibles))} libres sur {formatHeures(Number(l.capacite_heures))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailJour({ ligne, debut, fin, onClose }: { ligne: LigneDisponibilite | null; debut: string; fin: string; onClose: () => void }) {
  const [jour, setJour] = useState(debut);
  const { data = [], isLoading } = useOccupationDuJour(ligne?.collaborateur_id ?? null, jour);
  return (
    <Dialog open={!!ligne} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Détail d'une journée - {ligne?.collaborateur}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Jour</label>
          <Input type="date" className="w-44" value={jour} min={debut} max={fin} onChange={(e) => setJour(e.target.value)} />
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tâche</TableHead><TableHead>Mission</TableHead>
                <TableHead className="text-right">Heures</TableHead><TableHead>Action</TableHead>
                <TableHead className="text-right">Quantité</TableHead><TableHead>État</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">Aucun temps déclaré ce jour</TableCell></TableRow>
              )}
              {data.map((r, i) => (
                <TableRow key={i} className="h-11">
                  <TableCell>{r.tache || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{r.mission || '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.heures != null ? formatHeures(Number(r.heures)) : '-'}</TableCell>
                  <TableCell>{r.action || '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantite || '-'}</TableCell>
                  <TableCell>{r.etat ? (ETAT_LABELS[r.etat as EtatAction] ?? r.etat) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AvailabilityView() {
  const [periode, setPeriode] = useState<Periode>('semaine');
  const [libre, setLibre] = useState(() => bornes('semaine'));
  const [debut, fin] = periode === 'libre' ? libre : bornes(periode);
  const { data = [], isLoading, error } = useDisponibilite(debut, fin);
  const [ouvert, setOuvert] = useState<LigneDisponibilite | null>(null);

  const libres = useMemo(() => data.filter((l) => !l.staffe), [data]);
  const staffes = useMemo(
    () => data.filter((l) => l.staffe).sort((a, b) => Number(b.heures_disponibles) - Number(a.heures_disponibles)),
    [data],
  );
  const choix: [Periode, string][] = [['semaine', 'Cette semaine'], ['suivante', 'Semaine prochaine'], ['mois', 'Ce mois'], ['libre', 'Dates libres']];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {choix.map(([k, label]) => (
          <Button key={k} size="sm" variant={periode === k ? 'default' : 'outline'} onClick={() => setPeriode(k)}>{label}</Button>
        ))}
        {periode === 'libre' && (
          <div className="flex items-center gap-2">
            <Input type="date" className="w-40" value={libre[0]} onChange={(e) => setLibre([e.target.value, libre[1]])} />
            <span className="text-sm text-muted-foreground">au</span>
            <Input type="date" className="w-40" value={libre[1]} onChange={(e) => setLibre([libre[0], e.target.value])} />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <Card className="border-border/30">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Staffé sur aucune mission</CardTitle>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="tabular-nums font-medium">{libres.length}</span> collaborateur{libres.length > 1 ? 's' : ''} sans mission sur la période
          </div>
        </CardHeader>
        <CardContent className="p-0">{isLoading ? <p className="p-4 text-sm text-muted-foreground">Chargement</p> : <Lignes lignes={libres} onOpen={setOuvert} />}</CardContent>
      </Card>

      <Card className="border-border/30">
        <CardHeader><CardTitle className="text-base">Staffé, avec du temps disponible</CardTitle></CardHeader>
        <CardContent className="p-0">{isLoading ? <p className="p-4 text-sm text-muted-foreground">Chargement</p> : <Lignes lignes={staffes} onOpen={setOuvert} />}</CardContent>
      </Card>

      <DetailJour key={ouvert?.collaborateur_id ?? 'x'} ligne={ouvert} debut={debut} fin={fin} onClose={() => setOuvert(null)} />
    </div>
  );
}
