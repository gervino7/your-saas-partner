import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, FileText, Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function usePortalData(token: string | undefined) {
  return useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      if (!token) return null;

      // Fetch token data - use service role via edge function in production
      // For now, we query directly (the portal is a public page)
      const { data: tokenData, error: tokenErr } = await supabase
        .from('client_portal_tokens')
        .select('*, client:clients(*), mission:missions(*, director:profiles!missions_director_id_fkey(full_name))')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenErr || !tokenData) return null;

      // Check expiration
      if (new Date(tokenData.expires_at) < new Date()) return null;

      // Get projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, code, status, progress')
        .eq('mission_id', tokenData.mission_id);

      // Get published documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, file_path, mime_type, file_size, created_at, status')
        .eq('mission_id', tokenData.mission_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      // Get COPIL meetings
      const { data: committees } = await supabase
        .from('committees')
        .select('id')
        .eq('mission_id', tokenData.mission_id)
        .eq('type', 'copil');

      let meetings: any[] = [];
      if (committees && committees.length > 0) {
        const { data: m } = await supabase
          .from('committee_meetings')
          .select('*')
          .eq('committee_id', committees[0].id)
          .order('scheduled_at', { ascending: false });
        meetings = m ?? [];
      }

      return {
        token: tokenData,
        client: tokenData.client,
        mission: tokenData.mission,
        projects: projects ?? [],
        documents: documents ?? [],
        meetings,
      };
    },
    enabled: !!token,
  });
}

const statusLabels: Record<string, string> = { planning: 'Planification', active: 'En cours', completed: 'Terminé', paused: 'En pause' };

const ClientPortalPage = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading } = usePortalData(token);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loading /></div>;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <EmptyState icon={Building2} title="Lien invalide ou expiré" description="Ce lien de portail client n'est plus valide. Veuillez contacter votre consultant." />
      </div>
    );
  }

  const { client, mission, projects, documents, meetings } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold font-display text-lg">MissionFlow — Portail Client</h1>
              <p className="text-sm text-muted-foreground">{(client as any)?.name}</p>
            </div>
          </div>
          <Badge variant="outline">{(mission as any)?.code}</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 px-6 space-y-6">
        {/* Mission Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> {(mission as any)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Progression globale</span>
              <Progress value={(mission as any)?.progress ?? 0} className="flex-1 h-3" />
              <span className="font-bold">{(mission as any)?.progress ?? 0}%</span>
            </div>
            {(mission as any)?.description && <p className="text-sm text-muted-foreground">{(mission as any).description}</p>}
          </CardContent>
        </Card>

        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects"><TrendingUp className="h-4 w-4 mr-1" /> Projets</TabsTrigger>
            <TabsTrigger value="deliverables"><FileText className="h-4 w-4 mr-1" /> Livrables</TabsTrigger>
            <TabsTrigger value="copil"><Calendar className="h-4 w-4 mr-1" /> COPIL</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {projects.length === 0 ? <p className="text-muted-foreground text-sm">Aucun projet en cours.</p> : (
                  <div className="space-y-3">
                    {projects.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.code}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{statusLabels[p.status] || p.status}</Badge>
                          <div className="flex items-center gap-2">
                            <Progress value={p.progress ?? 0} className="h-2 w-24" />
                            <span className="text-xs">{p.progress ?? 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliverables" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {documents.length === 0 ? <p className="text-muted-foreground text-sm">Aucun livrable publié pour le moment.</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.name}
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}</TableCell>
                          <TableCell><Badge>Publié</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="copil" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {meetings.length === 0 ? <p className="text-muted-foreground text-sm">Aucune réunion COPIL programmée.</p> : (
                  <div className="space-y-3">
                    {meetings.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <span className="font-medium">{m.title}</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(m.scheduled_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                        <Badge variant={m.status === 'completed' ? 'default' : 'outline'}>
                          {m.status === 'completed' ? 'Terminée' : m.status === 'scheduled' ? 'Programmée' : m.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientPortalPage;
