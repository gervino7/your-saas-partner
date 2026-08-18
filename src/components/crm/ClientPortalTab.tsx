import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link2, Plus, Copy, ExternalLink, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { usePortalTokens, useCreatePortalToken, useClientMissions } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

export default function ClientPortalTab({ clientId }: { clientId: string }) {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const { data: tokens, isLoading } = usePortalTokens(clientId);
  const { data: missions } = useClientMissions(clientId);
  const createToken = useCreatePortalToken();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMission, setSelectedMission] = useState('');
  const qc = useQueryClient();

  const deactivateToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('client_portal_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-tokens', clientId] });
      toast.success('Lien désactivé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreate = async () => {
    if (!selectedMission) return;
    await createToken.mutateAsync({ clientId, missionId: selectedMission });
    setShowCreate(false);
    setSelectedMission('');
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papiers');
  };

  const openLink = (token: string) => {
    window.open(`${window.location.origin}/portal/${token}`, '_blank');
  };

  const activeTokens = (tokens ?? []).filter(t => t.is_active && !isPast(new Date(t.expires_at)));
  const inactiveTokens = (tokens ?? []).filter(t => !t.is_active || isPast(new Date(t.expires_at)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Liens portail client
          </CardTitle>
          {gradeLevel <= 3 && (
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={!missions || missions.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Créer un lien portail
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeTokens.length === 0 && inactiveTokens.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="Aucun lien portail"
              description="Créez un lien portail pour permettre au client de suivre l'avancement de sa mission."
            />
          ) : (
            <div className="space-y-6">
              {activeTokens.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Liens actifs ({activeTokens.length})
                  </h3>
                  {activeTokens.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{(t.mission as any)?.name || 'Mission'}</span>
                          {(t.mission as any)?.code && (
                            <Badge variant="outline" className="text-xs">{(t.mission as any).code}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expire le {format(new Date(t.expires_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLink(t.token)}>
                          <Copy className="h-4 w-4 mr-1" /> Copier
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openLink(t.token)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {gradeLevel <= 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deactivateToken.mutate(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inactiveTokens.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" /> Liens expirés / désactivés ({inactiveTokens.length})
                  </h3>
                  {inactiveTokens.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 opacity-60">
                      <div className="space-y-1">
                        <span className="font-medium">{(t.mission as any)?.name || 'Mission'}</span>
                        <p className="text-xs text-muted-foreground">
                          Créé le {format(new Date(t.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {!t.is_active ? 'Désactivé' : 'Expiré'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl shadow-2xl border-0 overflow-hidden p-0">
          <div className="bg-primary px-6 py-5 flex items-center gap-3">
            <Link2 className="h-5 w-5 text-primary-foreground" />
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-primary-foreground text-lg">Créer un lien portail</DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez la mission pour laquelle générer un lien d'accès client. Le lien sera valide 30 jours.
            </p>
            <div className="space-y-2">
              <Label>Mission</Label>
              <Select value={selectedMission} onValueChange={setSelectedMission}>
                <SelectTrigger className="h-11 border-2">
                  <SelectValue placeholder="Choisir une mission" />
                </SelectTrigger>
                <SelectContent>
                  {(missions ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code ? `${m.code} - ` : ''}{m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="bg-muted/30 border-t px-6 py-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button className="rounded-xl" onClick={handleCreate} disabled={!selectedMission || createToken.isPending}>
              <Link2 className="h-4 w-4 mr-2" /> Générer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
