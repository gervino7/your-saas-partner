import DOMPurify from 'dompurify';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Reply, Pencil, Trash2, X, ArrowDown, Check, CheckCheck,
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
import { format, differenceInMinutes } from 'date-fns';
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
  const { user } = useAuthStore();
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

  // Auto scroll
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowNewMsg(true);
    }
  }, [messages]);

  // Mark as read when viewing
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

    // Typing indicator
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping();
    typingTimer.current = setTimeout(() => {}, 2000);

    // Mention detection
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
      // Extract mentions
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

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('attachments').upload(filePath, file);
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
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <MessageSquareIcon className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm">Sélectionnez une conversation</p>
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h3 className="font-semibold text-sm font-display flex-1 truncate">
          {conversation.name ||
            otherMembers.map((m) => m.full_name).join(', ') ||
            'Conversation'}
        </h3>
        <div className="flex items-center -space-x-1.5">
          {otherMembers.slice(0, 5).map((m) => (
            <TooltipProvider key={m.user_id}>
              <Tooltip>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {m.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {m.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{m.full_name} {m.is_online ? '• En ligne' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="h-full overflow-y-auto p-4 space-y-1"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === user?.id;
            const showAvatar =
              !isOwn && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
            const canEdit =
              isOwn && differenceInMinutes(new Date(), new Date(msg.created_at!)) <= 15;

            return (
              <div
                key={msg.id}
                className={cn('group flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
              >
                {!isOwn && (
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.sender?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {msg.sender?.full_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
                  {showAvatar && !isOwn && (
                    <p className="mb-0.5 text-xs font-medium text-muted-foreground ml-1">
                      {msg.sender?.full_name}
                    </p>
                  )}

                  {/* Reply preview */}
                  {msg.reply_message && (
                    <div className="mb-1 ml-1 rounded border-l-2 border-primary/40 bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      <span className="font-medium">{msg.reply_message.sender_name}</span>:{' '}
                      {msg.reply_message.content.slice(0, 60)}
                    </div>
                  )}

                  <div className="flex items-end gap-1">
                    <div
                      className={cn(
                        'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      <MessageContent content={msg.content} attachments={msg.attachments as any} />
                      {msg.is_edited && (
                        <span className="ml-1 text-[10px] opacity-60">(modifié)</span>
                      )}
                    </div>

                    {/* Actions on hover */}
                    <div className="invisible flex items-center gap-0.5 group-hover:visible">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setReplyTo(msg)}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditing(msg);
                            setInput(msg.content);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => setDeleteTarget(msg.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1 mt-0.5 ml-1',
                      isOwn && 'justify-end mr-1'
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.created_at!), 'HH:mm', { locale: fr })}
                    </span>
                    {isOwn && <ReadIndicator message={msg} conversation={conversation} />}
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
            className="absolute bottom-2 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="mr-1 h-3 w-3" /> Nouveau message
          </Button>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground italic">
          {typingUsers.join(', ')} {typingUsers.length > 1 ? 'écrivent' : 'écrit'}...
        </div>
      )}

      {/* Reply / Edit bar */}
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2">
          <div className="flex-1 text-xs text-muted-foreground">
            {editing ? (
              <span>✏️ Modification du message</span>
            ) : (
              <span>
                ↩️ Réponse à <strong>{replyTo?.sender?.full_name}</strong>:{' '}
                {replyTo?.content.slice(0, 50)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setReplyTo(null);
              setEditing(null);
              setInput('');
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="relative border-t border-border p-3">
        {/* Mention autocomplete */}
        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border bg-popover p-1 shadow-lg">
            {mentionCandidates.slice(0, 5).map((m) => (
              <button
                key={m.user_id}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => insertMention(m.full_name, m.user_id)}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {m.full_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {m.full_name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <Paperclip className="h-4 w-4" />
            </div>
          </label>

          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            className="min-h-[36px] max-h-32 resize-none"
            rows={1}
          />

          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
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

  // Sanitize then highlight mentions
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
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 text-xs hover:bg-muted transition-colors"
    >
      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate max-w-[180px]">{attachment.name}</span>
    </button>
  );
}

function ReadIndicator({
  message,
  conversation,
}: {
  message: MessageWithSender;
  conversation: ConversationWithDetails;
}) {
  const otherMembers = conversation.members.filter(
    (m) => m.user_id !== message.sender_id
  );
  const allRead = otherMembers.every(
    (m) => m.last_read_at && m.last_read_at >= (message.created_at || '')
  );

  return allRead ? (
    <CheckCheck className="h-3 w-3 text-accent" />
  ) : (
    <Check className="h-3 w-3 text-muted-foreground" />
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
