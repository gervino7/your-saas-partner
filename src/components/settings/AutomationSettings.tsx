import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

interface AutomationConfig {
  task_deadline_alert: boolean;
  task_overdue_alert: boolean;
  timesheet_reminder: boolean;
  budget_monitor: boolean;
  mission_completion: boolean;
  deadline_days: number;
  budget_threshold: number;
  timesheet_reminder_hour: number;
}

const defaults: AutomationConfig = {
  task_deadline_alert: true,
  task_overdue_alert: true,
  timesheet_reminder: true,
  budget_monitor: true,
  mission_completion: true,
  deadline_days: 2,
  budget_threshold: 80,
  timesheet_reminder_hour: 18,
};

const AutomationSettings = () => {
  const { profile } = useAuthStore();
  const [config, setConfig] = useState<AutomationConfig>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single()
      .then(({ data }) => {
        const s = data?.settings as any;
        if (s?.automations) {
          setConfig({ ...defaults, ...s.automations });
        }
      });
  }, [profile?.organization_id]);

  const handleSave = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single();
    const currentSettings = (org?.settings as any) || {};
    const { error } = await supabase
      .from('organizations')
      .update({ settings: { ...currentSettings, automations: config } })
      .eq('id', profile.organization_id);
    setSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Automatisations mises à jour");
  };

  const toggle = (key: keyof AutomationConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Automatisations</CardTitle>
        <CardDescription>Configurez les règles automatiques de votre organisation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Alerte deadline proche</Label><p className="text-xs text-muted-foreground">Notification quand une tâche approche de sa date limite.</p></div>
            <Switch checked={config.task_deadline_alert} onCheckedChange={() => toggle('task_deadline_alert')} />
          </div>
          {config.task_deadline_alert && (
            <div className="ml-4 flex items-center gap-2">
              <Label className="text-xs">Jours avant deadline :</Label>
              <Input type="number" min={1} max={7} className="w-20 h-8" value={config.deadline_days} onChange={(e) => setConfig((p) => ({ ...p, deadline_days: +e.target.value }))} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div><Label>Alerte tâche en retard</Label><p className="text-xs text-muted-foreground">Notification et email quand une deadline est dépassée.</p></div>
            <Switch checked={config.task_overdue_alert} onCheckedChange={() => toggle('task_overdue_alert')} />
          </div>

          <div className="flex items-center justify-between">
            <div><Label>Rappel timesheet</Label><p className="text-xs text-muted-foreground">Notification quotidienne si timesheet non saisi.</p></div>
            <Switch checked={config.timesheet_reminder} onCheckedChange={() => toggle('timesheet_reminder')} />
          </div>
          {config.timesheet_reminder && (
            <div className="ml-4 flex items-center gap-2">
              <Label className="text-xs">Heure du rappel :</Label>
              <Input type="number" min={8} max={22} className="w-20 h-8" value={config.timesheet_reminder_hour} onChange={(e) => setConfig((p) => ({ ...p, timesheet_reminder_hour: +e.target.value }))} />
              <span className="text-xs text-muted-foreground">h</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div><Label>Surveillance budget</Label><p className="text-xs text-muted-foreground">Alerte quand le budget d'une mission dépasse le seuil.</p></div>
            <Switch checked={config.budget_monitor} onCheckedChange={() => toggle('budget_monitor')} />
          </div>
          {config.budget_monitor && (
            <div className="ml-4 flex items-center gap-2">
              <Label className="text-xs">Seuil d'alerte :</Label>
              <Input type="number" min={50} max={100} className="w-20 h-8" value={config.budget_threshold} onChange={(e) => setConfig((p) => ({ ...p, budget_threshold: +e.target.value }))} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div><Label>Fin de mission</Label><p className="text-xs text-muted-foreground">Envoyer l'enquête satisfaction et archiver à la fin d'une mission.</p></div>
            <Switch checked={config.mission_completion} onCheckedChange={() => toggle('mission_completion')} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </CardContent>
    </Card>
  );
};

export default AutomationSettings;
