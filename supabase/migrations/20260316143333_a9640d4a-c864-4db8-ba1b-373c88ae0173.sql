
CREATE TABLE public.patient_triage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  filled_by UUID NOT NULL,
  filled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  triage_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Identification
  full_name TEXT,
  phone TEXT,
  nickname TEXT,
  email TEXT,
  address TEXT,
  cep TEXT,
  cpf TEXT,
  birth_date DATE,
  profession TEXT,
  instagram TEXT,
  facebook TEXT,

  -- Consultation reason
  motivation TEXT[] DEFAULT '{}',
  motivation_other TEXT,
  discomfort_duration TEXT,

  -- Oral condition
  uses_prosthesis BOOLEAN,
  prosthesis_duration TEXT,
  difficulty_chewing BOOLEAN,
  ashamed_to_smile BOOLEAN,
  previous_implants BOOLEAN,
  fear_of_dentist TEXT,

  -- Aesthetic / emotional
  smile_discomfort_score INTEGER,
  mirror_concern TEXT,
  desired_smile_change TEXT,
  desired_feeling TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_triage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view triage" ON public.patient_triage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert triage" ON public.patient_triage
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update triage" ON public.patient_triage
  FOR UPDATE TO authenticated USING (true);

CREATE UNIQUE INDEX idx_patient_triage_lead_id ON public.patient_triage(lead_id);
