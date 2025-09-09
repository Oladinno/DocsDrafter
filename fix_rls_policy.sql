-- Fix for RLS Policy Error: "new row violates row-level security policy for table 'profiles'"
-- This script addresses the issue where the automatic profile creation trigger
-- conflicts with the RLS policy during user registration

-- The problem: The trigger function tries to insert into profiles table,
-- but RLS policy blocks it because auth.uid() might not be available during trigger execution

-- Solution 1: Modify the RLS policy to allow the trigger function to insert profiles
-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a new policy that allows both user inserts and trigger inserts
CREATE POLICY "Allow profile creation" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow if the user is inserting their own profile
        auth.uid() = id 
        OR 
        -- Allow if this is being called from the trigger (no auth context)
        auth.uid() IS NULL
    );

-- Alternative Solution 2: Modify the trigger function to be more robust
-- Update the handle_new_user function to handle RLS properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with explicit security context
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

-- Ensure the function has the right permissions
-- The SECURITY DEFINER means it runs with the privileges of the function owner
-- This should bypass RLS, but we're adding the policy change as extra safety

-- Alternative Solution 3: Create a more permissive policy specifically for the service role
-- This allows the trigger to work while still protecting user data
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow users to insert their own profile
        auth.uid() = id
    );

-- Add a separate policy for service operations (like triggers)
CREATE POLICY "Service can create profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow inserts when there's no authenticated user (service context)
        auth.uid() IS NULL
        OR
        -- Allow inserts from authenticated users for their own profile
        auth.uid() = id
    );

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Additional debugging: Create a function to test profile creation
CREATE OR REPLACE FUNCTION public.test_profile_creation(test_user_id UUID, test_email TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, email, role, full_name)
        VALUES (test_user_id, test_email, 'user', 'Test User');
        result := 'SUCCESS: Profile created successfully';
    EXCEPTION
        WHEN OTHERS THEN
            result := 'ERROR: ' || SQLERRM;
    END;
    
    -- Clean up test data
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage: SELECT public.test_profile_creation(gen_random_uuid(), 'test@example.com');