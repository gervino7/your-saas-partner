import { useState } from 'react';
import { Search, Plus, Users, User, MessageSquare, Briefcase, FolderKanban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useOrgMembers, type ConversationWithDetails } from '@/hooks/useMessages';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateConversation: (data: { name?: string; type: string; memberIds: string[] }) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreateConversation,
}: ConversationListProps) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { data: orgMembers = [] } = useOrgMembers();

  const filtered = conversations.filter((c) => {
    const name = getConversationName(c, user?.id || '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleCreate = () => {
    if (!selectedMembers.length) return;
    onCreateConversation({
      name: newType === 'group' ? groupName || 'Groupe' : undefined,
      type: newType,
      memberIds: selectedMembers,
    });
    setShowNew(false);
    setSelectedMembers([]);
    setGroupName('');
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-lg font-semibold font-display">Messages</h2>
        <Button size="icon" variant="ghost" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune conversation
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                activeId === conv.id && 'bg-muted'
              )}
            >
              <ConversationAvatar conv={conv} userId={user?.id || ''} />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {getConversationName(conv, user?.id || '')}
                  </span>
                  {conv.last_message && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(conv.last_message.created_at), {
                        addSuffix: false,
                        locale: fr,
                      })}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {conv.last_message.sender_name}: {conv.last_message.content}
                  </p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {conv.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </ScrollArea>

      {/* New conversation dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={newType === 'direct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setNewType('direct'); setSelectedMembers([]); }}
            >
              <User className="mr-1.5 h-3.5 w-3.5" /> Individuelle
            </Button>
            <Button
              variant={newType === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setNewType('group'); setSelectedMembers([]); }}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" /> Groupe
            </Button>
          </div>

          {newType === 'group' && (
            <div className="mb-3">
              <Label>Nom du groupe</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Équipe audit..."
              />
            </div>
          )}

          <Label>Sélectionner les membres</Label>
          <ScrollArea className="h-60 mt-1 rounded-md border">
            {orgMembers
              .filter((m) => m.id !== user?.id)
              .map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                    disabled={newType === 'direct' && selectedMembers.length >= 1 && !selectedMembers.includes(member.id)}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.full_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="text-sm">{member.full_name}</span>
                    {member.grade && (
                      <span className="ml-2 text-xs text-muted-foreground">{member.grade}</span>
                    )}
                  </div>
                  {member.is_online && (
                    <span className="h-2 w-2 rounded-full bg-success" />
                  )}
                </label>
              ))}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!selectedMembers.length}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationAvatar({ conv, userId }: { conv: ConversationWithDetails; userId: string }) {
  const typeIcon = conv.type === 'mission' ? Briefcase : conv.type === 'project' ? FolderKanban : null;
  const otherMembers = conv.members.filter((m) => m.user_id !== userId);
  const first = otherMembers[0];

  if (conv.type === 'direct' && first) {
    return (
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={first.avatar_url || undefined} />
          <AvatarFallback>{first.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {first.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      {typeIcon ? (
        <>{(() => { const Icon = typeIcon; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}</>
      ) : (
        <Users className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

function getConversationName(conv: ConversationWithDetails, userId: string): string {
  if (conv.name) return conv.name;
  if (conv.type === 'direct') {
    const other = conv.members.find((m) => m.user_id !== userId);
    return other?.full_name || 'Conversation';
  }
  return conv.members
    .filter((m) => m.user_id !== userId)
    .map((m) => m.full_name)
    .slice(0, 3)
    .join(', ') || 'Conversation';
}
