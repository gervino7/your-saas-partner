import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, FileText, Calendar, TrendingUp, Download,
  CheckCircle2, Clock, BarChart3, FolderOpen,
  Shield, Sparkles, Award, Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Loading from '@/components/common/Loading';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImg from '@/assets/logo.png';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(30 85% 45%) 0%, hsl(43 90% 55%) 50%, hsl(0 0% 94%) 100%)' }}>
        <div className="bg-card rounded-2xl p-10 shadow-2xl text-center">
          <Loading />
          <p className="text-muted-foreground mt-4 text-sm">Chargement de votre portail…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(30 85% 45%) 0%, hsl(43 90% 55%) 50%, hsl(0 0% 94%) 100%)' }}>
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
  const upcomingMeetings = meetings.filter((m: any) => new Date(m.scheduled_at) > new Date()).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(28 85% 42%) 0%, hsl(35 92% 50%) 25%, hsl(43 95% 58%) 50%, hsl(45 55% 78%) 75%, hsl(0 0% 96%) 100%)' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" style={{ background: 'hsla(43,95%,65%,0.15)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" style={{ background: 'hsla(30,90%,50%,0.12)' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2" style={{ background: 'hsla(0,0%,100%,0.06)' }} />
        </div>

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-6 pb-10">
          {/* Top bar: Logo + Badge */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Logo" className="h-9 w-auto drop-shadow-md" />
              <div className="h-6 w-px" style={{ background: 'hsla(0,0%,100%,0.25)' }} />
              <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'hsla(0,0%,100%,0.7)', letterSpacing: '0.08em' }}>Portail Client</span>
            </div>
            <Badge className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'hsla(0,0%,100%,0.2)', color: 'white', borderColor: 'hsla(0,0%,100%,0.3)' }}>
              <Sparkles className="h-3 w-3 mr-1.5" />
              {missionData?.code}
            </Badge>
          </div>

          {/* Client name */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, hsla(0,0%,100%,0.3), hsla(0,0%,100%,0.1))', border: '1px solid hsla(0,0%,100%,0.25)' }}>
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold font-display text-white tracking-tight drop-shadow-sm">{clientData?.name}</h1>
              </div>
            </div>
          </div>

          {/* Mission Card */}
          <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'hsl(40,30%,97%)', border: '1px solid hsla(40,40%,88%,0.6)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: 'hsl(35,85%,48%)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(35,30%,45%)' }}>Mission en cours</span>
              </div>
              <span className="text-3xl font-extrabold tabular-nums" style={{ color: 'hsl(30,80%,40%)' }}>{progress}<span className="text-lg">%</span></span>
            </div>
            <h2 className="text-xl font-bold font-display mb-4" style={{ color: 'hsl(218,35%,15%)' }}>{missionData?.name}</h2>

            {/* Progress bar */}
            <div className="w-full rounded-full h-3.5 overflow-hidden mb-1" style={{ background: 'hsl(40,25%,90%)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress >= 80
                    ? 'linear-gradient(90deg, hsl(152 56% 42%), hsl(152 56% 52%))'
                    : progress >= 40
                      ? 'linear-gradient(90deg, hsl(35 90% 48%), hsl(43 95% 55%))'
                      : 'linear-gradient(90deg, hsl(30 90% 48%), hsl(30 90% 58%))',
                  boxShadow: '0 0 10px hsla(43,90%,55%,0.25)',
                }}
              />
            </div>
            {missionData?.description && (
              <p className="text-sm mt-3 line-clamp-2" style={{ color: 'hsl(218,15%,50%)' }}>{missionData.description}</p>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { value: projects.length, label: 'Projets', icon: BarChart3 },
                { value: completedProjects, label: 'Terminés', icon: CheckCircle2 },
                { value: documents.length, label: 'Livrables', icon: FileText },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center rounded-xl py-3 px-2"
                  style={{ background: 'hsl(40,30%,94%)', border: '1px solid hsl(40,25%,88%)' }}
                >
                  <stat.icon className="h-4 w-4 mx-auto mb-1.5" style={{ color: 'hsl(35,80%,48%)' }} />
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'hsl(218,35%,15%)' }}>{stat.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'hsl(218,10%,55%)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 -mt-2">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2">
              <BarChart3 className="h-4 w-4" /> Projets
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2">
              <FolderOpen className="h-4 w-4" /> Livrables
            </TabsTrigger>
            <TabsTrigger value="copil" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2">
              <Calendar className="h-4 w-4" /> COPIL
              {upcomingMeetings > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">{upcomingMeetings}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Projets */}
          <TabsContent value="projects">
            {projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucun projet en cours pour cette mission.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((p: any) => {
                  const cfg = statusConfig[p.status] || statusConfig.planning;
                  const Icon = cfg.icon;
                  const prog = p.progress ?? 0;
                  return (
                    <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                      <CardContent className="p-0">
                        {/* Colored top accent */}
                        <div className="h-1" style={{
                          background: p.status === 'completed'
                            ? 'hsl(var(--success))'
                            : p.status === 'active'
                              ? 'linear-gradient(90deg, hsl(43 95% 50%), hsl(30 90% 50%))'
                              : 'hsl(var(--muted-foreground) / 0.2)'
                        }} />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold font-display text-base group-hover:text-primary transition-colors">{p.name}</h3>
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
                              <span className="font-bold tabular-nums">{prog}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{
                                width: `${prog}%`,
                                background: prog >= 80
                                  ? 'hsl(var(--success))'
                                  : 'linear-gradient(90deg, hsl(43 95% 50%), hsl(30 90% 50%))',
                              }} />
                            </div>
                          </div>
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
                <CardContent className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucun livrable publié pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any, i: number) => (
                  <Card key={doc.id} className="hover:shadow-md transition-all duration-200 group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{
                        background: 'linear-gradient(135deg, hsl(43 95% 50%), hsl(30 90% 50%))',
                      }}>
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate group-hover:text-primary transition-colors">{doc.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          {doc.file_size && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-success/10 text-success border-success/20 border text-xs hidden sm:flex">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Publié
                      </Badge>
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5 flex-shrink-0 text-xs">
                        <Download className="h-3.5 w-3.5" /> Télécharger
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
                <CardContent className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune réunion COPIL programmée.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {meetings.map((m: any) => {
                  const isCompleted = m.status === 'completed';
                  const isUpcoming = new Date(m.scheduled_at) > new Date();
                  return (
                    <Card key={m.id} className={`hover:shadow-md transition-all duration-200 ${isUpcoming ? 'ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1.5">
                            <h4 className="font-semibold font-display">{m.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(m.scheduled_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                            {m.location && (
                              <p className="text-xs text-muted-foreground/70">{m.location}</p>
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
                              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ordre du jour</p>
                              <p className="text-sm whitespace-pre-line leading-relaxed">{m.agenda}</p>
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
      <footer className="border-t mt-16 py-8 px-6" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-7 w-auto opacity-60" />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Mission-DGC - Portail client sécurisé
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Données confidentielles • Accès autorisé uniquement
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalPage;
