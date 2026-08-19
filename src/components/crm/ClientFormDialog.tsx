import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateClient } from '@/hooks/useCRM';
import { Info, User, MapPin } from 'lucide-react';

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider pb-2 mb-3 border-b border-amber-200/60 dark:border-amber-800/30 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ClientFormDialog({ open, onOpenChange }: Props) {
  const create = useCreateClient();
  const [form, setForm] = useState({ name: '', industry: '', contact_name: '', contact_email: '', contact_phone: '', address: '', city: '', country: 'CI', notes: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync(form);
    onOpenChange(false);
    setForm({ name: '', industry: '', contact_name: '', contact_email: '', contact_phone: '', address: '', city: '', country: 'CI', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <SectionHeader icon={Info} label="Informations générales" />
            <div className="space-y-3">
              <div><Label>Nom de l'entreprise *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div><Label>Secteur</Label><Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
                <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader icon={User} label="Contact principal" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div><Label>Nom</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
            </div>
          </div>

          <div>
            <SectionHeader icon={MapPin} label="Adresse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 -mb-5 mt-1 px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" className="h-9 px-5" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? 'Création…' : 'Créer le client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
