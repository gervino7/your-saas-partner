import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientContacts, useCreateContact, useDeleteContact } from '@/hooks/useCRM';

export default function ClientContactsTab({ clientId }: { clientId: string }) {
  const { data: contacts, isLoading } = useClientContacts(clientId);
  const create = useCreateContact();
  const remove = useDeleteContact();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '', is_primary: false });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync({ ...form, client_id: clientId });
    setShowAdd(false);
    setForm({ name: '', position: '', email: '', phone: '', is_primary: false });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="animate-pulse h-20 bg-muted rounded" /> : !contacts?.length ? (
          <p className="text-muted-foreground text-sm">Aucun contact enregistré.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {c.name} {c.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1" />Principal</Badge>}
                  </TableCell>
                  <TableCell>{c.position || '—'}</TableCell>
                  <TableCell>{c.email || '—'}</TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate({ id: c.id, clientId })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau contact</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Poste</Label><Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
              Contact principal
            </label>
            <Button onClick={handleAdd} disabled={create.isPending}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
