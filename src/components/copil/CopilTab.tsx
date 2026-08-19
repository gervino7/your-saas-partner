import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, CalendarDays, Mail, FileText, Link2, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCommittees, useDeleteCommittee } from '@/hooks/useCommittees';
import CommitteeSetup from './CommitteeSetup';
import CommitteeEditDialog from './CommitteeEditDialog';
import MembersList from './MembersList';
import MeetingsSection from './MeetingsSection';
import GroupMailComposer from './GroupMailComposer';
import CopilDocuments from './CopilDocuments';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire', biweekly: 'Bimensuelle', monthly: 'Mensuelle', on_demand: 'À la demande',
};

interface Props {
  missionId: string;
  missionName: string;
  canManage: boolean;
}

const CopilTab = ({ missionId, missionName, canManage }: Props) => {
  const { data: committees, isLoading } = useCommittees(missionId);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteCommittee = useDeleteCommittee();

  const selected = committees?.find((c: any) => c.id === selectedId) ?? committees?.[0];

  const portalUrl = selected ? `${window.location.origin}/copil-portal/${selected.id}` : '';

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Lien du portail copié');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteCommittee.mutateAsync({ id: selected.id, missionId });
    setSelectedId(undefined);
    setDeleteOpen(false);
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-lg" /></div>;

  if (!committees || committees.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState icon={Shield} title="COPIL" description="Aucun comité de pilotage n'a été créé pour cette mission." />
        <div className="flex justify-center">
          <CommitteeSetup missionId={missionId} canManage={canManage} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Committee selector + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {committees.length > 1 ? (
            <Select value={selected?.id} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[260px] text-gold font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {committees.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h3 className="text-lg font-semibold text-gold">{selected?.name}</h3>
          )}
          <Badge variant="outline">{selected?.type === 'copil' ? 'COPIL' : 'CODIR'}</Badge>
          <Badge variant="secondary">{FREQ_LABELS[selected?.meeting_frequency ?? 'monthly']}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <Button variant="outline" size="sm" onClick={copyPortalLink}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
              {copied ? 'Copié !' : 'Lien portail externe'}
            </Button>
          )}
          {canManage && selected && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Modifier
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
              </Button>
            </>
          )}
          <CommitteeSetup missionId={missionId} canManage={canManage} />
        </div>
      </div>

      {selected && (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-1"><Users className="h-4 w-4" /> Membres</TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Réunions</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="mailing" className="flex items-center gap-1"><Mail className="h-4 w-4" /> Mailing</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4">
            <MembersList committeeId={selected.id} canManage={canManage} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-4">
            <MeetingsSection committeeId={selected.id} canManage={canManage} />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <CopilDocuments committeeId={selected.id} missionId={missionId} canManage={canManage} />
          </TabsContent>
          <TabsContent value="mailing" className="mt-4">
            <GroupMailComposer
              committeeId={selected.id}
              committeeName={selected.name}
              missionName={missionName}
              canManage={canManage}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Edit dialog */}
      {selected && (
        <CommitteeEditDialog committee={selected} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le comité</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {selected?.name} » ? Cette action supprimera également tous les membres, réunions et documents associés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCommittee.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CopilTab;
