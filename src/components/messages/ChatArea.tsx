import DOMPurify from 'dompurify';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Reply, Pencil, Trash2, X, ArrowDown, Check, CheckCheck,
  MessageSquare, Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { MessageWithSender, ConversationWithDetails } from '@/hooks/useMessages';
import { format, differenceInMinutes, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChatAreaProps {
  conversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  typingUsers: string[];
  onSendMessage: (data: { content: string; replyTo?: string; attachments?: any[]; mentions?: string[] }) => void;
  onEditMessage: (data: { id: string; content: string }) => void;
  onDeleteMessage: (id: string) => void;
  onMarkAsRead: () => void;
  onTyping: () => void;
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
}

export default function ChatArea({
  conversation,
  messages,
  typingUsers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onMarkAsRead,
  onTyping,
}: ChatAreaProps) {
  const { user, profile } = useAuthStore();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);
  const [editing, setEditing] = useState<MessageWithSender | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowNewMsg(true);
    }
  }, [messages]);

  useEffect(() => {
    if (conversation) onMarkAsRead();
  }, [conversation?.id, messages.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottom.current = atBottom;
    if (atBottom) setShowNewMsg(false);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMsg(false);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping();
    typingTimer.current = setTimeout(() => {}, 2000);

    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length < 20) {
        setMentionSearch(afterAt.toLowerCase());
        return;
      }
    }
    setMentionSearch(null);
  };

  const insertMention = (name: string, userId: string) => {
    const lastAt = input.lastIndexOf('@');
    const before = input.slice(0, lastAt);
    setInput(`${before}@${name} `);
    setMentionSearch(null);
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;

    if (editing) {
      onEditMessage({ id: editing.id, content });
      setEditing(null);
    } else {
      const mentionRegex = /@(\w+)/g;
      const mentionNames: string[] = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentionNames.push(match[1]);
      }
      const mentionIds = conversation?.members
        .filter((m) => mentionNames.some((n) => m.full_name.toLowerCase().includes(n.toLowerCase())))
        .map((m) => m.user_id) || [];

      onSendMessage({
        content,
        replyTo: replyTo?.id,
        mentions: mentionIds,
      });
      setReplyTo(null);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!profile?.organization_id) {
      toast.error('Organisation introuvable');
      return;
    }

    const filePath = `${profile.organization_id}/messages/${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('attachments').upload(filePath, file, { upsert: true });
    if (error) {
      toast.error("Erreur d'upload");
      return;
    }

    onSendMessage({
      content: `📎 ${file.name}`,
      attachments: [{ name: file.name, path: filePath, size: file.size, type: file.type }],
    });
    e.target.value = '';
  };

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-muted/20 via-background to-primary/[0.02]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-inner">
            <MessageSquare className="h-9 w-9 text-primary/40" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground/70">Messagerie</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Sélectionnez une conversation pour commencer</p>
          </div>
        </div>
      </div>
    );
  }

  const otherMembers = conversation.members.filter((m) => m.user_id !== user?.id);
  const mentionCandidates =
    mentionSearch !== null
      ? conversation.members.filter(
          (m) =>
            m.user_id !== user?.id &&
            m.full_name.toLowerCase().includes(mentionSearch)
        )
      : [];

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-muted/10 to-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm font-display truncate">
            {conversation.name ||
              otherMembers.map((m) => m.full_name).join(', ') ||
              'Conversation'}
          </h3>
          {otherMembers.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {otherMembers.filter(m => m.is_online).length > 0
                ? `${otherMembers.filter(m => m.is_online).length} en ligne`
                : `${otherMembers.length} membre${otherMembers.length > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center -space-x-2">
          {otherMembers.slice(0, 4).map((m) => (
            <TooltipProvider key={m.user_id}>
              <Tooltip>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar className="h-8 w-8 ring-2 ring-card">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-semibold">
                        {m.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {m.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{m.full_name} {m.is_online ? '• En ligne' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {otherMembers.length > 4 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[10px] font-bold text-muted-foreground">
              +{otherMembers.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="h-full overflow-y-auto px-4 py-4"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === user?.id;
            const showAvatar =
              !isOwn && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
            const canEdit =
              isOwn && differenceInMinutes(new Date(), new Date(msg.created_at!)) <= 15;
            const prevMsg = messages[i - 1];
            const showDateSep = i === 0 || (prevMsg && !isSameDay(new Date(msg.created_at!), new Date(prevMsg.created_at!)));
            const isConsecutive = i > 0 && prevMsg?.sender_id === msg.sender_id && !showDateSep;

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-2">
                      {formatDateSeparator(new Date(msg.created_at!))}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                )}

                <div
                  className={cn(
                    'group flex gap-2',
                    isOwn ? 'flex-row-reverse' : 'flex-row',
                    isConsecutive ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar className="h-8 w-8 shadow-sm">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-semibold">
                            {msg.sender?.full_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className={cn('max-w-[75%] lg:max-w-[65%]', isOwn && 'items-end')}>
                    {showAvatar && !isOwn && (
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground/70 ml-1">
                        {msg.sender?.full_name}
                      </p>
                    )}

                    {/* Reply preview */}
                    {msg.reply_message && (
                      <div className="mb-1 ml-1 rounded-xl border-l-[3px] border-primary/30 bg-primary/[0.04] px-3 py-1.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary/70">{msg.reply_message.sender_name}</span>
                        <p className="mt-0.5 text-muted-foreground">{msg.reply_message.content.slice(0, 60)}</p>
                      </div>
                    )}

                    <div className="flex items-end gap-1">
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm transition-shadow',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-lg shadow-primary/10'
                            : 'bg-card border border-border/40 rounded-bl-lg shadow-black/[0.03]'
                        )}
                      >
                        <MessageContent content={msg.content} attachments={msg.attachments as any} />
                        {msg.is_edited && (
                          <span className="ml-1.5 text-[10px] opacity-50 italic">(modifié)</span>
                        )}
                      </div>

                      {/* Actions on hover */}
                      <div className="invisible flex items-center gap-0.5 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-muted"
                                onClick={() => setReplyTo(msg)}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Répondre</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {canEdit && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-muted"
                                  onClick={() => {
                                    setEditing(msg);
                                    setInput(msg.content);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Modifier</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isOwn && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(msg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Supprimer</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-1 mt-1 ml-1',
                        isOwn && 'justify-end mr-1'
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground/40 font-medium">
                        {format(new Date(msg.created_at!), 'HH:mm', { locale: fr })}
                      </span>
                      {isOwn && <ReadIndicator message={msg} conversation={conversation} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* New message indicator */}
        {showNewMsg && (
          <Button
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-xl rounded-full px-4 gap-1.5"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-3.5 w-3.5" /> Nouveau message
          </Button>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1.5 text-xs text-muted-foreground/60 flex items-center gap-2">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="italic">
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'écrivent' : 'écrit'}...
          </span>
        </div>
      )}

      {/* Reply / Edit bar */}
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 border-t border-border/50 bg-primary/[0.03] px-5 py-2.5">
          <div className="flex-1 text-xs text-muted-foreground">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <Pencil className="h-3 w-3 text-primary" />
                <span>Modification du message</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Reply className="h-3 w-3 text-primary" />
                <span>
                  Réponse à <strong className="text-foreground">{replyTo?.sender?.full_name}</strong>
                </span>
              </div>
            )}
            {replyTo && (
              <p className="mt-0.5 truncate text-muted-foreground/50">{replyTo.content.slice(0, 60)}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => {
              setReplyTo(null);
              setEditing(null);
              setInput('');
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="relative border-t border-border/50 bg-card p-3">
        {/* Mention autocomplete */}
        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border bg-popover p-1.5 shadow-xl">
            {mentionCandidates.slice(0, 5).map((m) => (
              <button
                key={m.user_id}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-primary/5 transition-colors"
                onClick={() => insertMention(m.full_name, m.user_id)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {m.full_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{m.full_name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all">
                    <Paperclip className="h-4.5 w-4.5" />
                  </div>
                </label>
              </TooltipTrigger>
              <TooltipContent><p>Joindre un fichier</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              className="min-h-[40px] max-h-32 resize-none rounded-xl border-border/40 bg-background/80 focus-visible:ring-primary/20 pr-3"
              rows={1}
            />
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-10 w-10 rounded-xl shadow-md shadow-primary/20 disabled:shadow-none transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground rounded-xl"
              onClick={() => {
                if (deleteTarget) onDeleteMessage(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageContent({ content, attachments }: { content: string; attachments: any }) {
  const atts = Array.isArray(attachments) ? attachments : [];

  const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const highlighted = sanitized.replace(
    /@(\w+)/g,
    '<span class="font-semibold text-accent">@$1</span>'
  );

  return (
    <div>
      <p dangerouslySetInnerHTML={{ __html: highlighted }} />
      {atts.length > 0 && (
        <div className="mt-2 space-y-1">
          {atts.map((att: any, idx: number) => (
            <AttachmentCard key={idx} attachment={att} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentCard({ attachment }: { attachment: any }) {
  const handleDownload = async () => {
    const { getAttachmentDownloadUrl } = await import('@/lib/attachments');
    const url = await getAttachmentDownloadUrl(attachment.path);
    if (url) window.open(url, '_blank');
    else toast.error('Impossible de télécharger le fichier');
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs hover:bg-muted transition-all hover:shadow-sm"
    >
      <Paperclip className="h-3 w-3 text-primary/60" />
      <span className="truncate font-medium">{attachment.name}</span>
      {attachment.size && (
        <span className="text-muted-foreground/50 text-[10px]">
          {(attachment.size / 1024).toFixed(0)} Ko
        </span>
      )}
    </button>
  );
}

function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return <MessageSquare {...props} />;
}

function ReadIndicator({ message, conversation }: { message: MessageWithSender; conversation: ConversationWithDetails }) {
  const otherMembers = conversation.members.filter(
    (m) => m.user_id !== message.sender_id
  );
  const allRead = otherMembers.every(
    (m) => m.last_read_at && new Date(m.last_read_at) >= new Date(message.created_at!)
  );

  return allRead ? (
    <CheckCheck className="h-3.5 w-3.5 text-primary/60" />
  ) : (
    <Check className="h-3.5 w-3.5 text-muted-foreground/30" />
  );
}
