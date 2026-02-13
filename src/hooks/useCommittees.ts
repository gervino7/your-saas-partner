import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// ── Committees ──
export const useCommittees = (missionId?: string) => {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['committees', missionId],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from('committees').select('*, committee_members(count)');
      if (missionId) q = q.eq('mission_id', missionId);
      else q = q.is('mission_id', null);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCommittee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string; type: string; mission_id?: string | null;
      meeting_frequency: string; secretary_id?: string | null; description?: string;
    }) => {
      const { data, error } = await supabase.from('committees').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['committees', v.mission_id] });
      toast.success('Comité créé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateCommittee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from('committees').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committees'] }); toast.success('Comité mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Committee Members ──
export const useCommitteeMembers = (committeeId?: string) =>
  useQuery({
    queryKey: ['committee-members', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_members')
        .select('*, profiles:user_id(id, full_name, email, avatar_url, grade)')
        .eq('committee_id', committeeId!)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

export const useAddCommitteeMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      committee_id: string; user_id?: string | null; is_external?: boolean;
      external_name?: string; external_email?: string; external_phone?: string; role?: string;
    }) => {
      const { error } = await supabase.from('committee_members').insert(input);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['committee-members', v.committee_id] }); toast.success('Membre ajouté'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useRemoveCommitteeMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, committeeId }: { id: string; committeeId: string }) => {
      const { error } = await supabase.from('committee_members').delete().eq('id', id);
      if (error) throw error;
      return committeeId;
    },
    onSuccess: (cid) => { qc.invalidateQueries({ queryKey: ['committee-members', cid] }); toast.success('Membre retiré'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Committee Meetings ──
export const useCommitteeMeetings = (committeeId?: string) =>
  useQuery({
    queryKey: ['committee-meetings', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_meetings')
        .select('*')
        .eq('committee_id', committeeId!)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useCreateMeeting = () => {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (input: {
      committee_id: string; title: string; agenda?: string;
      scheduled_at: string; duration_minutes?: number; location?: string; meeting_link?: string;
    }) => {
      const { data, error } = await supabase
        .from('committee_meetings')
        .insert({ ...input, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['committee-meetings', v.committee_id] }); toast.success('Réunion programmée'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: string; committee_id?: string; [k: string]: any }) => {
      const { error } = await supabase.from('committee_meetings').update(rest).eq('id', id);
      if (error) throw error;
      return rest.committee_id;
    },
    onSuccess: (cid) => { qc.invalidateQueries({ queryKey: ['committee-meetings', cid] }); toast.success('Réunion mise à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ── Group Emails ──
export const useGroupEmails = (groupId?: string) =>
  useQuery({
    queryKey: ['group-emails', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_emails')
        .select('*, profiles:sent_by(full_name)')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useMailingGroup = (committeeId?: string) =>
  useQuery({
    queryKey: ['mailing-group', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mailing_groups')
        .select('*, mailing_group_recipients(*)')
        .eq('committee_id', committeeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateGroupEmail = () => {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (input: {
      group_id: string; subject: string; body: string; attachments?: any[];
    }) => {
      const { data, error } = await supabase
        .from('group_emails')
        .insert({ ...input, sent_by: profile?.id, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['group-emails', v.group_id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSendGroupEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emailId: string) => {
      const { data, error } = await supabase.functions.invoke('send-group-email', {
        body: { emailId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['group-emails'] }); toast.success('Emails envoyés'); },
    onError: (e: Error) => toast.error('Erreur d\'envoi: ' + e.message),
  });
};

// ── Org Members (for selects) ──
export const useOrgMembers = () => {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['org-members', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade, grade_level, avatar_url')
        .eq('organization_id', profile!.organization_id!)
        .order('grade_level');
      if (error) throw error;
      return data;
    },
  });
};

// ── Mission Members (for secretary select) ──
export const useMissionMembers = (missionId?: string) =>
  useQuery({
    queryKey: ['mission-members-list', missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_members')
        .select('*, profiles:user_id(id, full_name, email, grade)')
        .eq('mission_id', missionId!);
      if (error) throw error;
      return data;
    },
  });

// ── Ensure mailing group exists for a committee ──
export const useEnsureMailingGroup = () => {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async ({ committeeId, name }: { committeeId: string; name: string }) => {
      // Check existing
      const { data: existing } = await supabase
        .from('mailing_groups')
        .select('id')
        .eq('committee_id', committeeId)
        .maybeSingle();
      if (existing) return existing;
      
      const { data, error } = await supabase
        .from('mailing_groups')
        .insert({
          committee_id: committeeId,
          name: `Groupe ${name}`,
          organization_id: profile?.organization_id,
          created_by: profile?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailing-group'] }),
  });
};
