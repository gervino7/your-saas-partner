import { useState } from 'react';
import { Plus, Phone, Mail, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useClientInteractions, useCreateInteraction } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeIcons: Record<string, any> = { meeting: Users, email: Mail, call: Phone, note: FileText };
const typeLabels: Record<string, string> = { meeting: 'Réunion', email: 'Email', call: 'Appel', note: 'Note' };

export default function ClientHistoryTab({ clientId }: { clientId: string }) {
  const { data: interactions, isLoading } = useClientInteractions(clientId);
  const create = useCreateInteraction();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'note', title: '', description: '' });

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await create.mutateAsync({ ...form, client_id: clientId });
    setShowAdd(false);
    setForm({ type: 'note', title: '', description: '' });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Historique des interactions</CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="animate-pulse h-20 bg-muted rounded" /> : !interactions?.length ? (
          <p className="text-muted-foreground text-sm">Aucune interaction enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {interactions.map((item: any) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <div key={item.id} className="flex gap-4 border-l-2 border-primary/20 pl-4">
                  <div className="shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{typeLabels[item.type] || item.type}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(item.interaction_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Par {(item.creator as any)?.full_name || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle interaction</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button onClick={handleAdd} disabled={create.isPending}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
