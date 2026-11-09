import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentExplorer from '@/components/documents/DocumentExplorer';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';

// Les politiques de la base ne laissent voir que les missions dont l'utilisateur est membre.
const DocumentsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const [params, setParams] = useSearchParams();
  const missionId = params.get('mission') || '';

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['documents-missions', profile?.organization_id, profile?.id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('missions').select('id, code, name').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!missionId && missions.length > 0) setParams({ mission: missions[0].id }, { replace: true });
  }, [missionId, missions, setParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
        {missions.length > 0 && (
          <Select value={missionId} onValueChange={(v) => setParams({ mission: v })}>
            <SelectTrigger className="w-full sm:w-80 h-9"><SelectValue placeholder="Choisissez une mission" /></SelectTrigger>
            <SelectContent>
              {missions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.code ? `${m.code} · ` : ''}{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {isLoading ? <Loading /> : missions.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucune mission" description="Vous n'êtes membre d'aucune mission." />
      ) : missionId ? (
        <DocumentExplorer key={missionId} missionId={missionId} />
      ) : null}
    </div>
  );
};

export default DocumentsPage;
