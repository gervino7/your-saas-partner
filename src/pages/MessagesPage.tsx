import { useState, useCallback } from 'react';
import { useConversations, useMessages } from '@/hooks/useMessages';
import ConversationList from '@/components/messages/ConversationList';
import ChatArea from '@/components/messages/ChatArea';
import { toast } from 'sonner';

const MessagesPage = () => {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
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

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-border bg-card">
      {/* Left panel: conversation list */}
      <div className="w-[320px] flex-shrink-0">
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={setActiveConvId}
          onCreateConversation={handleCreateConversation}
        />
      </div>

      {/* Right panel: chat */}
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
