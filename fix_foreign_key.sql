-- This script fixes the foreign key constraint on the 'documents' table.
-- It ensures that 'documents.user_id' correctly references 'public.profiles(id)'.

-- Drop the incorrect foreign key constraint if it exists.
-- The original constraint was likely pointing to auth.users instead of public.profiles.
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

-- Add the correct foreign key constraint.
-- This constraint links the 'documents' table to the 'profiles' table.
ALTER TABLE public.documents
ADD CONSTRAINT documents_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles (id)
ON DELETE CASCADE;

-- Backfill any missing user profiles.
-- This ensures that every user in 'auth.users' has a corresponding entry in 'public.profiles'.
INSERT INTO public.profiles (id, email, role, full_name)
SELECT
    u.id,
    u.email,
    'user' AS role,
    COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name
FROM
    auth.users u
LEFT JOIN
    public.profiles p ON u.id = p.id
WHERE
    p.id IS NULL;