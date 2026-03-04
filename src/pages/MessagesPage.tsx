import { useState, useCallback } from 'react';
import { useConversations, useMessages } from '@/hooks/useMessages';
import ConversationList from '@/components/messages/ConversationList';
import ChatArea from '@/components/messages/ChatArea';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';

const MessagesPage = () => {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { conversations, createConversation, isLoading: convsLoading } = useConversations();
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    typingUsers,
    sendTyping,
    isLoading: msgsLoading,
  } = useMessages(activeConvId);

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

  const handleCreateConversation = useCallback(
    async (data: { name?: string; type: string; memberIds: string[] }) => {
      try {
        const conv = await createConversation.mutateAsync(data);
        setActiveConvId(conv.id);
      } catch {
        toast.error('Erreur lors de la création');
      }
    },
    [createConversation]
  );

  const handleSendMessage = useCallback(
    (data: { content: string; replyTo?: string; attachments?: any[]; mentions?: string[] }) => {
      sendMessage.mutate(data, {
        onError: () => toast.error("Erreur d'envoi"),
      });
    },
    [sendMessage]
  );

  const handleEditMessage = useCallback(
    (data: { id: string; content: string }) => {
      editMessage.mutate(data, {
        onError: () => toast.error('Erreur de modification'),
      });
    },
    [editMessage]
  );

  const handleDeleteMessage = useCallback(
    (id: string) => {
      deleteMessage.mutate(id, {
        onError: () => toast.error('Erreur de suppression'),
      });
    },
    [deleteMessage]
  );

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);
  }, []);

  const handleBack = useCallback(() => {
    setActiveConvId(null);
  }, []);

  // Mobile: show either list or chat, not both
  if (isMobile) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-border bg-card">
        {activeConvId && activeConv ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium truncate">
                {activeConv.name || 'Conversation'}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ChatArea
                conversation={activeConv}
                messages={messages}
                typingUsers={typingUsers}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onMarkAsRead={markAsRead}
                onTyping={sendTyping}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={handleSelectConversation}
              onCreateConversation={handleCreateConversation}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-border bg-card">
      <div className="w-[320px] flex-shrink-0">
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onCreateConversation={handleCreateConversation}
        />
      </div>
      <div className="flex-1">
        <ChatArea
          conversation={activeConv}
          messages={messages}
          typingUsers={typingUsers}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onMarkAsRead={markAsRead}
          onTyping={sendTyping}
        />
      </div>
    </div>
  );
};

export default MessagesPage;
