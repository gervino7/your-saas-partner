import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Building2, User as UserIcon, CreditCard, CheckCircle2 } from 'lucide-react';
import { PLANS, PLAN_ORDER, PlanId, formatFcfa } from '@/lib/plans';
import { useToast } from '@/hooks/use-toast';

const SECTORS = ['Cabinet d\'audit', 'Cabinet de conseil', 'Bureau d\'études', 'Expertise comptable', 'Autre'];

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

const STEPS = [
  { id: 1, label: 'Organisation', icon: Building2 },
  { id: 2, label: 'Profil', icon: UserIcon },
  { id: 3, label: 'Abonnement', icon: CreditCard },
  { id: 4, label: 'Confirmation', icon: CheckCircle2 },
];

type CreatedOrganization = { id: string };

type CreateOrganizationRpc = (
  fn: 'create_organization_for_current_user',
  args: {
    _name: string;
    _slug: string;
    _subscription_plan: PlanId;
    _max_users: number;
    _max_storage_gb: number;
    _settings: { sector: string; country: string; city: string };
    _full_name: string;
    _phone: string | null;
  }
) => Promise<{ data: CreatedOrganization | CreatedOrganization[] | null; error: { message: string } | null }>;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, setProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [country, setCountry] = useState('Côte d\'Ivoire');
  const [city, setCity] = useState('');

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('Directeur Associé');

  const [planId, setPlanId] = useState<PlanId>('free');

  const slug = slugify(orgName);

  const submit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const plan = PLANS[planId];
      const { data: createdOrg, error: orgErr } = await (supabase.rpc as unknown as CreateOrganizationRpc).call(
        supabase,
        'create_organization_for_current_user',
        {
        _name: orgName.trim(),
        _slug: slug,
        _subscription_plan: planId,
        _max_users: plan.maxUsers,
        _max_storage_gb: plan.maxStorageGb,
        _settings: { sector, country, city },
        _full_name: fullName.trim(),
        _phone: phone.trim() || null,
        }
      );
      if (orgErr) throw orgErr;

      const org = Array.isArray(createdOrg) ? createdOrg[0] : createdOrg;
      if (!org?.id) throw new Error('Organisation créée mais réponse invalide');

      // Force a fresh fetch from DB so grade_level (generated column) and any trigger-driven fields are accurate
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (freshProfile) {
        setProfile(freshProfile);
      } else {
        setProfile({
          id: user.id,
          organization_id: org.id,
          email: user.email || profile?.email || '',
          full_name: fullName.trim(),
          avatar_url: profile?.avatar_url ?? null,
          phone: phone.trim() || null,
          grade: 'DA',
          grade_level: 1,
          is_online: profile?.is_online ?? true,
        });
      }

      // Récupère le slug réel généré côté DB (peut différer si collision)
      const { data: orgFull } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_plan, max_users, max_storage_gb')
        .eq('id', org.id)
        .maybeSingle();

      const finalSlug = orgFull?.slug || slug;

      // Envoie l'email de bienvenue avec l'URL personnalisée (best-effort)
      try {
        await supabase.functions.invoke('send-org-welcome', {
          body: {
            email: user.email,
            fullName: fullName.trim(),
            organizationName: orgFull?.name || orgName,
            slug: finalSlug,
            plan: orgFull?.subscription_plan || planId,
            maxUsers: orgFull?.max_users || plan.maxUsers,
            maxStorageGb: orgFull?.max_storage_gb || plan.maxStorageGb,
          },
        });
      } catch (mailErr) {
        console.warn('send-org-welcome failed', mailErr);
      }

      const orgUrl = `${window.location.origin}/org/${finalSlug}`;
      toast({
        title: 'Organisation créée 🎉',
        description: `Votre URL : ${orgUrl} — un email récapitulatif vous a été envoyé.`,
      });
      navigate('/', { replace: true });
      const message = e instanceof Error ? e.message : 'Impossible de créer l\'organisation';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const canNext =
    (step === 1 && orgName.trim().length >= 2 && sector) ||
    (step === 2 && fullName.trim().length >= 2) ||
    (step === 3 && !!planId) ||
    step === 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done ? 'bg-primary border-primary text-primary-foreground' :
                      active ? 'border-primary text-primary' : 'border-muted text-muted-foreground'
                    }`}>
                      {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs mt-2 ${active || done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 ${done ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Créer votre organisation</CardTitle>
                <CardDescription>Commencez par les informations de base de votre cabinet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nom de l'organisation *</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="D&G Conseil" />
                  {orgName && <p className="text-xs text-muted-foreground mt-1">URL: /{slug}</p>}
                </div>
                <div>
                  <Label>Secteur</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Pays</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
                  <div><Label>Ville</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Abidjan" /></div>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Votre profil</CardTitle>
                <CardDescription>En tant que créateur, vous êtes Directeur Associé.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Nom complet *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 ..." /></div>
                <div><Label>Poste</Label><Input value={position} onChange={(e) => setPosition(e.target.value)} /></div>
                <div className="flex items-center gap-2 pt-2">
                  <Label>Grade :</Label>
                  <Badge>DA — Directeur Associé</Badge>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Choisir votre plan</CardTitle>
                <CardDescription>Vous pourrez changer de plan à tout moment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLAN_ORDER.map((pid) => {
                    const p = PLANS[pid];
                    const selected = planId === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setPlanId(pid)}
                        className={`text-left rounded-lg border-2 p-4 transition-all ${
                          selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{p.name}</h3>
                            <p className="text-sm text-muted-foreground">{formatFcfa(p.price)}</p>
                          </div>
                          {selected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {p.features.map((f) => <li key={f}>• {f}</li>)}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Confirmation</CardTitle>
                <CardDescription>Vérifiez les informations avant de créer votre organisation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Organisation</span><span className="font-medium">{orgName}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Secteur</span><span>{sector}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Pays / Ville</span><span>{country} / {city || '—'}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Nom complet</span><span>{fullName}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Téléphone</span><span>{phone || '—'}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Poste</span><span>{position}</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Grade</span><span>DA — Directeur Associé</span></div>
                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Plan</span><span className="font-medium">{PLANS[planId].name} — {formatFcfa(PLANS[planId].price)}</span></div>
              </CardContent>
            </>
          )}

          <div className="flex justify-between p-6 pt-0">
            <Button variant="outline" disabled={step === 1 || loading} onClick={() => setStep(step - 1)}>
              Précédent
            </Button>
            {step < 4 ? (
              <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Suivant</Button>
            ) : (
              <Button disabled={loading} onClick={submit}>
                {loading ? 'Création...' : 'Créer mon organisation'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;
