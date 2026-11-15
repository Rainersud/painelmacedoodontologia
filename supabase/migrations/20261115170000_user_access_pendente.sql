ALTER TABLE public.user_access DROP CONSTRAINT IF EXISTS user_access_perfil_check;
ALTER TABLE public.user_access ADD CONSTRAINT user_access_perfil_check CHECK (perfil IN ('pendente', 'completo', 'atendimento', 'comparecimento'));
ALTER TABLE public.user_access ALTER COLUMN perfil SET DEFAULT 'pendente';

-- quem cria a própria conta pelo link entra como "pendente" até o administrador liberar
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_access (user_id, perfil) VALUES (NEW.id, 'pendente') ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;
