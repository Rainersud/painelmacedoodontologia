import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { describeError } from '@/lib/errors';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Meeting {
  id: string;
  meeting_date: string;
  period_type: string;
  general_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingActionPlan {
  id: string;
  meeting_id: string;
  description: string;
  responsible: string;
  execution_date: string | null;
  completion_date: string | null;
  status: string;
  related_metric: string | null;
  created_at: string;
}

export interface MeetingAnnotation {
  id: string;
  meeting_id: string;
  metric_key: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface MeetingTrainingLink {
  id: string;
  meeting_id: string;
  title: string;
  url: string;
  created_at: string;
}

export function useMeetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const meetingsQuery = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings' as any)
        .select('*')
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Meeting[];
    },
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: { meeting_date: string; period_type: string; general_notes?: string }) => {
      const { data, error } = await supabase
        .from('meetings' as any)
        .insert({ ...meeting, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião criada!');
    },
    onError: (e) => toast.error(`Não foi possível criar reunião. ${describeError(e)}`),
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; general_notes?: string; period_type?: string }) => {
      const { error } = await supabase
        .from('meetings' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião atualizada');
    },
    onError: (e) => toast.error(`Não foi possível atualizar. ${describeError(e)}`),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meetings' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião removida');
    },
    onError: (e) => toast.error(`Não foi possível remover. ${describeError(e)}`),
  });

  return { meetings: meetingsQuery.data || [], isLoading: meetingsQuery.isLoading, createMeeting, updateMeeting, deleteMeeting };
}

export function useMeetingActionPlans(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meeting-action-plans', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('meeting_action_plans' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as MeetingActionPlan[];
    },
    enabled: !!meetingId,
  });

  const addPlan = useMutation({
    mutationFn: async (plan: Omit<MeetingActionPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('meeting_action_plans' as any).insert(plan as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-plans', meetingId] });
      toast.success('Plano de ação adicionado');
    },
    onError: (e) => toast.error(`Não foi possível adicionar plano. ${describeError(e)}`),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; completion_date?: string; description?: string; responsible?: string }) => {
      const { error } = await supabase.from('meeting_action_plans' as any).update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-plans', meetingId] });
      toast.success('Plano atualizado');
    },
    onError: (e) => toast.error(`Não foi possível atualizar plano. ${describeError(e)}`),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meeting_action_plans' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-action-plans', meetingId] });
      toast.success('Plano removido');
    },
    onError: (e) => toast.error(`Não foi possível remover plano. ${describeError(e)}`),
  });

  return { plans: query.data || [], isLoading: query.isLoading, addPlan, updatePlan, deletePlan };
}

export function useMeetingAnnotations(meetingId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meeting-annotations', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('meeting_annotations' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as MeetingAnnotation[];
    },
    enabled: !!meetingId,
  });

  const addAnnotation = useMutation({
    mutationFn: async (ann: { metric_key: string; content: string }) => {
      const { error } = await supabase.from('meeting_annotations' as any).insert({ ...ann, meeting_id: meetingId, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-annotations', meetingId] });
      toast.success('Anotação salva');
    },
    onError: (e) => toast.error(`Não foi possível salvar anotação. ${describeError(e)}`),
  });

  return { annotations: query.data || [], isLoading: query.isLoading, addAnnotation };
}

export function useMeetingTrainingLinks(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meeting-training-links', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('meeting_training_links' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MeetingTrainingLink[];
    },
    enabled: !!meetingId,
  });

  const addLink = useMutation({
    mutationFn: async (link: { title: string; url: string }) => {
      const { error } = await supabase.from('meeting_training_links' as any).insert({ ...link, meeting_id: meetingId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-training-links', meetingId] });
      toast.success('Link adicionado');
    },
    onError: (e) => toast.error(`Não foi possível adicionar link. ${describeError(e)}`),
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meeting_training_links' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-training-links', meetingId] });
      toast.success('Link removido');
    },
    onError: (e) => toast.error(`Não foi possível remover link. ${describeError(e)}`),
  });

  return { links: query.data || [], isLoading: query.isLoading, addLink, deleteLink };
}
