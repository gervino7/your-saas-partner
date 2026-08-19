import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrgDiagnostic, useFixOrg, useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import AssignGradeDialog from '@/components/superadmin/AssignGradeDialog';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

const VOLUME_LABELS: [string, string][] = [
  ['users', 'Utilisateurs'],
  ['missions', 'Missions'],
  ['projects', 'Projets'],
  ['tasks', 'Tâches'],
  ['clients', 'Clients'],
  ['documents', 'Documents'],
  ['time_entries', 'Saisies de temps'],
  ['portal_users', 'Comptes clients'],
];

interface Props {
  orgId: string;
  members: any[];
}

export default function OrgDiagnosticTab({ orgId, members }: Props) {
  const { data, isLoading } = useOrgDiagnostic(orgId);
  const { canManage } = useIsPlatformAdmin();
  const fix = useFixOrg();
  const [gradeOpen, setGradeOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ action: string; title: string; body: string } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const hc = data.health_checks ?? {};
  const n = (k: string) => Number(hc[k] ?? 0);
  const usersWithoutGrade = (members ?? []).filter((m: any) => !m.grade || m.grade_level === null);

  const checks = [
    {
      label: 'Grades des collaborateurs',
      ok: n('users_without_grade') === 0,
      problem: `${n('users_without_grade')} collaborateur(s) sans grade - ils ne verront aucune mission`,
      fix: canManage ? { label: 'Attribuer un grade', run: () => setGradeOpen(true) } : null,
    },
    {
      label: 'Directeurs de mission',
      ok: n('missions_without_director') === 0,
      problem: `${n('missions_without_director')} mission(s) sans directeur - la validation est bloquée`,
      fix: null,
    },
    {
      label: 'Chefs de projet',
      ok: n('projects_without_lead') === 0,
      problem: `${n('projects_without_lead')} projet(s) sans chef - les travaux ne peuvent pas être validés`,
      fix: null,
    },
    {
      label: 'Rattachement des missions',
      ok: n('orphan_records') === 0,
      problem: `${n('orphan_records')} mission(s) sans organisation - invisibles pour le cabinet`,
      fix: canManage
        ? {
            label: 'Réparer les enregistrements orphelins',
            run: () =>
              setConfirm({
                action: 'backfill_org_ids',
                title: 'Réparer les enregistrements orphelins',
                body: "Les missions sans organisation dont au moins un membre appartient à ce cabinet lui seront rattachées. L'action est journalisée.",
              }),
          }
        : null,
    },
    {
      label: 'Taux journaliers',
      ok: hc.has_daily_rates === true,
      problem: 'Aucun taux journalier - les coûts affichent 0',
      fix: null,
    },
    {
      label: "Référentiel d'obligations",
      ok: hc.has_obligation_types === true,
      problem: "Référentiel d'obligations non initialisé",
      fix: canManage
        ? {
            label: 'Initialiser les référentiels',
            run: () =>
              setConfirm({
                action: 'seed_referentials',
                title: 'Initialiser les référentiels',
                body: "Les types d'obligations et les pièces attendues standard seront créés pour ce cabinet. Les éléments existants sont conservés.",
              }),
          }
        : null,
    },
  ];

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Contrôles de configuration</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {checks.map((c) => (
            <div key={c.label} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              {c.ok
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                : <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
              <span className="text-sm font-medium">{c.label}</span>
              <span className={c.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
                {c.ok ? 'Conforme' : c.problem}
              </span>
              {!c.ok && c.fix && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={c.fix.run} disabled={fix.isPending}>
                  <Wrench className="mr-1.5 h-3.5 w-3.5" /> {c.fix.label}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Volumétrie</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VOLUME_LABELS.map(([key, label]) => (
            <div key={key} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{Number(data.volumes?.[key] ?? 0).toLocaleString('fr-FR')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Connexions récentes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collaborateur</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_logins.map((u: any, i: number) => (
                <TableRow key={`${u.email}-${i}`} className="h-11">
                  <TableCell className="font-medium">
                    {u.full_name || 'Sans nom'}
                    <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    {u.grade
                      ? <Badge variant="outline">{u.grade}</Badge>
                      : <Badge variant="destructive">Sans grade</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.last_seen_at
                      ? format(new Date(u.last_seen_at), 'dd/MM/yyyy HH:mm')
                      : <span className="text-muted-foreground">Jamais connecté</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activité récente</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date</TableHead>
                <TableHead>Collaborateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_activity.map((a: any, i: number) => (
                <Fragment key={i}>
                  <TableRow className="h-11 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
                    <TableCell className="text-sm">
                      {a.created_at ? format(new Date(a.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{a.user_name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{a.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.entity_type ?? '-'}</TableCell>
                    <TableCell>
                      {expanded === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                  </TableRow>
                  {expanded === i && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/40">
                        <pre className="overflow-x-auto text-xs">{JSON.stringify(a.metadata ?? {}, null, 2)}</pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignGradeDialog open={gradeOpen} onOpenChange={setGradeOpen} orgId={orgId} users={usersWithoutGrade} />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) fix.mutate({ _org_id: orgId, _action: confirm.action });
                setConfirm(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
