import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp, History, Info, Mail, Plus, RotateCcw, ShieldOff, Send, X, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import {
  useClientPortalAccess,
  useInvitePortalContact,
  useTogglePortalAccess,
  useCancelPortalInvitation,
  type PortalAccount,
} from '@/hooks/usePortalAccess';
import { usePortalAccessLog } from '@/hooks/useClientDocuments';
import { PORTAL_LOG_ACTIONS } from '@/lib/portalDocs';

const fmt = (value: string | null) => (value ? format(new Date(value), 'dd MMM yyyy', { locale: fr }) : '—');

interface Props {
  clientId: string;
  defaultEmail?: string | null;
}

export default function ClientPortalAccessTab({ clientId, defaultEmail }: Props) {
  const { data, isLoading } = useClientPortalAccess(clientId);
  const invite = useInvitePortalContact(clientId);
  const toggle = useTogglePortalAccess(clientId);
  const cancelInvitation = useCancelPortalInvitation(clientId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [fullName, setFullName] = useState('');

  const [revokeTarget, setRevokeTarget] = useState<PortalAccount | null>(null);
  const [reason, setReason] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const { data: logs, isLoading: logLoading } = usePortalAccessLog(logOpen ? clientId : undefined);

  const handleInvite = async () => {
    await invite.mutateAsync({ email: email.trim(), fullName: fullName.trim() });
    setInviteOpen(false);
    setFullName('');
  };

  const handleRevoke = async () => {
    if (!revokeTarget || reason.trim().length < 5) return;
    await toggle.mutateAsync({ portalUserId: revokeTarget.id, activate: false, reason: reason.trim() });
    setRevokeTarget(null);
    setReason('');
  };

  if (isLoading) return <Loading />;

  const accounts = data?.accounts ?? [];
  const invitations = data?.pending_invitations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Le contact invité accède uniquement aux données de ce client : ses dossiers, ses documents partagés
          et ses factures. Il n'a aucun accès aux autres clients ni aux données internes du cabinet.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> Comptes actifs
          </CardTitle>
          <Button size="sm" onClick={() => { setEmail(defaultEmail ?? ''); setInviteOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Inviter un contact
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState icon={Users} title="Aucun compte client" description="Invitez un contact pour lui ouvrir l'espace client." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Activé le</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>{a.full_name || '—'}</TableCell>
                    <TableCell>{a.phone || '—'}</TableCell>
                    <TableCell>{fmt(a.activated_at)}</TableCell>
                    <TableCell>
                      {a.last_seen_at ? fmt(a.last_seen_at) : <span className="text-muted-foreground">Jamais connecté</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? 'default' : 'secondary'}>
                        {a.is_active ? 'Actif' : 'Révoqué'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setRevokeTarget(a); setReason(''); }}
                        >
                          <ShieldOff className="mr-1 h-4 w-4" /> Révoquer l'accès
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle.mutate({ portalUserId: a.id, activate: true, reason: 'Rétablissement de l\'accès' })}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" /> Rétablir l'accès
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" /> Invitations en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune invitation en attente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Envoyée le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{fmt(inv.invited_at)}</TableCell>
                    <TableCell>{fmt(inv.expires_at)}</TableCell>
                    <TableCell>
                      {inv.is_expired ? (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">Expirée</Badge>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={invite.isPending}
                        onClick={() => invite.mutate({ email: inv.email, fullName: inv.full_name ?? undefined })}
                      >
                        <Send className="mr-1 h-4 w-4" /> Renvoyer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelInvitation.mutate(inv.id)}
                      >
                        <X className="mr-1 h-4 w-4" /> Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" /> Journal d'activité
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLogOpen((o) => !o)}>
            {logOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {logOpen && (
          <CardContent>
            {logLoading ? (
              <Loading />
            ) : (logs?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs!.map((l) => {
                    const details = (l.details ?? {}) as Record<string, unknown>;
                    const detail = (details.title ?? details.reason ?? details.file_name ?? '') as string;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(l.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>{l.portal_users?.full_name || l.portal_users?.email || '—'}</TableCell>
                        <TableCell>{PORTAL_LOG_ACTIONS[l.action] ?? l.action}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{detail || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un contact</DialogTitle>
            <DialogDescription>
              Le contact recevra un email pour créer son mot de passe et activer son espace client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email *</Label>
              <Input id="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@client.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-name">Nom complet</Label>
              <Input id="portal-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button onClick={handleInvite} disabled={!email.trim() || invite.isPending}>
              <Send className="mr-2 h-4 w-4" /> Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer l'accès</DialogTitle>
            <DialogDescription>
              L'accès de {revokeTarget?.email} sera immédiatement suspendu. Un motif est obligatoire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Motif *</Label>
            <Textarea id="revoke-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif de la révocation (5 caractères minimum)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={reason.trim().length < 5 || toggle.isPending}>
              <ShieldOff className="mr-2 h-4 w-4" /> Révoquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
