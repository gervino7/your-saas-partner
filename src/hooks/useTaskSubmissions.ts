import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export function useTaskSubmissions(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-submissions', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_submissions')
        .select(`
          *,
          submitter:profiles!task_submissions_submitted_by_fkey(id, full_name, avatar_url, grade),
          reviewer:profiles!task_submissions_reviewed_by_fkey(id, full_name, avatar_url, grade)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!taskId,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      task_id: string;
      type: string;
      comment?: string;
      attachments?: any[];
      rating?: number;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('task_submissions')
        .insert({
          ...values,
          submitted_by: profile!.id,
          reviewed_by: values.type === 'validation' || values.type === 'rejection' ? profile!.id : null,
          status: values.status || 'pending',
          attachments: values.attachments ? JSON.stringify(values.attachments) : '[]',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-submissions', data.task_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function usePerformanceData(filters?: { missionId?: string; period?: string; grade?: string }) {
  return useQuery({
    queryKey: ['performance-data', filters],
    queryFn: async () => {
      // Get all validated submissions with ratings
      let query = supabase
        .from('task_submissions')
        .select(`
          id, rating, created_at, type, status, comment,
          task:tasks!task_submissions_task_id_fkey(
            id, title, project_id,
            project:projects!tasks_project_id_fkey(
              id, name, mission_id,
              mission:missions!projects_mission_id_fkey(id, name)
            )
          ),
          submitter:profiles!task_submissions_submitted_by_fkey(id, full_name, avatar_url, grade, grade_level)
        `)
        .eq('type', 'validation')
        .not('rating', 'is', null)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmployeePerformanceSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee-performance', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get all submissions for tasks assigned to this user
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', userId);

      if (!assignments || assignments.length === 0) return { ratings: [], totalTasks: 0, avgRating: 0 };

      const taskIds = assignments.map(a => a.task_id).filter(Boolean);
      
      const { data: submissions } = await supabase
        .from('task_submissions')
        .select('rating, created_at, type, task_id')
        .in('task_id', taskIds)
        .eq('type', 'validation')
        .not('rating', 'is', null)
        .order('created_at', { ascending: true });

      // Count iterations per task
      const { data: allSubmissions } = await supabase
        .from('task_submissions')
        .select('task_id, type')
        .in('task_id', taskIds);

      const iterationsMap: Record<string, number> = {};
      allSubmissions?.forEach(s => {
        if (s.type === 'submission') {
          iterationsMap[s.task_id!] = (iterationsMap[s.task_id!] || 0) + 1;
        }
      });

      const ratings = submissions?.map(s => s.rating as number) ?? [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const avgIterations = Object.values(iterationsMap).length > 0
        ? Object.values(iterationsMap).reduce((a, b) => a + b, 0) / Object.values(iterationsMap).length
        : 0;

      return {
        ratings,
        totalTasks: taskIds.length,
        completedTasks: ratings.length,
        avgRating: Math.round(avgRating * 100) / 100,
        avgIterations: Math.round(avgIterations * 100) / 100,
        ratingDistribution: {
          1: ratings.filter(r => r === 1).length,
          2: ratings.filter(r => r === 2).length,
          3: ratings.filter(r => r === 3).length,
          4: ratings.filter(r => r === 4).length,
        },
        timeline: submissions?.map(s => ({ date: s.created_at, rating: s.rating })) ?? [],
      };
    },
    enabled: !!userId,
  });
}
