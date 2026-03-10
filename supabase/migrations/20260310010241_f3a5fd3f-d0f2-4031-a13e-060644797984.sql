
-- Create lead stage history table
CREATE TABLE public.lead_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view stage history"
  ON public.lead_stage_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stage history"
  ON public.lead_stage_history FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage history"
  ON public.lead_stage_history FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_stage_history;
