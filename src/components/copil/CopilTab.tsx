import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, CalendarDays, Mail } from 'lucide-react';
import { useCommittees } from '@/hooks/useCommittees';
import CommitteeSetup from './CommitteeSetup';
import MembersList from './MembersList';
import MeetingsSection from './MeetingsSection';
import GroupMailComposer from './GroupMailComposer';
import EmptyState from '@/components/common/EmptyState';

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

  const selected = committees?.find((c: any) => c.id === selectedId) ?? committees?.[0];

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
      {/* Committee selector + create button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {committees.length > 1 ? (
            <Select value={selected?.id} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {committees.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h3 className="text-lg font-semibold">{selected?.name}</h3>
          )}
          <Badge variant="outline">{selected?.type === 'copil' ? 'COPIL' : 'CODIR'}</Badge>
          <Badge variant="secondary">{FREQ_LABELS[selected?.meeting_frequency ?? 'monthly']}</Badge>
        </div>
        <CommitteeSetup missionId={missionId} canManage={canManage} />
      </div>

      {selected && (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-1"><Users className="h-4 w-4" /> Membres</TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Réunions</TabsTrigger>
            <TabsTrigger value="mailing" className="flex items-center gap-1"><Mail className="h-4 w-4" /> Mailing</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4">
            <MembersList committeeId={selected.id} canManage={canManage} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-4">
            <MeetingsSection committeeId={selected.id} canManage={canManage} />
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
    </div>
  );
};

export default CopilTab;
