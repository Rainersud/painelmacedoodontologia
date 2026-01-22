-- Fix the update_updated_at_column function to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix the handle_new_user function to have proper search_path (already has it but ensure SECURITY DEFINER)
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

-- Drop the overly permissive alert insert policy and create a more restrictive one
DROP POLICY IF EXISTS "System can create alerts" ON public.alerts;

CREATE POLICY "Authenticated users can create alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    public.is_admin(auth.uid()) OR
    user_id IS NULL
  );