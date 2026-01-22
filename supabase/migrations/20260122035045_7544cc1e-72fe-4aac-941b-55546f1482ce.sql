-- Fix permissive RLS policies on agent_daily_metrics
DROP POLICY IF EXISTS "System can insert metrics" ON public.agent_daily_metrics;
DROP POLICY IF EXISTS "System can update metrics" ON public.agent_daily_metrics;

-- Create proper RLS policies for agent_daily_metrics
CREATE POLICY "Users can insert their own metrics"
ON public.agent_daily_metrics FOR INSERT
WITH CHECK (agent_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update their own metrics"
ON public.agent_daily_metrics FOR UPDATE
USING (agent_id = auth.uid() OR is_admin(auth.uid()));