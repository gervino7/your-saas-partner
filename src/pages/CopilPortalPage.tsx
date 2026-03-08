import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, FileText, CalendarDays, Mail, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copil-portal-auth`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Step = 'email' | 'otp' | 'portal';

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

      // Load documents
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

  // ── Email step ──
  if (step === 'email') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Portail Documents COPIL</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez votre adresse email pour recevoir un code d'accès
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
            />
            <Button className="w-full" onClick={handleSendOTP} disabled={loading || !email.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Recevoir le code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── OTP step ──
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Vérification</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button className="w-full" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vérifier
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setStep('email'); setOtp(''); }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Changer d'email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Portal step ──
  if (!portalData) return null;

  const { committee, documents, meetings } = portalData;
  const mission = (committee as any)?.missions;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{committee?.name || 'COPIL'}</h1>
              <p className="text-sm text-muted-foreground">{mission?.name} — {mission?.code}</p>
            </div>
          </div>
          <Badge variant="outline">{email}</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 px-6 space-y-6">
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-1" /> Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <CalendarDays className="h-4 w-4 mr-1" /> Réunions ({meetings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {documents.length === 0 ? (
                  <EmptyState icon={FileText} title="Aucun document" description="Aucun document COPIL n'a été publié pour le moment." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Taille</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{doc.name}</span>
                              {doc.version > 1 && <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatSize(doc.file_size)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleDownload(doc)} disabled={!doc.signed_url}>
                              <Download className="h-4 w-4 mr-1" /> Télécharger
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {meetings.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Aucune réunion" description="Aucune réunion COPIL programmée." />
                ) : (
                  <div className="space-y-3">
                    {meetings.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <span className="font-medium">{m.title}</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(m.scheduled_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                          {m.decisions && (m.decisions as any[]).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(m.decisions as any[]).length} décision(s)
                            </p>
                          )}
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

export default CopilPortalPage;
