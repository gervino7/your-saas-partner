import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgDetail, useUpdateOrg, useToggleOrg, useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import PlanChangeDialog from '@/components/superadmin/PlanChangeDialog';
import SuspendDialog from '@/components/superadmin/SuspendDialog';
import { formatFcfa } from '@/lib/plans';
import { usePlans } from '@/hooks/usePlans';
import OrgDiagnosticTab from '@/components/superadmin/OrgDiagnosticTab';
import { planByCode, barClass } from '@/lib/superAdmin';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';

const UsageCard = ({ label, used, max, unit = '' }: { label: string; used: number; max?: number | null; unit?: string }) => {
  const pct = max && max > 0 ? (used / max) * 100 : 0;
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">
          {used}{unit} {max ? <span className="text-sm font-normal text-muted-foreground">/ {max}{unit}</span> : null}
        </p>
        {!!max && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full', barClass(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function OrganisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useOrgDetail(id);
  const { data: plans = [] } = usePlans();
  const { canManage } = useIsPlatformAdmin();
  const updateOrg = useUpdateOrg();
  const toggleOrg = useToggleOrg();
  const [planOpen, setPlanOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const org = data?.organization ?? {};
  const usage = data?.usage ?? {};

  const [form, setForm] = useState({
    billing_email: '', billing_contact: '', phone: '', country: '', city: '', trial_ends_at: '', internal_notes: '',
  });

  useEffect(() => {
    if (org?.id) {
      setForm({
        billing_email: org.billing_email ?? '',
        billing_contact: org.billing_contact ?? '',
        phone: org.phone ?? '',
        country: org.country ?? '',
        city: org.city ?? '',
        trial_ends_at: org.trial_ends_at ?? '',
        internal_notes: org.internal_notes ?? '',
      });
    }
  }, [org?.id, org?.billing_email, org?.billing_contact, org?.phone, org?.country, org?.city, org?.trial_ends_at, org?.internal_notes]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const plan = planByCode(plans, org.subscription_plan);
  const storageMb = Number(usage.storage_used_mb ?? 0);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/organisations')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Organisations
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-muted-foreground">{org.slug}</p>
        </div>
        <Badge variant="outline">{plan?.name ?? org.subscription_plan}</Badge>
        {org.is_active === false
          ? <Badge variant="destructive">Suspendue</Badge>
          : <Badge className="bg-emerald-600 text-white">Active</Badge>}
        {org.created_at && (
          <span className="text-xs text-muted-foreground">
            Membre depuis {format(new Date(org.created_at), 'dd MMMM yyyy', { locale: fr })}
          </span>
        )}
      </div>

      <Tabs defaultValue={searchParams.get('tab') ?? 'overview'}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
          {canManage && <TabsTrigger value="actions">Actions</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <UsageCard label="Utilisateurs" used={Number(usage.users ?? 0)} max={Number(org.max_users ?? 0)} />
            <UsageCard label="Missions" used={Number(usage.missions ?? 0)} />
            <UsageCard label="Projets" used={Number(usage.projects ?? 0)} />
            <UsageCard label="Clients" used={Number(usage.clients ?? 0)} />
            <UsageCard label="Documents" used={Number(usage.documents ?? 0)} />
            <UsageCard label="Stockage (Go)" used={Number((storageMb / 1024).toFixed(2))} max={Number(org.max_storage_gb ?? 0)} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Fiche administrative</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {([
                ['billing_email', 'Email de facturation'],
                ['billing_contact', 'Contact facturation'],
                ['phone', 'Téléphone'],
                ['country', 'Pays'],
                ['city', 'Ville'],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    value={(form as any)[key]}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Fin d'essai</Label>
                <Input
                  type="date"
                  value={form.trial_ends_at ?? ''}
                  disabled={!canManage}
                  onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes internes</Label>
                <p className="text-xs text-muted-foreground">Visible uniquement par l'équipe plateforme</p>
                <Textarea
                  rows={4}
                  value={form.internal_notes}
                  disabled={!canManage}
                  onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                />
              </div>
              {canManage && (
                <div className="sm:col-span-2">
                  <Button
                    onClick={() =>
                      updateOrg.mutate({
                        _org_id: id!,
                        _billing_email: form.billing_email || null,
                        _billing_contact: form.billing_contact || null,
                        _phone: form.phone || null,
                        _country: form.country || null,
                        _city: form.city || null,
                        _trial_ends_at: form.trial_ends_at || null,
                        _internal_notes: form.internal_notes || null,
                      })
                    }
                    disabled={updateOrg.isPending}
                  >
                    Enregistrer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Identités et rôles uniquement. Les données métier du cabinet ne sont pas accessibles depuis cette console.
          </p>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>En ligne</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(data?.members ?? [])]
                    .sort((a: any, b: any) => (a.grade_level ?? 9) - (b.grade_level ?? 9))
                    .map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                        <TableCell><Badge variant="outline">{m.grade}</Badge></TableCell>
                        <TableCell>
                          {m.is_online
                            ? <Badge className="bg-emerald-600 text-white">En ligne</Badge>
                            : <span className="text-xs text-muted-foreground">Hors ligne</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.last_login_at ? format(new Date(m.last_login_at), 'dd/MM/yyyy HH:mm') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Plan actuel</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xl font-bold">{plan?.name ?? org.subscription_plan}</p>
              <p className="text-sm text-muted-foreground">{formatFcfa(plan?.price_monthly ?? 0)}</p>
              <p className="text-sm">
                {org.max_users} utilisateurs · {org.max_storage_gb} Go de stockage
              </p>
              {canManage && <Button onClick={() => setPlanOpen(true)}>Changer le plan</Button>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Historique des plans</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Changement</TableHead>
                    <TableHead>Modifié par</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.plan_history ?? []).map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">{h.created_at ? format(new Date(h.created_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                      <TableCell className="text-sm">{h.old_plan ?? '—'} → <strong>{h.new_plan}</strong></TableCell>
                      <TableCell className="text-sm">{h.changed_by_email ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostic">
          <OrgDiagnosticTab orgId={id!} members={data?.members ?? []} />
        </TabsContent>

        {canManage && (
          <TabsContent value="actions" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Statut du compte</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {org.is_active === false ? (
                  <>
                    <p className="text-sm">
                      Suspendue {org.suspended_at ? `le ${format(new Date(org.suspended_at), 'dd/MM/yyyy')}` : ''} —{' '}
                      <span className="text-muted-foreground">{org.suspension_reason}</span>
                    </p>
                    <Button onClick={() => toggleOrg.mutate({ _org_id: id!, _activate: true })}>Réactiver</Button>
                  </>
                ) : (
                  <Button variant="destructive" onClick={() => setSuspendOpen(true)}>Suspendre l'organisation</Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <PlanChangeDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        org={{ id: id!, name: org.name, subscription_plan: org.subscription_plan, user_count: usage.users, storage_used_mb: storageMb }}
      />
      <SuspendDialog open={suspendOpen} onOpenChange={setSuspendOpen} org={{ id: id!, name: org.name }} />
    </div>
  );
}
