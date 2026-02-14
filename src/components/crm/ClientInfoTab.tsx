import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { useUpdateClient } from '@/hooks/useCRM';

export default function ClientInfoTab({ client }: { client: any }) {
  const update = useUpdateClient();
  const [form, setForm] = useState({
    name: client.name ?? '',
    industry: client.industry ?? '',
    contact_name: client.contact_name ?? '',
    contact_email: client.contact_email ?? '',
    contact_phone: client.contact_phone ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    country: client.country ?? '',
    website: client.website ?? '',
    notes: client.notes ?? '',
  });

  const handleSave = () => {
    update.mutate({ id: client.id, ...form });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Informations générales</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={update.isPending}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Raison sociale</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Secteur d'activité</Label><Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
          <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Site web</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          <div><Label>Contact principal</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
          <div><Label>Téléphone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} /></div>
      </CardContent>
    </Card>
  );
}
