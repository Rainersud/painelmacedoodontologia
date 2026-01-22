-- Add new lead statuses: resgatado, fechado
-- First, let's add the new columns to leads for closed deals
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS treatment_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('avista', 'parcelado', NULL)),
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rescued_at timestamp with time zone;

-- Update lead_status enum to include 'resgatado' and 'fechado'
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'resgatado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'fechado';

-- Create incentive_plans table for bonus configuration
CREATE TABLE IF NOT EXISTS public.incentive_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  period goal_period NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('agendamentos', 'comparecimentos', 'resgatados', 'fechados')),
  target_value integer NOT NULL,
  bonus_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS on incentive_plans
ALTER TABLE public.incentive_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for incentive_plans
CREATE POLICY "Anyone can view active incentive plans"
ON public.incentive_plans FOR SELECT
USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage incentive plans"
ON public.incentive_plans FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update incentive plans"
ON public.incentive_plans FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete incentive plans"
ON public.incentive_plans FOR DELETE
USING (is_admin(auth.uid()));

-- Create call_logs table for telephony tracking
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  call_type text NOT NULL CHECK (call_type IN ('inbound', 'outbound')),
  duration_seconds integer DEFAULT 0,
  result text CHECK (result IN ('atendida', 'nao_atendida', 'ocupado', 'caixa_postal', 'agendamento', 'follow_up')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_logs
CREATE POLICY "Users can view their call logs"
ON public.call_logs FOR SELECT
USING (is_admin(auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Users can create call logs"
ON public.call_logs FOR INSERT
WITH CHECK (agent_id = auth.uid());

-- Create whatsapp_messages table for WhatsApp integration
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL CHECK (message_type IN ('text', 'image', 'audio', 'document', 'template')),
  content text,
  whatsapp_message_id text,
  status text CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_messages
CREATE POLICY "Users can view messages for their leads"
ON public.whatsapp_messages FOR SELECT
USING (is_admin(auth.uid()) OR agent_id = auth.uid() OR EXISTS (
  SELECT 1 FROM leads WHERE leads.id = whatsapp_messages.lead_id AND leads.assigned_agent_id = auth.uid()
));

CREATE POLICY "Users can create messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (agent_id = auth.uid() OR is_admin(auth.uid()));

-- Add goal types for the new metrics
ALTER TYPE public.goal_type ADD VALUE IF NOT EXISTS 'resgatados';
ALTER TYPE public.goal_type ADD VALUE IF NOT EXISTS 'fechados';

-- Create agent_performance_daily table for tracking daily metrics
CREATE TABLE IF NOT EXISTS public.agent_daily_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  leads_received integer DEFAULT 0,
  leads_attended integer DEFAULT 0,
  calls_made integer DEFAULT 0,
  calls_answered integer DEFAULT 0,
  appointments_scheduled integer DEFAULT 0,
  appointments_confirmed integer DEFAULT 0,
  attended_appointments integer DEFAULT 0,
  no_shows integer DEFAULT 0,
  rescued integer DEFAULT 0,
  closed integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  avg_response_time_seconds integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agent_id, metric_date)
);

-- Enable RLS on agent_daily_metrics
ALTER TABLE public.agent_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view metrics"
ON public.agent_daily_metrics FOR SELECT
USING (is_admin(auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "System can insert metrics"
ON public.agent_daily_metrics FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update metrics"
ON public.agent_daily_metrics FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_daily_metrics_updated_at
BEFORE UPDATE ON public.agent_daily_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();