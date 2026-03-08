import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, FileText, CalendarDays, Mail, Download, ArrowLeft, Loader2, CheckCircle2, Clock, Sparkles, Award, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImg from '@/assets/logo.png';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copil-portal-auth`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Step = 'email' | 'otp' | 'portal';

const goldGradient = 'linear-gradient(135deg, hsl(28 85% 42%) 0%, hsl(35 92% 50%) 25%, hsl(43 95% 58%) 50%, hsl(45 55% 78%) 75%, hsl(0 0% 96%) 100%)';

const CopilPortalPage = () => {
  const { committeeId } = useParams<{ committeeId: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [portalData, setPortalData] = useState<any>(null);

  const callApi = async (body: Record<string, unknown>) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    return data;
  };

  const handleSendOTP = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await callApi({ action: 'send-otp', committee_id: committeeId, email: email.trim() });
      toast.success('Code envoyé par email');
      setStep('otp');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await callApi({ action: 'verify-otp', committee_id: committeeId, email: email.trim(), otp });
      setSessionToken(res.session_token);
      const docs = await callApi({ action: 'get-documents', committee_id: committeeId, session_token: res.session_token });
      setPortalData(docs);
      setStep('portal');
      toast.success('Accès autorisé');
    } catch (e: any) {
      toast.error(e.message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (doc: any) => {
    if (doc.signed_url) {
      window.open(doc.signed_url, '_blank');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  // ── Auth screens (email + OTP) ──
  if (step === 'email' || step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: goldGradient }}>
        {/* Decorative */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" style={{ background: 'hsla(43,95%,65%,0.15)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" style={{ background: 'hsla(30,90%,50%,0.12)' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
              <img src={logoImg} alt="Logo" className="h-10 w-auto mx-auto drop-shadow-lg mb-3" />
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-8" style={{ background: 'hsla(0,0%,100%,0.3)' }} />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">Portail COPIL</span>
                <div className="h-px w-8" style={{ background: 'hsla(0,0%,100%,0.3)' }} />
              </div>
            </div>

            {/* Card */}
            <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden" style={{ background: 'hsla(40,30%,97%,0.97)' }}>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md" style={{ background: goldGradient }}>
                    {step === 'email' ? <Lock className="h-6 w-6 text-white" /> : <Mail className="h-6 w-6 text-white" />}
                  </div>
                  <h2 className="text-xl font-bold font-display" style={{ color: 'hsl(218,35%,15%)' }}>
                    {step === 'email' ? 'Accès sécurisé' : 'Vérification'}
                  </h2>
                  <p className="text-sm mt-1.5" style={{ color: 'hsl(218,10%,50%)' }}>
                    {step === 'email'
                      ? 'Entrez votre adresse email pour recevoir un code d\'accès'
                      : <>Un code à 6 chiffres a été envoyé à <strong className="text-foreground">{email}</strong></>
                    }
                  </p>
                </div>

                {step === 'email' ? (
                  <div className="space-y-4">
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      className="h-12 rounded-xl border-2 text-center text-base"
                      style={{ borderColor: 'hsl(40,25%,85%)' }}
                    />
                    <Button
                      className="w-full h-12 rounded-xl text-base font-semibold text-white shadow-lg"
                      style={{ background: 'linear-gradient(135deg, hsl(35,90%,48%), hsl(43,95%,55%))' }}
                      onClick={handleSendOTP}
                      disabled={loading || !email.trim()}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Recevoir le code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl text-base font-semibold text-white shadow-lg"
                      style={{ background: 'linear-gradient(135deg, hsl(35,90%,48%), hsl(43,95%,55%))' }}
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Vérifier
                    </Button>
                    <Button variant="ghost" className="w-full rounded-xl" onClick={() => { setStep('email'); setOtp(''); }}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Changer d'email
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-[11px] mt-6 text-white/50">
              <Shield className="h-3 w-3 inline mr-1" />
              Accès réservé aux membres du Comité de Pilotage
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal step ──
  if (!portalData) return null;

  const { committee, documents, meetings } = portalData;
  const mission = (committee as any)?.missions;
  const completedMeetings = meetings.filter((m: any) => m.status === 'completed').length;
  const upcomingMeetings = meetings.filter((m: any) => new Date(m.scheduled_at) > new Date()).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden" style={{ background: goldGradient }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" style={{ background: 'hsla(43,95%,65%,0.15)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" style={{ background: 'hsla(30,90%,50%,0.12)' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-6 pb-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Logo" className="h-9 w-auto drop-shadow-md" />
              <div className="h-6 w-px" style={{ background: 'hsla(0,0%,100%,0.25)' }} />
              <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'hsla(0,0%,100%,0.7)', letterSpacing: '0.08em' }}>Portail COPIL</span>
            </div>
            <Badge className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'hsla(0,0%,100%,0.2)', color: 'white', borderColor: 'hsla(0,0%,100%,0.3)', backdropFilter: 'blur(8px)' }}>
              {email}
            </Badge>
          </div>

          {/* Committee name */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, hsla(0,0%,100%,0.3), hsla(0,0%,100%,0.1))', backdropFilter: 'blur(10px)', border: '1px solid hsla(0,0%,100%,0.25)' }}>
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold font-display text-white tracking-tight drop-shadow-sm">{committee?.name || 'COPIL'}</h1>
                <p className="text-sm" style={{ color: 'hsla(0,0%,100%,0.65)' }}>{mission?.name} — {mission?.code}</p>
              </div>
            </div>
          </div>

          {/* Mission Card */}
          <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'hsla(40,30%,97%,0.95)', backdropFilter: 'blur(16px)', border: '1px solid hsla(40,40%,88%,0.6)' }}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: documents.length, label: 'Documents', icon: FileText },
                { value: completedMeetings, label: 'Réunions tenues', icon: CheckCircle2 },
                { value: upcomingMeetings, label: 'À venir', icon: Clock },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center rounded-xl py-4 px-2"
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
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2">
              <FileText className="h-4 w-4" /> Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="meetings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2">
              <CalendarDays className="h-4 w-4" /> Réunions ({meetings.length})
              {upcomingMeetings > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">{upcomingMeetings}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Documents */}
          <TabsContent value="documents">
            {documents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucun document COPIL publié pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <Card key={doc.id} className="hover:shadow-md transition-all duration-200 group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, hsl(43 95% 50%), hsl(30 90% 50%))' }}>
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate group-hover:text-primary transition-colors">{doc.name}</h4>
                          {doc.version > 1 && <Badge variant="secondary" className="text-[10px] px-1.5">v{doc.version}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5 flex-shrink-0 text-xs" onClick={() => handleDownload(doc)} disabled={!doc.signed_url}>
                        <Download className="h-3.5 w-3.5" /> Télécharger
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Meetings */}
          <TabsContent value="meetings">
            {meetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune réunion COPIL programmée.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {meetings.map((m: any) => {
                  const isCompleted = m.status === 'completed';
                  const isUpcoming = new Date(m.scheduled_at) > new Date();
                  const decisionsCount = m.decisions ? (m.decisions as any[]).length : 0;
                  return (
                    <Card key={m.id} className={`hover:shadow-md transition-all duration-200 ${isUpcoming ? 'ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1.5">
                            <h4 className="font-semibold font-display">{m.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {format(new Date(m.scheduled_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                            {decisionsCount > 0 && (
                              <p className="text-xs text-muted-foreground/70">{decisionsCount} décision(s) enregistrée(s)</p>
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
              © {new Date().getFullYear()} Mission-DGC — Portail COPIL sécurisé
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

export default CopilPortalPage;
