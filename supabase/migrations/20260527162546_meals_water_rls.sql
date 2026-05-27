ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_intake TO authenticated;
GRANT ALL ON public.water_intake TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='Select own meals') THEN
    CREATE POLICY "Select own meals" ON public.meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='Insert own meals') THEN
    CREATE POLICY "Insert own meals" ON public.meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='Update own meals') THEN
    CREATE POLICY "Update own meals" ON public.meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='Delete own meals') THEN
    CREATE POLICY "Delete own meals" ON public.meals FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_intake' AND policyname='Select own water') THEN
    CREATE POLICY "Select own water" ON public.water_intake FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_intake' AND policyname='Insert own water') THEN
    CREATE POLICY "Insert own water" ON public.water_intake FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_intake' AND policyname='Update own water') THEN
    CREATE POLICY "Update own water" ON public.water_intake FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='water_intake' AND policyname='Delete own water') THEN
    CREATE POLICY "Delete own water" ON public.water_intake FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.meals REPLICA IDENTITY FULL;
ALTER TABLE public.water_intake REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='meals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='water_intake') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.water_intake;
  END IF;
END $$;
