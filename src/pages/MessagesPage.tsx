import { useState, useCallback } from 'react';
import { useConversations, useMessages } from '@/hooks/useMessages';
import ConversationList from '@/components/messages/ConversationList';
import ChatArea from '@/components/messages/ChatArea';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const MessagesPage = () => {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { conversations, createConversation } = useConversations();
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    typingUsers,
    sendTyping,
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

  return (
    <div className="h-[calc(100svh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-border bg-card">
      {/* Mobile + tablet: one pane at a time for max content width */}
      <div className="h-full lg:hidden">
        {activeConvId && activeConv ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="truncate text-sm font-medium">{activeConv.name || 'Conversation'}</span>
            </div>
            <div className="min-h-0 flex-1">
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
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onCreateConversation={handleCreateConversation}
          />
        )}
      </div>

      {/* Desktop: split view */}
      <div className="hidden h-full lg:flex">
        <div className="w-[280px] flex-shrink-0 border-r border-border xl:w-[320px]">
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onCreateConversation={handleCreateConversation}
          />
        </div>
        <div className="flex-1 min-w-0">
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
    </div>
  );
};

export default MessagesPage;

