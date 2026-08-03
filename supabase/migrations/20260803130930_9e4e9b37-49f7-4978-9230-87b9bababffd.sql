DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tbl
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "App open access" ON public.%I', t.tbl);
    EXECUTE format('CREATE POLICY "App open access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t.tbl);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;