import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUpsertPlan } from '@/hooks/usePlans';
import type { Plan } from '@/lib/plans';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
  orgsUsingPlan: number;
}

const cleanCode = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]+/g, '_').slice(0, 30);

export default function PlanFormDialog({ open, onOpenChange, plan, orgsUsingPlan }: Props) {
  const upsert = useUpsertPlan();
  const isEdit = !!plan;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxMissions, setMaxMissions] = useState<string>('');
  const [maxStorage, setMaxStorage] = useState(2);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureDraft, setFeatureDraft] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(plan?.code ?? '');
    setName(plan?.name ?? '');
    setDescription(plan?.description ?? '');
    setPrice(plan?.price_monthly ?? 0);
    setMaxUsers(plan?.max_users ?? 5);
    setMaxMissions(plan?.max_missions === null || plan?.max_missions === undefined ? '' : String(plan.max_missions));
    setMaxStorage(plan?.max_storage_gb ?? 2);
    setFeatures(plan?.features ?? []);
    setFeatureDraft('');
    setIsActive(plan?.is_active ?? true);
    setIsPublic(plan?.is_public ?? true);
  }, [open, plan]);

  const addFeature = () => {
    const v = featureDraft.trim();
    if (!v) return;
    setFeatures([...features, v]);
    setFeatureDraft('');
  };

  const submit = () => {
    if (!code || !name) return;
    upsert.mutate(
      {
        _code: code,
        _name: name.trim(),
        _price_monthly: Number(price) || 0,
        _max_users: Number(maxUsers) || 1,
        _max_missions: maxMissions.trim() === '' ? null : Number(maxMissions),
        _max_storage_gb: Number(maxStorage) || 1,
        _features: features,
        _description: description.trim() || null,
        _is_active: isActive,
        _is_public: isPublic,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifier le plan — ${plan?.name}` : 'Créer un plan'}</DialogTitle>
          <DialogDescription>
            Les plans sont lus en base : aucune mise en production n'est nécessaire pour changer un tarif.
          </DialogDescription>
        </DialogHeader>

        {isEdit && orgsUsingPlan > 0 && (
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              {orgsUsingPlan} organisation(s) utilisent ce plan. La modification s'appliquera à leur prochaine facturation.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              disabled={isEdit}
              onChange={(e) => setCode(cleanCode(e.target.value))}
              placeholder="starter"
            />
            <p className="text-xs text-muted-foreground">Minuscules, sans espace. Non modifiable après création.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Starter" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Prix mensuel (FCFA)</Label>
            <Input id="price" type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="users">Utilisateurs max</Label>
            <Input id="users" type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="missions">Missions max</Label>
            <Input
              id="missions"
              type="number"
              min={0}
              value={maxMissions}
              onChange={(e) => setMaxMissions(e.target.value)}
              placeholder="Vide = illimité"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storage">Stockage max (Go)</Label>
            <Input id="storage" type="number" min={1} value={maxStorage} onChange={(e) => setMaxStorage(Number(e.target.value))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fonctionnalités affichées aux clients</Label>
          <div className="flex gap-2">
            <Input
              value={featureDraft}
              onChange={(e) => setFeatureDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
              placeholder="Ex. Espace client"
            />
            <Button type="button" variant="outline" onClick={addFeature}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {features.map((f, i) => (
              <li key={`${f}-${i}`} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                <span>{f}</span>
                <button
                  type="button"
                  onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="active">Actif</Label>
              <p className="text-xs text-muted-foreground">Plan utilisable par les organisations</p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="public">Public</Label>
              <p className="text-xs text-muted-foreground">Visible sur la page des tarifs</p>
            </div>
            <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!code || !name || upsert.isPending}>
            {isEdit ? 'Enregistrer' : 'Créer le plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
