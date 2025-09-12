-- Consolidated RLS Policies for DocsDrafter
-- This script drops and recreates all necessary RLS policies for the application.
-- Run this in your Supabase SQL Editor to ensure all policies are correctly configured.

--
-- RLS Policies for `profiles` table
--

-- 1. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Service can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and system can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;


-- 2. Create SELECT policy: Users can view their own profile.
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 3. Create UPDATE policy: Users can update their own profile.
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Create INSERT policy: Allows users to create their own profile and allows the
--    system trigger (handle_new_user) to create a profile during sign-up.
CREATE POLICY "Users and system can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

--
-- RLS Policies for `documents` table
--

-- 1. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;


-- 2. Create SELECT policy: Users can view their own documents.
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Create INSERT policy: Users can create documents for themselves.
CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create UPDATE policy: Users can update their own documents.
CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Create DELETE policy: Users can delete their own documents.
CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

--
-- RLS Policies for `templates` table (for completeness)
--

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.templates;
DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.templates;

-- 2. Create SELECT policy: All authenticated users can view templates.
CREATE POLICY "Authenticated users can view templates" ON public.templates
    FOR SELECT TO authenticated USING (true);

-- 3. Create INSERT policy: Allow authenticated users to create templates (for future admin use).
CREATE POLICY "Authenticated users can create templates" ON public.templates
    FOR INSERT TO authenticated WITH CHECK (true);

--
-- RLS Policies for Storage 'documents' bucket
--

-- Drop existing storage policies for this bucket
DROP POLICY IF EXISTS "Allow upload own files to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow read own files from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own files in documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own files in documents" ON storage.objects;

-- Insert: Authenticated users can upload files into their own folder (prefix = user.id)
CREATE POLICY "Allow upload own files to documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Select: Authenticated users can read files from their own folder
CREATE POLICY "Allow read own files from documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: Authenticated users can update files in their own folder
CREATE POLICY "Allow update own files in documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: Authenticated users can delete files in their own folder
CREATE POLICY "Allow delete own files in documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );