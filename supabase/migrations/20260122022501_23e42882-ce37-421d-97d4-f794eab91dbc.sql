-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'agente');

-- Create enum for lead status (funnel stages)
CREATE TYPE public.lead_status AS ENUM (
  'novo_lead',
  'em_atendimento',
  'consulta_agendada',
  'confirmado',
  'compareceu',
  'nao_compareceu',
  'nao_convertido'
);

-- Create enum for lead source
CREATE TYPE public.lead_source AS ENUM (
  'whatsapp',
  'telefone',
  'site',
  'indicacao',
  'instagram',
  'facebook',
  'google_ads',
  'outro'
);

-- Create enum for interaction type
CREATE TYPE public.interaction_type AS ENUM (
  'whatsapp_recebido',
  'whatsapp_enviado',
  'ligacao_recebida',
  'ligacao_realizada',
  'nota',
  'agendamento',
  'confirmacao',
  'lembrete'
);

-- Create enum for goal type
CREATE TYPE public.goal_type AS ENUM (
  'leads_atendidos',
  'consultas_agendadas',
  'taxa_conversao',
  'taxa_comparecimento',
  'receita'
);

-- Create enum for goal period
CREATE TYPE public.goal_period AS ENUM ('diario', 'semanal', 'mensal');

-- Create enum for alert type
CREATE TYPE public.alert_type AS ENUM (
  'lead_nao_respondido',
  'meta_nao_atingida',
  'lembrete_followup',
  'kpi_baixo'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source lead_source NOT NULL DEFAULT 'outro',
  status lead_status NOT NULL DEFAULT 'novo_lead',
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  estimated_value DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_response_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Create lead_interactions table
CREATE TABLE public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type interaction_type NOT NULL,
  content TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  treatment_type TEXT,
  revenue DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type goal_type NOT NULL,
  period goal_period NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Profile policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Leads policies
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR assigned_agent_id = auth.uid());

CREATE POLICY "Admins can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR assigned_agent_id = auth.uid());

CREATE POLICY "Users can update assigned leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR assigned_agent_id = auth.uid());

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Lead interactions policies
CREATE POLICY "Users can view interactions of assigned leads"
  ON public.lead_interactions FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_interactions.lead_id 
      AND leads.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert interactions"
  ON public.lead_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Appointments policies
CREATE POLICY "Users can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Users can insert appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Users can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR agent_id = auth.uid());

-- Goals policies
CREATE POLICY "Users can view their goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can manage goals"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update goals"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete goals"
  ON public.goals FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Alerts policies
CREATE POLICY "Users can view their alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_admin(auth.uid()));

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leads_assigned_agent ON public.leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_appointments_agent_id ON public.appointments(agent_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);