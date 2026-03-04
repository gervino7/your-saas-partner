import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ConversationMember = Database['public']['Tables']['conversation_members']['Row'];

export interface ConversationWithDetails extends Conversation {
  members: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    is_online: boolean;
    last_read_at: string | null;
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    is_online: boolean;
  } | null;
  reply_message?: {
    content: string;
    sender_name: string;
  } | null;
}

export function useConversations() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: conversations = [], ...rest } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's conversations
      const { data: memberData, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching conversation members:', memberError);
        throw memberError;
      }

      if (!memberData?.length) return [];

      const convIds = memberData.map((m) => m.conversation_id!).filter(Boolean);
      if (!convIds.length) return [];

      const { data: convs, error: convsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds);

      if (convsError) {
        console.error('Error fetching conversations:', convsError);
        throw convsError;
      }

      if (!convs?.length) return [];

      // Get all members with profiles in parallel
      const { data: allMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id, last_read_at')
        .in('conversation_id', convIds);

      const memberUserIds = [...new Set((allMembers || []).map((m) => m.user_id!).filter(Boolean))];
      const { data: profiles } = memberUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, is_online')
            .in('id', memberUserIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Get latest message for ALL conversations in one query
      // Use a simpler approach: get recent messages and pick the latest per conversation
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, conversation_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(convIds.length * 2);

      // Build last message map (first occurrence per conversation_id is the latest)
      const lastMsgMap = new Map<string, typeof recentMessages extends (infer T)[] | null ? T : never>();
      for (const msg of recentMessages || []) {
        if (!lastMsgMap.has(msg.conversation_id!)) {
          lastMsgMap.set(msg.conversation_id!, msg);
        }
      }

      const results: ConversationWithDetails[] = [];

      for (const conv of convs) {
        const convMembers = (allMembers || [])
          .filter((m) => m.conversation_id === conv.id)
          .map((m) => {
            const p = profileMap.get(m.user_id!);
            return {
              user_id: m.user_id!,
              full_name: p?.full_name || 'Inconnu',
              avatar_url: p?.avatar_url || null,
              is_online: p?.is_online || false,
              last_read_at: m.last_read_at,
            };
          });

        const lastMsg = lastMsgMap.get(conv.id);
        const senderProfile = lastMsg ? profileMap.get(lastMsg.sender_id!) : null;

        // Count unread from last_read_at
        const myLastRead = memberData.find((m) => m.conversation_id === conv.id)?.last_read_at;
        let unreadCount = 0;
        if (myLastRead) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', myLastRead)
            .neq('sender_id', user.id);
          unreadCount = count || 0;
        }

        results.push({
          ...conv,
          members: convMembers,
          last_message: lastMsg
            ? {
                content: lastMsg.content,
                created_at: lastMsg.created_at!,
                sender_name: senderProfile?.full_name || 'Inconnu',
              }
            : undefined,
          unread_count: unreadCount,
        });
      }

      // Sort by last message date
      results.sort((a, b) => {
        const dateA = a.last_message?.created_at || a.created_at || '';
        const dateB = b.last_message?.created_at || b.created_at || '';
        return dateB.localeCompare(dateA);
      });

      return results;
    },
    enabled: !!user,
  });

  // Realtime subscription for new messages to refresh list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createConversation = useMutation({
    mutationFn: async ({
      name,
      type,
      memberIds,
    }: {
      name?: string;
      type: string;
      memberIds: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const profile = useAuthStore.getState().profile;
      const conversationId = crypto.randomUUID();

      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          name: name || null,
          type,
          created_by: user.id,
          organization_id: profile?.organization_id || null,
        });

      if (conversationError) throw conversationError;

      // Add creator + selected members
      const allMembers = [...new Set([user.id, ...memberIds])];
      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert(
          allMembers.map((uid) => ({
            conversation_id: conversationId,
            user_id: uid,
          }))
        );

      if (memberError) throw memberError;

      return { id: conversationId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return { conversations, createConversation, ...rest };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const { data: messages = [], ...rest } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set((data || []).map((m) => m.sender_id!).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Get reply messages
      const replyIds = (data || []).map((m) => m.reply_to).filter(Boolean) as string[];
      let replyMap = new Map<string, { content: string; sender_name: string }>();
      if (replyIds.length) {
        const { data: replies } = await supabase
          .from('messages')
          .select('id, content, sender_id')
          .in('id', replyIds);
        if (replies) {
          for (const r of replies) {
            const sp = profileMap.get(r.sender_id!);
            replyMap.set(r.id, {
              content: r.content,
              sender_name: sp?.full_name || 'Inconnu',
            });
          }
        }
      }

      return (data || []).map((m) => ({
        ...m,
        sender: m.sender_id ? profileMap.get(m.sender_id) || null : null,
        reply_message: m.reply_to ? replyMap.get(m.reply_to) || null : null,
      })) as MessageWithSender[];
    },
    enabled: !!conversationId,
  });

  // Realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Typing indicator via broadcast
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return;
        const userName = payload.user_name as string;

        setTypingUsers((prev) => {
          if (!prev.includes(userName)) return [...prev, userName];
          return prev;
        });

        // Clear after 3s
        if (typingTimeoutRef.current[payload.user_id]) {
          clearTimeout(typingTimeoutRef.current[payload.user_id]);
        }
        typingTimeoutRef.current[payload.user_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== userName));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(() => {
    if (!conversationId || !user) return;
    const profile = useAuthStore.getState().profile;
    supabase.channel(`typing:${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, user_name: profile?.full_name || 'Quelqu\'un' },
    });
  }, [conversationId, user]);

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      replyTo,
      attachments,
      mentions,
    }: {
      content: string;
      replyTo?: string;
      attachments?: any[];
      mentions?: string[];
    }) => {
      if (!user || !conversationId) throw new Error('Missing data');

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        reply_to: replyTo || null,
        attachments: attachments || [],
        mentions: mentions || [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ content, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [conversationId, user, queryClient]);

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    typingUsers,
    sendTyping,
    ...rest,
  };
}

export function useOrgMembers() {
  const { profile } = useAuthStore();

  return useQuery({
    queryKey: ['orgMembers', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online, grade')
        .eq('organization_id', profile.organization_id);
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });
}
