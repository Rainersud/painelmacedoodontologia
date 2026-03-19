
-- Drop existing restrictive policies on tasks
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;

-- Create new open policies for all authenticated users
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (true);
