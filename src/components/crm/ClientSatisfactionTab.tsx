import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Send, Copy, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientSurveys, useClientMissions, useClientContacts } from '@/hooks/useCRM';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import EmptyState from '@/components/common/EmptyState';

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground text-xs">En attente</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? 'text-warning fill-warning' : 'text-muted'}`} />
      ))}
    </div>
  );
}

function NpsBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const variant = score >= 9 ? 'default' : score >= 7 ? 'secondary' : 'destructive';
  return <Badge variant={variant as any}>{score}/10</Badge>;
}

export default function ClientSatisfactionTab({ clientId }: { clientId: string }) {
  const { data: surveys, isLoading } = useClientSurveys(clientId);
  const { data: missions } = useClientMissions(clientId);
  const { data: contacts } = useClientContacts(clientId);
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [lastSurveyLink, setLastSurveyLink] = useState('');

  // Pre-fill contact from primary contact
  const handleOpenSend = () => {
    const primary = (contacts ?? []).find((c: any) => c.is_primary) || (contacts ?? [])[0];
    setContactName(primary?.name || '');
    setContactEmail(primary?.email || '');
    setSelectedMissionId('');
    setLastSurveyLink('');
    setSendOpen(true);
  };

  const handleSend = async () => {
    if (!selectedMissionId) { toast.error('Veuillez sélectionner une mission'); return; }
    if (!contactEmail) { toast.error('Veuillez saisir un email'); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-satisfaction-survey', {
        body: {
          missionId: selectedMissionId,
          clientId,
          contactEmail,
          contactName,
        },
      });

      if (error) throw error;

      const surveyUrl = `${window.location.origin}/survey/${data.token}`;
      setLastSurveyLink(surveyUrl);

      toast.success('Enquête envoyée avec succès');
      qc.invalidateQueries({ queryKey: ['client-surveys', clientId] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(lastSurveyLink);
    toast.success('Lien copié');
  };

  // Separate answered vs pending surveys
  const answeredSurveys = (surveys ?? []).filter((s: any) => s.overall_rating != null);
  const pendingSurveys = (surveys ?? []).filter((s: any) => s.overall_rating == null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Enquêtes de satisfaction</CardTitle>
          <Button size="sm" onClick={handleOpenSend}>
            <Send className="h-4 w-4 mr-2" /> Envoyer une enquête
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse h-20 bg-muted rounded" />
          ) : !surveys?.length ? (
            <EmptyState
              icon={Star}
              title="Aucune enquête"
              description="Envoyez une enquête de satisfaction pour recueillir l'avis du client sur une mission."
            />
          ) : (
            <div className="space-y-6">
              {/* Pending surveys */}
              {pendingSurveys.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">En attente de réponse</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mission</TableHead>
                        <TableHead>Destinataire</TableHead>
                        <TableHead>Envoyée le</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSurveys.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{(s.mission as any)?.name || '—'}</TableCell>
                          <TableCell className="text-sm">{s.respondent_email || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.submitted_at ? format(new Date(s.submitted_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                          </TableCell>
                          <TableCell><Badge variant="outline">En attente</Badge></TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Copier le lien"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/survey/${s.token}`);
                                toast.success('Lien copié');
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Answered surveys */}
              {answeredSurveys.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Réponses reçues</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mission</TableHead>
                        <TableHead>Répondant</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Note globale</TableHead>
                        <TableHead>Qualité</TableHead>
                        <TableHead>Délais</TableHead>
                        <TableHead>Communication</TableHead>
                        <TableHead>NPS</TableHead>
                        <TableHead>Commentaires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answeredSurveys.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{(s.mission as any)?.name || '—'}</TableCell>
                          <TableCell className="text-sm">{s.respondent_name || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.submitted_at ? format(new Date(s.submitted_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                          </TableCell>
                          <TableCell><Stars value={s.overall_rating} /></TableCell>
                          <TableCell><Stars value={s.quality_rating} /></TableCell>
                          <TableCell><Stars value={s.timeliness_rating} /></TableCell>
                          <TableCell><Stars value={s.communication_rating} /></TableCell>
                          <TableCell><NpsBadge score={s.nps_score} /></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{s.comments || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send survey dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md p-0 rounded-2xl shadow-2xl overflow-hidden">
          <DialogHeader className="bg-amber-600 dark:bg-amber-700 px-6 py-4 rounded-t-2xl">
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="h-5 w-5" /> Envoyer une enquête de satisfaction
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mission *</Label>
              <Select value={selectedMissionId} onValueChange={setSelectedMissionId}>
                <SelectTrigger className="h-11 border-2 border-border/40 bg-white dark:bg-card">
                  <SelectValue placeholder="Sélectionner une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {(missions ?? []).length === 0 ? (
                    <SelectItem value="_none" disabled>Aucune mission associée</SelectItem>
                  ) : (
                    (missions ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code ? `${m.code} — ` : ''}{m.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nom du destinataire</Label>
              <Input className="h-11 border-2 border-border/40 bg-white dark:bg-card" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nom du contact client" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email du destinataire *</Label>
              <Input className="h-11 border-2 border-border/40 bg-white dark:bg-card" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="email@client.com" />
              {(contacts ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(contacts ?? []).filter((c: any) => c.email).map((c: any) => (
                    <Button
                      key={c.id}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => { setContactName(c.name); setContactEmail(c.email); }}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {lastSurveyLink && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">✓ Enquête créée et email envoyé</p>
                <div className="flex items-center gap-2">
                  <Input value={lastSurveyLink} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(lastSurveyLink, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Vous pouvez partager ce lien directement si l'email n'arrive pas.</p>
              </div>
            )}
          </div>
          <div className="bg-muted/30 border-t px-6 py-4 flex justify-end gap-2 rounded-b-2xl">
            <Button variant="outline" className="rounded-xl" onClick={() => setSendOpen(false)}>Fermer</Button>
            {!lastSurveyLink && (
              <Button className="rounded-xl shadow-md bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSend} disabled={sending || !selectedMissionId || !contactEmail}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Envoi...' : 'Envoyer'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
