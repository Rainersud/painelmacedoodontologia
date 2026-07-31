-- Validação server-side (defesa em profundidade) para campos preenchidos por usuários.
-- NOT VALID: aplica-se a novas linhas e atualizações, sem quebrar dados legados.

ALTER TABLE public.leads
  ADD CONSTRAINT leads_name_len CHECK (char_length(name) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT leads_phone_valid CHECK (char_length(phone) BETWEEN 8 AND 25 AND phone ~ '[0-9]') NOT VALID,
  ADD CONSTRAINT leads_email_valid CHECK (email IS NULL OR (char_length(email) <= 255 AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')) NOT VALID,
  ADD CONSTRAINT leads_interest_product_len CHECK (interest_product IS NULL OR char_length(interest_product) <= 120) NOT VALID,
  ADD CONSTRAINT leads_loss_reason_len CHECK (loss_reason IS NULL OR char_length(loss_reason) <= 200) NOT VALID,
  ADD CONSTRAINT leads_notes_len CHECK (notes IS NULL OR char_length(notes) <= 5000) NOT VALID,
  ADD CONSTRAINT leads_interest_rating_range CHECK (interest_rating IS NULL OR interest_rating BETWEEN 0 AND 5) NOT VALID,
  ADD CONSTRAINT leads_discount_range CHECK (discount_percentage >= 0 AND discount_percentage <= 100) NOT VALID;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_title_len CHECK (char_length(title) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT tasks_description_len CHECK (description IS NULL OR char_length(description) <= 5000) NOT VALID,
  ADD CONSTRAINT tasks_response_len CHECK (response IS NULL OR char_length(response) <= 5000) NOT VALID,
  ADD CONSTRAINT tasks_reschedule_reason_len CHECK (reschedule_reason IS NULL OR char_length(reschedule_reason) <= 1000) NOT VALID;

-- Bloqueio de URLs perigosas (javascript:, data:) no banco
ALTER TABLE public.meeting_training_links
  ADD CONSTRAINT meeting_training_links_url_http CHECK (url ~* '^https?://') NOT VALID,
  ADD CONSTRAINT meeting_training_links_url_len CHECK (char_length(url) <= 2048) NOT VALID,
  ADD CONSTRAINT meeting_training_links_title_len CHECK (char_length(title) BETWEEN 1 AND 200) NOT VALID;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_link_url_http CHECK (link_url IS NULL OR (link_url ~* '^https?://' AND char_length(link_url) <= 2048)) NOT VALID,
  ADD CONSTRAINT ad_creatives_name_len CHECK (char_length(name) BETWEEN 1 AND 200) NOT VALID;

ALTER TABLE public.patient_triage
  ADD CONSTRAINT triage_full_name_len CHECK (full_name IS NULL OR char_length(full_name) <= 120) NOT VALID,
  ADD CONSTRAINT triage_email_valid CHECK (email IS NULL OR email = '' OR (char_length(email) <= 255 AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')) NOT VALID,
  ADD CONSTRAINT triage_phone_len CHECK (phone IS NULL OR char_length(phone) <= 25) NOT VALID,
  ADD CONSTRAINT triage_cpf_len CHECK (cpf IS NULL OR char_length(cpf) <= 20) NOT VALID,
  ADD CONSTRAINT triage_address_len CHECK (address IS NULL OR char_length(address) <= 300) NOT VALID;