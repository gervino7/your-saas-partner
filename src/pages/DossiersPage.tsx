import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientDossiers } from '@/hooks/useObligations';
import { useAuthStore } from '@/stores/authStore';
import EmptyState from '@/components/common/EmptyState';
import { REGIMES } from '@/lib/obligations';

const santeConfig = {
  retard:    { label: 'Retard',     className: 'bg-destructive/10 text-destructive border-destructive/30' },
  vigilance: { label: 'Vigilance',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  ok:        { label: 'À jour',     className: 'bg-green-100 text-green-800 border-green-200' },
};

const DossiersPage = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;

  const { data = [], isLoading } = useClientDossiers();
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (mineOnly && profile?.full_name) {
      rows = rows.filter((r) => r.collaborateur_name === profile.full_name);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.client_name.toLowerCase().includes(q));
    }
    const order = { retard: 0, vigilance: 1, ok: 2 };
    rows.sort((a, b) => (order[a.sante] - order[b.sante]) || a.client_name.localeCompare(b.client_name));
    return rows;
  }, [data, search, mineOnly, profile?.full_name]);

  if (gradeLevel > 3) {
    return <EmptyState icon={Folder} title="Accès réservé aux responsables" description="Cette vue est réservée aux directeurs et chefs de mission." />;
  }

  const regimeLabel = (v: string | null) => REGIMES.find((r) => r.value === v)?.label ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Dossiers comptables</h1>
        <p className="text-muted-foreground text-sm">Vue portefeuille — santé et prochaines échéances par client.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un client…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Mon portefeuille</label>
              <Switch checked={mineOnly} onCheckedChange={setMineOnly} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Folder} title="Aucun dossier" description="Aucun client ne correspond." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Régime</TableHead>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead className="text-center">Obligations</TableHead>
                  <TableHead className="text-center">En retard</TableHead>
                  <TableHead className="text-center">À faire</TableHead>
                  <TableHead>Prochaine échéance</TableHead>
                  <TableHead>Santé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const s = santeConfig[r.sante];
                  return (
                    <TableRow key={r.client_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/clients/${r.client_id}?tab=fiscal`)}>
                      <TableCell className="font-medium">{r.client_name}</TableCell>
                      <TableCell className="text-sm">{regimeLabel(r.regime_fiscal)}</TableCell>
                      <TableCell className="text-sm">{r.collaborateur_name ?? '—'}</TableCell>
                      <TableCell className="text-center text-sm">{r.nb_obligations}</TableCell>
                      <TableCell className="text-center">
                        {r.nb_en_retard > 0
                          ? <Badge variant="destructive">{r.nb_en_retard}</Badge>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm">{r.nb_a_faire}</TableCell>
                      <TableCell className="text-sm">
                        {r.prochaine_echeance ? format(new Date(r.prochaine_echeance), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.className}>{s.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DossiersPage;
