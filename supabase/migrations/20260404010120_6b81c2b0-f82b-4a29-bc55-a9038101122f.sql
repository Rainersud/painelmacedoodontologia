
-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'semanal',
  general_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update meetings" ON public.meetings FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete meetings" ON public.meetings FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Meeting action plans
CREATE TABLE public.meeting_action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible TEXT NOT NULL,
  execution_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  related_metric TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view action plans" ON public.meeting_action_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert action plans" ON public.meeting_action_plans FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update action plans" ON public.meeting_action_plans FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete action plans" ON public.meeting_action_plans FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Meeting annotations per metric
CREATE TABLE public.meeting_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view annotations" ON public.meeting_annotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert annotations" ON public.meeting_annotations FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update annotations" ON public.meeting_annotations FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete annotations" ON public.meeting_annotations FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Meeting training links
CREATE TABLE public.meeting_training_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_training_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view training links" ON public.meeting_training_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert training links" ON public.meeting_training_links FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete training links" ON public.meeting_training_links FOR DELETE TO authenticated USING (is_admin(auth.uid()));
