import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentRow } from '@/hooks/useDocuments';
import { toast } from '@/hooks/use-toast';
import { Share2, Trash2 } from 'lucide-react';

interface Props {
  doc: DocumentRow | null;
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ doc, open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState('read');
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  const { data: orgUsers = [] } = useQuery({
    queryKey: ['org_users', profile?.organization_id],
    enabled: !!profile?.organization_id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', profile!.organization_id!)
        .neq('id', profile!.id)
        .order('full_name');
      return data || [];
    },
  });

  const { data: shares = [] } = useQuery({
    queryKey: ['doc_shares', doc?.id],
    enabled: !!doc?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('document_shares')
        .select('*, shared_user:profiles!document_shares_shared_with_fkey(full_name)')
        .eq('document_id', doc!.id);
      return data || [];
    },
  });

  const addShare = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !doc) return;
      const { error } = await supabase.from('document_shares').insert({
        document_id: doc.id,
        shared_with: selectedUserId,
        shared_by: profile!.id,
        permission,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc_shares', doc?.id] });
      toast({ title: 'Partage ajouté' });
      setSelectedUserId('');
    },
  });

  const filteredUsers = orgUsers.filter(
    (u: any) => u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Partager — {doc?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          {search && filteredUsers.length > 0 && (
            <div className="max-h-32 overflow-y-auto border rounded-md">
              {filteredUsers.map((u: any) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer text-sm ${
                    selectedUserId === u.id ? 'bg-accent/10' : ''
                  }`}
                  onClick={() => { setSelectedUserId(u.id); setSearch(u.full_name); }}
                >
                  <span>{u.full_name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Lecture</SelectItem>
                <SelectItem value="write">Écriture</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => addShare.mutate()} disabled={!selectedUserId}>
              Partager
            </Button>
          </div>

          {shares.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Partagé avec :</p>
              {shares.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{s.shared_user?.full_name || '—'}</span>
                  <span className="text-xs text-muted-foreground capitalize">{s.permission}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
