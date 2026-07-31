import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useClientFiscalProfile, useUpsertFiscalProfile,
  useObligationTypes, useClientObligations, useToggleClientObligation,
  useOrgCollaborators,
} from '@/hooks/useObligations';
import { useEcheancier } from '@/hooks/useObligations';
import { REGIMES, PERIODICITE_LABELS, TAXPAYER_CATEGORIES } from '@/lib/obligations';
import { useAuthStore } from '@/stores/authStore';
import { format, addDays } from 'date-fns';
import EcheancierTable from './EcheancierTable';

const FORME_JURIDIQUE = ['SA', 'SARL', 'SAS', 'SASU', 'EI', 'SCI', 'Association', 'Autre'];

const TVA_PERIOD = [
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'trimestrielle', label: 'Trimestrielle' },
  { value: 'aucune', label: 'Aucune' },
];

interface Props {
  clientId: string;
}

const ClientFiscalTab = ({ clientId }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const isResponsable = (profile?.grade_level ?? 8) <= 3;

  const { data: fp } = useClientFiscalProfile(clientId);
  const upsertFp = useUpsertFiscalProfile();
  const { data: types = [] } = useObligationTypes();
  const { data: subs = [] } = useClientObligations(clientId);
  const toggle = useToggleClientObligation();
  const { data: collabs = [] } = useOrgCollaborators();

  const form = useForm<Record<string, any>>({ defaultValues: {} });

  useEffect(() => {
    if (fp) form.reset(fp);
  }, [fp, form]);

  const values = form.watch();
  const assujettiTva = values.assujetti_tva;

  const submit = form.handleSubmit((v) => {
    upsertFp.mutate({
      id: fp?.id,
      client_id: clientId,
      numero_contribuable: v.numero_contribuable || null,
      registre_commerce: v.registre_commerce || null,
      forme_juridique: v.forme_juridique || null,
      regime_fiscal: v.regime_fiscal || null,
      centre_impots: v.centre_impots || null,
      taxpayer_category: v.taxpayer_category || null,
      assujetti_tva: !!v.assujetti_tva,
      tva_periodicite: v.assujetti_tva ? (v.tva_periodicite || null) : 'aucune',
      exercice_start_month: v.exercice_start_month ? Number(v.exercice_start_month) : 1,
      exercice_end_month: v.exercice_end_month ? Number(v.exercice_end_month) : 12,
      date_cloture: v.date_cloture || null,
      collaborateur_id: v.collaborateur_id || null,
      date_entree_portefeuille: v.date_entree_portefeuille || null,
      is_active: v.is_active !== false,
      notes: v.notes || null,
    });
  });

  const subMap = new Map(subs.map((s: any) => [s.obligation_type_id, s]));

  return (
    <div className="space-y-6">
      {/* Section 1: Identité fiscale */}
      <Card>
        <CardHeader><CardTitle>Identité fiscale</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Numéro contribuable (NCC)</Label>
              <Input {...form.register('numero_contribuable')} disabled={!isResponsable} />
            </div>
            <div>
              <Label>Registre de commerce (RCCM)</Label>
              <Input {...form.register('registre_commerce')} disabled={!isResponsable} />
            </div>
            <div>
              <Label>Forme juridique</Label>
              <Select value={values.forme_juridique ?? ''} onValueChange={(v) => form.setValue('forme_juridique', v)} disabled={!isResponsable}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {FORME_JURIDIQUE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Régime fiscal</Label>
              <Select value={values.regime_fiscal ?? ''} onValueChange={(v) => form.setValue('regime_fiscal', v)} disabled={!isResponsable}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {REGIMES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Le régime fiscal détermine les obligations applicables.</p>
            </div>
            <div>
              <Label>Centre des impôts</Label>
              <Input {...form.register('centre_impots')} disabled={!isResponsable} />
            </div>
            <div>
              <Label>Catégorie contribuable</Label>
              <Select value={values.taxpayer_category ?? ''} onValueChange={(v) => form.setValue('taxpayer_category', v)} disabled={!isResponsable}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {TAXPAYER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={!!values.assujetti_tva}
                onCheckedChange={(v) => form.setValue('assujetti_tva', v)}
                disabled={!isResponsable}
              />
              <Label>Assujetti TVA</Label>
            </div>
            {assujettiTva && (
              <div>
                <Label>TVA — Périodicité</Label>
                <Select value={values.tva_periodicite ?? ''} onValueChange={(v) => form.setValue('tva_periodicite', v)} disabled={!isResponsable}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {TVA_PERIOD.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Exercice — début (mois)</Label>
              <Select value={String(values.exercice_start_month ?? 1)} onValueChange={(v) => form.setValue('exercice_start_month', Number(v))} disabled={!isResponsable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exercice — fin (mois)</Label>
              <Select value={String(values.exercice_end_month ?? 12)} onValueChange={(v) => form.setValue('exercice_end_month', Number(v))} disabled={!isResponsable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de clôture</Label>
              <Input placeholder="31/12" {...form.register('date_cloture')} disabled={!isResponsable} />
            </div>
            <div>
              <Label>Collaborateur responsable</Label>
              <Select value={values.collaborateur_id ?? ''} onValueChange={(v) => form.setValue('collaborateur_id', v)} disabled={!isResponsable}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'entrée en portefeuille</Label>
              <Input type="date" {...form.register('date_entree_portefeuille')} disabled={!isResponsable} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={values.is_active !== false}
                onCheckedChange={(v) => form.setValue('is_active', v)}
                disabled={!isResponsable}
              />
              <Label>Dossier actif</Label>
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} {...form.register('notes')} disabled={!isResponsable} />
            </div>
            {isResponsable && (
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={upsertFp.isPending}>Enregistrer</Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Obligations souscrites */}
      <Card>
        <CardHeader><CardTitle>Obligations souscrites</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {types.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun type d'obligation configuré. Consultez les paramètres.</p>
          )}
          {types.map((t: any) => {
            const sub: any = subMap.get(t.id);
            const notApplicable = t.applies_to_regimes
              && values.regime_fiscal
              && !t.applies_to_regimes.includes(values.regime_fiscal);
            const isActive = !!sub?.is_active;
            return (
              <div
                key={t.id}
                className={`flex flex-wrap items-center gap-3 p-3 rounded border ${notApplicable ? 'opacity-50 bg-muted/30' : 'bg-background'}`}
                title={notApplicable ? `Non applicable au régime ${values.regime_fiscal}` : undefined}
              >
                <Switch
                  checked={isActive}
                  disabled={!isResponsable || notApplicable}
                  onCheckedChange={(v) => toggle.mutate({
                    id: sub?.id,
                    client_id: clientId,
                    obligation_type_id: t.id,
                    is_active: v,
                    responsible_id: sub?.responsible_id ?? values.collaborateur_id ?? null,
                    custom_deadline_day: sub?.custom_deadline_day ?? null,
                  })}
                />
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.code}</div>
                </div>
                <Badge variant="outline">{PERIODICITE_LABELS[t.periodicite] ?? t.periodicite}</Badge>
                {isActive && (
                  <>
                    <Select
                      value={sub?.responsible_id ?? ''}
                      onValueChange={(v) => toggle.mutate({
                        id: sub?.id, client_id: clientId, obligation_type_id: t.id,
                        is_active: true, responsible_id: v,
                        custom_deadline_day: sub?.custom_deadline_day ?? null,
                      })}
                      disabled={!isResponsable}
                    >
                      <SelectTrigger className="w-48"><SelectValue placeholder="Responsable" /></SelectTrigger>
                      <SelectContent>
                        {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={1} max={31}
                      className="w-24"
                      placeholder="Défaut"
                      defaultValue={sub?.custom_deadline_day ?? ''}
                      disabled={!isResponsable}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        if (val !== (sub?.custom_deadline_day ?? null)) {
                          toggle.mutate({
                            id: sub?.id, client_id: clientId, obligation_type_id: t.id,
                            is_active: true,
                            responsible_id: sub?.responsible_id ?? null,
                            custom_deadline_day: val,
                          });
                        }
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section 3: Échéances client */}
      <Card>
        <CardHeader><CardTitle>Échéances du client</CardTitle></CardHeader>
        <CardContent className="p-0">
          <EcheancierTable clientId={clientId} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientFiscalTab;
