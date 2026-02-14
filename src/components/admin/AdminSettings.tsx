import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOrganization, useUpdateOrganization, useUpdateOrgSettings } from '@/hooks/useAdmin';
import { Building2, Shield, Briefcase, FileText, Mail, Bell, Clock, Receipt, CreditCard, Save } from 'lucide-react';
import { toast } from 'sonner';

function SettingsSection({ title, description, icon: Icon, children, onSave, saving }: {
  title: string; description: string; icon: any; children: React.ReactNode; onSave: () => void; saving?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} size="sm"><Save className="h-4 w-4 mr-1" /> Enregistrer</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const updateSettings = useUpdateOrgSettings();
  const settings = (org?.settings as Record<string, any>) ?? {};

  // Organization
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Security
  const [minPwdLen, setMinPwdLen] = useState(8);
  const [sessionDuration, setSessionDuration] = useState(7);
  const [mfaRequired, setMfaRequired] = useState(false);

  // Documents
  const [maxUploadMb, setMaxUploadMb] = useState(50);
  const [retentionMonths, setRetentionMonths] = useState(60);

  // Timesheets
  const [stdHoursPerDay, setStdHoursPerDay] = useState(8);
  const [timesheetReminders, setTimesheetReminders] = useState(true);

  // Billing
  const [defaultTva, setDefaultTva] = useState(18);
  const [invoicePrefix, setInvoicePrefix] = useState('FAC');

  // Notifications
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);

  useEffect(() => {
    if (org) {
      setOrgName(org.name ?? '');
      setOrgSlug(org.slug ?? '');
      setMinPwdLen(settings.min_password_length ?? 8);
      setSessionDuration(settings.session_duration_days ?? 7);
      setMfaRequired(settings.mfa_required ?? false);
      setMaxUploadMb(settings.max_upload_mb ?? 50);
      setRetentionMonths(settings.retention_months ?? 60);
      setStdHoursPerDay(settings.std_hours_per_day ?? 8);
      setTimesheetReminders(settings.timesheet_reminders ?? true);
      setDefaultTva(settings.default_tva ?? 18);
      setInvoicePrefix(settings.invoice_prefix ?? 'FAC');
      setNotifInApp(settings.notif_in_app ?? true);
      setNotifEmail(settings.notif_email ?? true);
    }
  }, [org]);

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <Tabs defaultValue="org">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="org" className="text-xs"><Building2 className="h-3 w-3 mr-1" /> Organisation</TabsTrigger>
        <TabsTrigger value="security" className="text-xs"><Shield className="h-3 w-3 mr-1" /> Sécurité</TabsTrigger>
        <TabsTrigger value="missions" className="text-xs"><Briefcase className="h-3 w-3 mr-1" /> Missions</TabsTrigger>
        <TabsTrigger value="documents" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Documents</TabsTrigger>
        <TabsTrigger value="notifications" className="text-xs"><Bell className="h-3 w-3 mr-1" /> Notifications</TabsTrigger>
        <TabsTrigger value="timesheets" className="text-xs"><Clock className="h-3 w-3 mr-1" /> Timesheets</TabsTrigger>
        <TabsTrigger value="billing" className="text-xs"><Receipt className="h-3 w-3 mr-1" /> Facturation</TabsTrigger>
        <TabsTrigger value="subscription" className="text-xs"><CreditCard className="h-3 w-3 mr-1" /> Abonnement</TabsTrigger>
      </TabsList>

      <TabsContent value="org" className="mt-6">
        <SettingsSection title="Organisation" description="Informations générales de votre cabinet." icon={Building2}
          onSave={() => updateOrg.mutate({ name: orgName })} saving={updateOrg.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nom du cabinet</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></div>
            <div><Label>Identifiant (slug)</Label><Input value={orgSlug} disabled className="bg-muted" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Devise par défaut</Label>
              <Select defaultValue="XOF">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">FCFA (XOF) — BCEAO</SelectItem>
                  <SelectItem value="XAF">FCFA (XAF) — CEMAC</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar US (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fuseau horaire</Label>
              <Select defaultValue="Africa/Abidjan">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Abidjan">Abidjan (GMT+0)</SelectItem>
                  <SelectItem value="Africa/Douala">Douala (GMT+1)</SelectItem>
                  <SelectItem value="Africa/Dakar">Dakar (GMT+0)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Plan actuel</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{org?.subscription_plan || 'starter'}</Badge>
              <span className="text-xs text-muted-foreground">
                {org?.max_users ?? 5} utilisateurs max · {org?.max_storage_gb ?? 2} Go stockage
              </span>
            </div>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="security" className="mt-6">
        <SettingsSection title="Sécurité" description="Politiques de sécurité et d'accès." icon={Shield}
          onSave={() => updateSettings.mutate({ min_password_length: minPwdLen, session_duration_days: sessionDuration, mfa_required: mfaRequired })}
          saving={updateSettings.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Longueur minimale mot de passe</Label><Input type="number" value={minPwdLen} onChange={(e) => setMinPwdLen(Number(e.target.value))} min={6} max={32} /></div>
            <div><Label>Durée de session (jours)</Label><Input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} min={1} max={30} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} />
            <Label>MFA obligatoire pour les grades DA/DM/CM</Label>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="missions" className="mt-6">
        <SettingsSection title="Missions" description="Configuration des missions et projets." icon={Briefcase}
          onSave={() => updateSettings.mutate({ mission_code_prefix: 'MIS' })} saving={updateSettings.isPending}>
          <div>
            <Label>Format de numérotation</Label>
            <Input defaultValue="MIS-{YYYY}-{NNN}" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">Le format de numérotation automatique des missions.</p>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        <SettingsSection title="Documents" description="Paramètres de la GED." icon={FileText}
          onSave={() => updateSettings.mutate({ max_upload_mb: maxUploadMb, retention_months: retentionMonths })}
          saving={updateSettings.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Taille max upload (Mo)</Label><Input type="number" value={maxUploadMb} onChange={(e) => setMaxUploadMb(Number(e.target.value))} /></div>
            <div><Label>Rétention (mois avant archivage)</Label><Input type="number" value={retentionMonths} onChange={(e) => setRetentionMonths(Number(e.target.value))} /></div>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="notifications" className="mt-6">
        <SettingsSection title="Notifications" description="Canaux et types de notifications." icon={Bell}
          onSave={() => updateSettings.mutate({ notif_in_app: notifInApp, notif_email: notifEmail })}
          saving={updateSettings.isPending}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Notifications in-app</Label>
              <Switch checked={notifInApp} onCheckedChange={setNotifInApp} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Notifications par email</Label>
              <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
            </div>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="timesheets" className="mt-6">
        <SettingsSection title="Timesheets" description="Paramètres de saisie des temps." icon={Clock}
          onSave={() => updateSettings.mutate({ std_hours_per_day: stdHoursPerDay, timesheet_reminders: timesheetReminders })}
          saving={updateSettings.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Heures standard par jour</Label><Input type="number" value={stdHoursPerDay} onChange={(e) => setStdHoursPerDay(Number(e.target.value))} min={1} max={24} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={timesheetReminders} onCheckedChange={setTimesheetReminders} />
            <Label>Rappels automatiques (18h si non saisi)</Label>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="billing" className="mt-6">
        <SettingsSection title="Facturation" description="TVA, templates et numérotation." icon={Receipt}
          onSave={() => updateSettings.mutate({ default_tva: defaultTva, invoice_prefix: invoicePrefix })}
          saving={updateSettings.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>TVA par défaut (%)</Label><Input type="number" value={defaultTva} onChange={(e) => setDefaultTva(Number(e.target.value))} /></div>
            <div><Label>Préfixe de facture</Label><Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} /></div>
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="subscription" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Abonnement</CardTitle>
            </div>
            <CardDescription>Plan actuel et consommation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-sm px-3 py-1">{(org?.subscription_plan || 'starter').toUpperCase()}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Utilisateurs</p>
                <p className="font-semibold">— / {org?.max_users ?? 5}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Stockage</p>
                <p className="font-semibold">— / {org?.max_storage_gb ?? 2} Go</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Missions</p>
                <p className="font-semibold">— / ∞</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Changer de plan</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
