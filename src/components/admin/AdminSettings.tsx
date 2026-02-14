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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useOrganization, useUpdateOrganization, useUpdateOrgSettings } from '@/hooks/useAdmin';
import { Building2, Shield, Briefcase, FileText, Mail, Bell, Clock, Receipt, CreditCard, Save, Check, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

  // Logo upload
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Notifications
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);

  // Mission & Project numbering
  const [missionFormat, setMissionFormat] = useState('MIS-{YYYY}-{NNN}');
  const [projectFormat, setProjectFormat] = useState('PRJ-{YYYY}-{NNN}');

  // Plan dialog
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  useEffect(() => {
    if (org) {
      setLogoUrl(org.logo_url ?? null);
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
      setMissionFormat(settings.mission_code_format ?? 'MIS-{YYYY}-{NNN}');
      setProjectFormat(settings.project_code_format ?? 'PRJ-{YYYY}-{NNN}');
    }
  }, [org]);

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${org.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from('org-assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('org-assets').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', org.id);
      setLogoUrl(publicUrl);
      toast.success('Logo mis à jour.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!org) return;
    await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id);
    setLogoUrl(null);
    toast.success('Logo supprimé.');
  };

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

          <div>
            <Label>Logo du cabinet</Label>
            <div className="flex items-center gap-4 mt-2">
              <Avatar className="h-16 w-16 rounded-lg border">
                {logoUrl ? <AvatarImage src={logoUrl} alt="Logo" /> : null}
                <AvatarFallback className="rounded-lg text-lg">{orgName?.charAt(0) || 'O'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <label className="cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {uploading ? 'Envoi…' : 'Changer le logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </Button>
                  {logoUrl && (
                    <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                      <X className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Max 2 Mo.</p>
              </div>
            </div>
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
        <SettingsSection title="Missions & Projets" description="Configuration de la numérotation des missions et projets." icon={Briefcase}
          onSave={() => updateSettings.mutate({ mission_code_format: missionFormat, project_code_format: projectFormat })} saving={updateSettings.isPending}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Format numérotation des missions</Label>
              <Input value={missionFormat} onChange={(e) => setMissionFormat(e.target.value)} placeholder="MIS-{YYYY}-{NNN}" />
              <p className="text-xs text-muted-foreground mt-1">Ex: MIS-2026-001. Variables : {'{YYYY}'}, {'{YY}'}, {'{NNN}'}, {'{NNNN}'}</p>
            </div>
            <div>
              <Label>Format numérotation des projets</Label>
              <Input value={projectFormat} onChange={(e) => setProjectFormat(e.target.value)} placeholder="PRJ-{YYYY}-{NNN}" />
              <p className="text-xs text-muted-foreground mt-1">Ex: PRJ-2026-001. Variables : {'{YYYY}'}, {'{YY}'}, {'{NNN}'}, {'{NNNN}'}</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Aperçu :</p>
            <p>Mission : <span className="font-mono text-foreground">{missionFormat.replace('{YYYY}', '2026').replace('{YY}', '26').replace('{NNNN}', '0001').replace('{NNN}', '001')}</span></p>
            <p>Projet : <span className="font-mono text-foreground">{projectFormat.replace('{YYYY}', '2026').replace('{YY}', '26').replace('{NNNN}', '0001').replace('{NNN}', '001')}</span></p>
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
            <Button variant="outline" size="sm" onClick={() => setShowPlanDialog(true)}>Changer de plan</Button>
          </CardContent>
        </Card>

        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Changer de plan</DialogTitle>
              <DialogDescription>Choisissez le plan adapté à votre cabinet.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[
                { name: 'Starter', price: '49 000', users: 5, missions: 3, emails: 100 },
                { name: 'Pro', price: '149 000', users: 15, missions: 10, emails: 500 },
                { name: 'Business', price: '299 000', users: 50, missions: '∞', emails: 2000 },
              ].map((plan) => {
                const current = (org?.subscription_plan || 'starter').toLowerCase() === plan.name.toLowerCase();
                return (
                  <Card key={plan.name} className={current ? 'border-primary ring-2 ring-primary/20' : ''}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {plan.name}
                        {current && <Badge variant="secondary" className="text-[10px]">Actuel</Badge>}
                      </CardTitle>
                      <p className="text-lg font-bold">{plan.price} <span className="text-xs font-normal text-muted-foreground">FCFA/mois</span></p>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" />{plan.users} utilisateurs</div>
                      <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" />{plan.missions} missions</div>
                      <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" />{plan.emails} emails/mois</div>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        variant={current ? 'outline' : 'default'}
                        disabled={current}
                        onClick={() => {
                          toast.info('Contactez-nous à support@missionflow.ci pour changer de plan.');
                          setShowPlanDialog(false);
                        }}
                      >
                        {current ? 'Plan actuel' : 'Sélectionner'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Pour le plan Enterprise (illimité), contactez-nous à <span className="font-medium">support@missionflow.ci</span>
            </p>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
