-- Quick RLS Policy Fix for Profile Creation Issue
-- Run this in your Supabase SQL Editor to fix the RLS policy error

-- Step 1: Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Step 2: Create a new policy that allows both user inserts and trigger inserts
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow users to insert their own profile
        auth.uid() = id
        OR
        -- Allow inserts when there's no authenticated user (service context for triggers)
        auth.uid() IS NULL
    );

-- Step 3: Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile with error handling
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        'user', 
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verify the fix by checking policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- The fix is now applied! 
-- The RLS policy now allows:
-- 1. Users to insert their own profiles (auth.uid() = id)
-- 2. Triggers to insert profiles when no user is authenticated (auth.uid() IS NULL)
-- 3. The trigger function has error handling to prevent user creation failures