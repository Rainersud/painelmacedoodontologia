-- Add new status values to lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'followup_1';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'followup_2';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'followup_3';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'followup_4';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'agendou';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'faltou';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'potencial';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'acompanhamento';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pos_venda';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'sem_interesse';

-- Add new columns to leads table for CRM features
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_product TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_rating INTEGER DEFAULT 0 CHECK (interest_rating >= 0 AND interest_rating <= 5);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scheduled_appointment_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Create tasks table for CRM task management
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('ligacao', 'tarefa', 'compromisso', 'followup')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'reagendado', 'cancelado')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can view their tasks" ON public.tasks
  FOR SELECT USING (is_admin(auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Users can insert their tasks" ON public.tasks
  FOR INSERT WITH CHECK (agent_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update their tasks" ON public.tasks
  FOR UPDATE USING (agent_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their tasks" ON public.tasks
  FOR DELETE USING (agent_id = auth.uid() OR is_admin(auth.uid()));

-- Create trigger for updating updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity_logs table for CRM activity timeline
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('lead_created', 'status_changed', 'task_created', 'task_completed', 'note_added', 'call_logged', 'appointment_scheduled', 'value_updated', 'lead_edited')),
  title TEXT NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Users can view activity logs" ON public.activity_logs
  FOR SELECT USING (is_admin(auth.uid()) OR agent_id = auth.uid() OR EXISTS (
    SELECT 1 FROM leads WHERE leads.id = activity_logs.lead_id AND leads.assigned_agent_id = auth.uid()
  ));

CREATE POLICY "Users can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (agent_id = auth.uid() OR is_admin(auth.uid()));

-- Create meta_settings table for editable targets
CREATE TABLE IF NOT EXISTS public.meta_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meta_settings
ALTER TABLE public.meta_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meta_settings
CREATE POLICY "Anyone can view meta settings" ON public.meta_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage meta settings" ON public.meta_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Insert default meta settings
INSERT INTO public.meta_settings (setting_key, setting_value, description) VALUES
  ('daily_leads_target', 36, 'Meta diária de leads novos'),
  ('daily_appointments_target', 9, 'Meta diária de agendamentos'),
  ('daily_attendance_target', 5, 'Meta diária de comparecimentos'),
  ('daily_rescued_target', 3, 'Meta diária de resgatados'),
  ('daily_closed_target', 1, 'Meta diária de fechamentos'),
  ('healthy_appointment_rate', 35, 'Taxa saudável de agendamento (%)'),
  ('healthy_attendance_rate', 35, 'Taxa saudável de comparecimento (%)'),
  ('healthy_closing_rate', 30, 'Taxa saudável de fechamento (%)'),
  ('monthly_revenue_target', 100000, 'Meta mensal de faturamento'),
  ('investment', 10000, 'Investimento mensal'),
  ('bonus_appointments', 50, 'Bônus por meta de agendamentos batida'),
  ('bonus_attendance', 75, 'Bônus por meta de comparecimentos batida'),
  ('bonus_rescued', 100, 'Bônus por meta de resgatados batida'),
  ('bonus_closed', 200, 'Bônus por meta de fechamentos batida')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;