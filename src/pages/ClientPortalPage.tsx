import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, FileText, Calendar, TrendingUp, Download,
  CheckCircle2, Clock, BarChart3, FolderOpen, ChevronRight,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function usePortalData(token: string | undefined) {
  return useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      if (!token) return null;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-portal-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ token }),
        }
      );
      if (!res.ok) return null;
      const { data: tokenData } = await res.json();
      if (!tokenData) return null;

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, code, status, progress')
        .eq('mission_id', tokenData.mission_id);

      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, file_path, mime_type, file_size, created_at, status')
        .eq('mission_id', tokenData.mission_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  planning: { label: 'Planification', color: 'bg-info/10 text-info border-info/20', icon: Clock },
  active: { label: 'En cours', color: 'bg-primary/10 text-primary border-primary/20', icon: TrendingUp },
  completed: { label: 'Terminé', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  on_hold: { label: 'En pause', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  review: { label: 'En revue', color: 'bg-accent/10 text-accent border-accent/20', icon: BarChart3 },
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

const ClientPortalPage = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading } = usePortalData(token);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl">
          <Loading />
          <p className="text-muted-foreground mt-4 text-sm">Chargement de votre portail…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="bg-card rounded-2xl p-10 shadow-2xl max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold font-display">Lien invalide ou expiré</h2>
          <p className="text-muted-foreground text-sm">
            Ce lien de portail client n'est plus valide. Veuillez contacter votre consultant pour obtenir un nouveau lien d'accès.
          </p>
        </div>
      </div>
    );
  }

  const { client, mission, projects, documents, meetings } = data;
  const missionData = mission as any;
  const clientData = client as any;
  const progress = missionData?.progress ?? 0;
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/60 font-medium">Portail Client</p>
                <h1 className="text-2xl font-bold font-display text-primary-foreground">{clientData?.name}</h1>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 text-sm px-3 py-1">
              {missionData?.code}
            </Badge>
          </div>

          {/* Mission info bar */}
          <div className="mt-8 bg-card/10 backdrop-blur-sm rounded-2xl border border-primary-foreground/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary-foreground font-display">{missionData?.name}</h2>
              <span className="text-2xl font-bold text-primary-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-primary-foreground/10 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress >= 80
                    ? 'hsl(var(--success))'
                    : progress >= 40
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--accent))',
                }}
              />
            </div>
            {missionData?.description && (
              <p className="text-sm text-primary-foreground/60 mt-3 line-clamp-2">{missionData.description}</p>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{projects.length}</p>
                <p className="text-xs text-primary-foreground/50 mt-1">Projets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{completedProjects}</p>
                <p className="text-xs text-primary-foreground/50 mt-1">Terminés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{documents.length}</p>
                <p className="text-xs text-primary-foreground/50 mt-1">Livrables</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 -mt-2">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <BarChart3 className="h-4 w-4 mr-2" /> Projets
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <FolderOpen className="h-4 w-4 mr-2" /> Livrables
            </TabsTrigger>
            <TabsTrigger value="copil" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <Calendar className="h-4 w-4 mr-2" /> COPIL
            </TabsTrigger>
          </TabsList>

          {/* Projets */}
          <TabsContent value="projects">
            {projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun projet en cours pour cette mission.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((p: any) => {
                  const cfg = statusConfig[p.status] || statusConfig.planning;
                  const Icon = cfg.icon;
                  return (
                    <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold font-display text-base">{p.name}</h3>
                            {p.code && <p className="text-xs text-muted-foreground mt-0.5">{p.code}</p>}
                          </div>
                          <Badge variant="outline" className={`${cfg.color} border text-xs font-medium`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-bold">{p.progress ?? 0}%</span>
                          </div>
                          <Progress value={p.progress ?? 0} className="h-2.5" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Livrables */}
          <TabsContent value="deliverables">
            {documents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun livrable publié pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{doc.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          {doc.file_size && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-success/10 text-success border-success/20 border">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Publié
                      </Badge>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* COPIL */}
          <TabsContent value="copil">
            {meetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune réunion COPIL programmée.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {meetings.map((m: any) => {
                  const isCompleted = m.status === 'completed';
                  const isUpcoming = new Date(m.scheduled_at) > new Date();
                  return (
                    <Card key={m.id} className="hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold font-display">{m.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(m.scheduled_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                            {m.location && (
                              <p className="text-xs text-muted-foreground">{m.location}</p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              isCompleted
                                ? 'bg-success/10 text-success border-success/20'
                                : isUpcoming
                                  ? 'bg-primary/10 text-primary border-primary/20'
                                  : 'bg-muted text-muted-foreground'
                            }
                          >
                            {isCompleted ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Terminée</>
                            ) : isUpcoming ? (
                              <><Clock className="h-3 w-3 mr-1" /> À venir</>
                            ) : (
                              m.status
                            )}
                          </Badge>
                        </div>
                        {m.agenda && (
                          <>
                            <Separator className="my-3" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Ordre du jour</p>
                              <p className="text-sm whitespace-pre-line">{m.agenda}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Mission-DGC — Portail client sécurisé
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Accès confidentiel
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalPage;
