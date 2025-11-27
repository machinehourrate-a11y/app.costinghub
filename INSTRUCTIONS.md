# Supabase Database Setup: Full Library Permissions & Schema

If you are encountering errors like "violates row-level security policy" OR "violates not-null constraint" for any of the library tables (`processes`, `materials`, `machines`, `tools`), it means your database needs a one-time configuration. This script will set up the correct permissions for all libraries.

**Important:** When you run this SQL script, Supabase will return "Success. No rows returned." This is the **correct** output and means the commands worked. The error happens inside the application, and the fix requires two steps: running the script, and then logging out and back in.

## Instructions

1.  Navigate to the **SQL Editor** section in your Supabase dashboard.
2.  Click on **"+ New query"**.
3.  Copy and paste the **entire** SQL code block below into the editor.
4.  **Important:** Review the list of emails in the `is_superadmin` function and ensure your super admin email addresses are included.
5.  Click **"Run"**. You should see the message "Success. No rows returned."
6.  **Crucial Step:** Go back to your application, **log out completely**, and then **log back in** using one of the super admin email addresses. This one-time action allows the application to seed the global library data correctly with the new database rules.

---

### SQL Code to Run

```sql
-- Step 1: Create a helper function to identify Super Admins by their email.
-- IMPORTANT: Make sure your super admin email(s) are in this list.
CREATE OR REPLACE FUNCTION is_superadmin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_email text;
BEGIN
  -- We need to bypass RLS on auth.users to read the email, so we use `security definer`.
  -- This is safe as it only checks against a hardcoded list of emails.
  SELECT u.email INTO user_email FROM auth.users u WHERE u.id = user_id;
  RETURN user_email IN (
    'designersworldcbe@gmail.com', 
    'admin@costinghub.com', 
    'machinehourrate@gmail.com', 
    'gokulprasadrs20@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 2: Configure the 'processes' table
-- Allow 'user_id' to be NULL for global (default) items.
ALTER TABLE public.processes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Remove old policies to prevent conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.processes;
DROP POLICY IF EXISTS "Users can insert their own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can update their own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can delete their own processes" ON public.processes;
DROP POLICY IF EXISTS "Superadmins can manage global processes" ON public.processes;

-- Create new policies for 'processes'
CREATE POLICY "Enable read access for all users" ON public.processes FOR SELECT USING ((user_id IS NULL) OR (user_id = auth.uid()));
CREATE POLICY "Users can insert their own processes" ON public.processes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own processes" ON public.processes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own processes" ON public.processes FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Superadmins can manage global processes" ON public.processes FOR ALL USING (is_superadmin(auth.uid()) AND user_id IS NULL) WITH CHECK (is_superadmin(auth.uid()) AND user_id IS NULL);


-- Step 3: Configure the 'materials' table
ALTER TABLE public.materials ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Users can insert their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.materials;
DROP POLICY IF EXISTS "Superadmins can manage global materials" ON public.materials;

CREATE POLICY "Enable read access for all users" ON public.materials FOR SELECT USING ((user_id IS NULL) OR (user_id = auth.uid()));
CREATE POLICY "Users can insert their own materials" ON public.materials FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own materials" ON public.materials FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own materials" ON public.materials FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Superadmins can manage global materials" ON public.materials FOR ALL USING (is_superadmin(auth.uid()) AND user_id IS NULL) WITH CHECK (is_superadmin(auth.uid()) AND user_id IS NULL);


-- Step 4: Configure the 'machines' table
ALTER TABLE public.machines ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.machines;
DROP POLICY IF EXISTS "Users can insert their own machines" ON public.machines;
DROP POLICY IF EXISTS "Users can update their own machines" ON public.machines;
DROP POLICY IF EXISTS "Users can delete their own machines" ON public.machines;
DROP POLICY IF EXISTS "Superadmins can manage global machines" ON public.machines;

CREATE POLICY "Enable read access for all users" ON public.machines FOR SELECT USING ((user_id IS NULL) OR (user_id = auth.uid()));
CREATE POLICY "Users can insert their own machines" ON public.machines FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own machines" ON public.machines FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own machines" ON public.machines FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Superadmins can manage global machines" ON public.machines FOR ALL USING (is_superadmin(auth.uid()) AND user_id IS NULL) WITH CHECK (is_superadmin(auth.uid()) AND user_id IS NULL);


-- Step 5: Configure the 'tools' table
ALTER TABLE public.tools ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.tools;
DROP POLICY IF EXISTS "Users can insert their own tools" ON public.tools;
DROP POLICY IF EXISTS "Users can update their own tools" ON public.tools;
DROP POLICY IF EXISTS "Users can delete their own tools" ON public.tools;
DROP POLICY IF EXISTS "Superadmins can manage global tools" ON public.tools;

CREATE POLICY "Enable read access for all users" ON public.tools FOR SELECT USING ((user_id IS NULL) OR (user_id = auth.uid()));
CREATE POLICY "Users can insert their own tools" ON public.tools FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own tools" ON public.tools FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own tools" ON public.tools FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Superadmins can manage global tools" ON public.tools FOR ALL USING (is_superadmin(auth.uid()) AND user_id IS NULL) WITH CHECK (is_superadmin(auth.uid()) AND user_id IS NULL);
```