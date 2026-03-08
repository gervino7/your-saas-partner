import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientMissions } from '@/hooks/useCRM';
import { useMissions } from '@/hooks/useMissions';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<string, string> = { draft: 'Brouillon', planning: 'Planification', active: 'Active', paused: 'En pause', completed: 'Terminée', archived: 'Archivée' };
const statusColors: Record<string, string> = { draft: 'secondary', planning: 'outline', active: 'default', completed: 'default', paused: 'secondary', archived: 'secondary' };

export default function ClientMissionsTab({ clientId }: { clientId: string }) {
  const { data: missions, isLoading } = useClientMissions(clientId);
  const { data: allMissions } = useMissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [linking, setLinking] = useState(false);

  // Missions without a client (available to link)
  const unlinkedMissions = (allMissions ?? []).filter((m: any) => !m.client_id);

  const handleLink = async () => {
    if (!selectedMissionId) return;
    setLinking(true);
    const { error } = await supabase.from('missions').update({ client_id: clientId }).eq('id', selectedMissionId);
    setLinking(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mission associée au client');
    setLinkOpen(false);
    setSelectedMissionId('');
    qc.invalidateQueries({ queryKey: ['client-missions', clientId] });
    qc.invalidateQueries({ queryKey: ['missions'] });
  };

  const handleUnlink = async (missionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('missions').update({ client_id: null }).eq('id', missionId);
    if (error) { toast.error(error.message); return; }
    toast.success('Mission dissociée du client');
    qc.invalidateQueries({ queryKey: ['client-missions', clientId] });
    qc.invalidateQueries({ queryKey: ['missions'] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Missions</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" /> Associer une mission
          </Button>
          <Button size="sm" onClick={() => navigate('/missions')}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle mission
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="animate-pulse h-20 bg-muted rounded" /> : !missions?.length ? (
          <p className="text-muted-foreground text-sm">Aucune mission associée à ce client.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Chef de mission</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missions.map((m: any) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/missions/${m.id}`)}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge variant={(statusColors[m.status] || 'secondary') as any}>{statusLabels[m.status] || m.status}</Badge></TableCell>
                  <TableCell>{(m.chief as any)?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.start_date ? format(new Date(m.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                    {m.end_date ? ` → ${format(new Date(m.end_date), 'dd MMM yyyy', { locale: fr })}` : ''}
                  </TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={m.progress ?? 0} className="h-2 w-20" /><span className="text-xs">{m.progress ?? 0}%</span></div></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Dissocier" onClick={(e) => handleUnlink(m.id, e)}>
                      <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associer une mission existante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez une mission non associée à un client pour la lier à ce client.
            </p>
            <Select value={selectedMissionId} onValueChange={setSelectedMissionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une mission..." />
              </SelectTrigger>
              <SelectContent>
                {unlinkedMissions.length === 0 ? (
                  <SelectItem value="_none" disabled>Aucune mission disponible</SelectItem>
                ) : (
                  unlinkedMissions.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code ? `${m.code} — ` : ''}{m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Annuler</Button>
              <Button onClick={handleLink} disabled={!selectedMissionId || linking}>
                {linking ? 'Association...' : 'Associer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
