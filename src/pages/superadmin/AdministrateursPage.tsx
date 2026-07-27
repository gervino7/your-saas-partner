import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlatformAdmins, useGrantAdmin, useRevokeAdmin, useIsPlatformAdmin, type PlatformRole } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire — contrôle total',
  admin: 'Administrateur — gestion des organisations',
  support: 'Support — lecture seule',
};

export default function AdministrateursPage() {
  const { data: admins = [], isLoading } = usePlatformAdmins();
  const { role } = useIsPlatformAdmin();
  const grant = useGrantAdmin();
  const revoke = useRevokeAdmin();

  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<PlatformRole>('support');
  const [toRevoke, setToRevoke] = useState<any>(null);

  const isOwner = role === 'owner';

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Administrateurs plateforme</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner ? 'Gérez les accès à cette console.' : 'Consultation seule — réservé au propriétaire.'}
        </p>
      </div>

      {isOwner && (
        <Card>
          <CardHeader><CardTitle className="text-base">Accorder un accès</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
            <div className="space-y-1.5">
              <Label>Email d'un utilisateur existant</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@cabinet.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as PlatformRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!email.trim() || grant.isPending}
              onClick={() => grant.mutate({ email: email.trim(), role: newRole }, { onSuccess: () => setEmail('') })}
            >
              Accorder
            </Button>
            <p className="text-xs text-muted-foreground md:col-span-3">{ROLE_LABEL[newRole]}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Accordé le</TableHead>
                {isOwner && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(admins as any[]).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell><Badge variant="outline">{a.role}</Badge></TableCell>
                  <TableCell>
                    {a.is_active
                      ? <Badge className="bg-emerald-600 text-white">Actif</Badge>
                      : <Badge variant="destructive">Révoqué</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.granted_at ? format(new Date(a.granted_at), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      {a.is_active && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToRevoke(a)}>
                          Révoquer
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!toRevoke} onOpenChange={(v) => !v && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer {toRevoke?.email} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'accès à la console de super administration sera immédiatement retiré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { revoke.mutate(toRevoke.id); setToRevoke(null); }}
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
