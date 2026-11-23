-- Comunicação da equipe: recados De → Para, com anexos (texto, áudio, imagem, vídeo).
-- Só os envolvidos (quem mandou e quem recebe) e o administrador veem; só quem recebe conclui.
CREATE TABLE IF NOT EXISTS public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  texto text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  done_by uuid
);
CREATE INDEX IF NOT EXISTS team_messages_to_idx ON public.team_messages (to_user, done_at);
CREATE INDEX IF NOT EXISTS team_messages_from_idx ON public.team_messages (from_user);

CREATE TABLE IF NOT EXISTS public.team_message_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  mime text,
  size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_message_files_msg_idx ON public.team_message_files (message_id);

CREATE OR REPLACE FUNCTION public.can_see_team_message(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_messages m
    WHERE m.id = _id AND (m.from_user = auth.uid() OR m.to_user = auth.uid() OR public.is_admin(auth.uid()))
  );
$$;

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Envolvidos e admin veem" ON public.team_messages FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Envia em seu nome (admin por qualquer um)" ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (from_user = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "So quem recebe conclui" ON public.team_messages FOR UPDATE TO authenticated
  USING (to_user = auth.uid()) WITH CHECK (to_user = auth.uid());
CREATE POLICY "Quem mandou ou admin apaga" ON public.team_messages FOR DELETE TO authenticated
  USING (from_user = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));

-- só a data de conclusão muda: texto, remetente e destinatário ficam travados no update
CREATE OR REPLACE FUNCTION public.team_messages_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.from_user := OLD.from_user; NEW.to_user := OLD.to_user; NEW.texto := OLD.texto;
  NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at;
  NEW.done_by := CASE WHEN NEW.done_at IS NULL THEN NULL ELSE auth.uid() END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_team_messages_lock BEFORE UPDATE ON public.team_messages FOR EACH ROW EXECUTE FUNCTION public.team_messages_lock();

ALTER TABLE public.team_message_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Envolvidos e admin veem anexos" ON public.team_message_files FOR SELECT TO authenticated
  USING (public.can_see_team_message(message_id));
CREATE POLICY "Anexa quem ve o recado" ON public.team_message_files FOR INSERT TO authenticated
  WITH CHECK (public.can_see_team_message(message_id));
CREATE POLICY "Apaga anexo quem ve o recado" ON public.team_message_files FOR DELETE TO authenticated
  USING (public.can_see_team_message(message_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('team-messages', 'team-messages', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- arquivos ficam em <id do recado>/<arquivo>
CREATE POLICY "recados: ler se envolvido" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-messages' AND public.can_see_team_message(((storage.foldername(name))[1])::uuid));
CREATE POLICY "recados: enviar se envolvido" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-messages' AND public.can_see_team_message(((storage.foldername(name))[1])::uuid));
CREATE POLICY "recados: apagar se envolvido" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-messages' AND public.can_see_team_message(((storage.foldername(name))[1])::uuid));

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
