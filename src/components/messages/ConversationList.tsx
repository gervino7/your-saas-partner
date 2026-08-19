import { useState } from 'react';
import { Search, Plus, Users, User, MessageSquare, Briefcase, FolderKanban, MessageCircle } from 'lucide-react';
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
      type: newType === 'direct' ? 'individual' : 'group',
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
    <div className="flex h-full flex-col bg-gradient-to-b from-card to-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <MessageCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-xl border-border/50 shadow-sm hover:shadow-md transition-all"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/40 border-transparent focus-visible:border-primary/30 focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <MessageSquare className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm font-medium">Aucune conversation</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Commencez par créer une conversation</p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-2">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200',
                  activeId === conv.id
                    ? 'bg-primary/8 shadow-sm ring-1 ring-primary/15'
                    : 'hover:bg-muted/50'
                )}
              >
                <ConversationAvatar conv={conv} userId={user?.id || ''} isActive={activeId === conv.id} />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'truncate text-sm font-semibold',
                      activeId === conv.id ? 'text-primary' : 'text-foreground'
                    )}>
                      {getConversationName(conv, user?.id || '')}
                    </span>
                    {conv.last_message && (
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap ml-2 font-medium">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="truncate text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                      <span className="font-medium text-muted-foreground/90">{conv.last_message.sender_name}:</span>{' '}
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-md shadow-primary/25 animate-in fade-in">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New conversation dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="">Nouvelle conversation</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={newType === 'direct' ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl"
              onClick={() => { setNewType('direct'); setSelectedMembers([]); }}
            >
              <User className="mr-1.5 h-3.5 w-3.5" /> Individuelle
            </Button>
            <Button
              variant={newType === 'group' ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl"
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
          <ScrollArea className="h-60 mt-1 rounded-xl border">
            {orgMembers
              .filter((m) => m.id !== user?.id)
              .map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                    disabled={newType === 'direct' && selectedMembers.length >= 1 && !selectedMembers.includes(member.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {member.full_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{member.full_name}</span>
                    {member.grade && (
                      <span className="ml-2 text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">{member.grade}</span>
                    )}
                  </div>
                  {member.is_online && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                  )}
                </label>
              ))}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleCreate} disabled={!selectedMembers.length} className="rounded-xl">
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationAvatar({ conv, userId, isActive }: { conv: ConversationWithDetails; userId: string; isActive?: boolean }) {
  const typeIcon = conv.type === 'mission' ? Briefcase : conv.type === 'project' ? FolderKanban : null;
  const otherMembers = conv.members.filter((m) => m.user_id !== userId);
  const first = otherMembers[0];

  if ((conv.type === 'direct' || conv.type === 'individual') && first) {
    return (
      <div className="relative">
        <Avatar className={cn("h-11 w-11 ring-2 transition-all", isActive ? "ring-primary/20" : "ring-transparent")}>
          <AvatarImage src={first.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
            {first.full_name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {first.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-card bg-emerald-500 shadow-sm shadow-emerald-500/30" />
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-11 w-11 items-center justify-center rounded-full transition-all",
      isActive
        ? "bg-primary/15 ring-2 ring-primary/20"
        : "bg-gradient-to-br from-muted to-muted/50"
    )}>
      {typeIcon ? (
        <>{(() => { const Icon = typeIcon; return <Icon className="h-4.5 w-4.5 text-primary/70" />; })()}</>
      ) : (
        <Users className="h-4.5 w-4.5 text-muted-foreground" />
      )}
    </div>
  );
}

function getConversationName(conv: ConversationWithDetails, userId: string): string {
  if (conv.name) return conv.name;
  if (conv.type === 'direct' || conv.type === 'individual') {
    const other = conv.members.find((m) => m.user_id !== userId);
    return other?.full_name || 'Conversation';
  }
  return conv.members
    .filter((m) => m.user_id !== userId)
    .map((m) => m.full_name)
    .slice(0, 3)
    .join(', ') || 'Conversation';
}
