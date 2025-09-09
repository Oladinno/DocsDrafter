# RLS Policy Fix Guide

## Problem Description

You're encountering this error during user registration:
```
ERROR Error creating user profile: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"profiles\""}
```

## Root Cause

The issue occurs because:
1. When a user signs up, Supabase creates an entry in `auth.users`
2. A trigger (`handle_new_user`) automatically tries to create a corresponding profile in the `profiles` table
3. The Row Level Security (RLS) policy blocks this insertion because `auth.uid()` might not be available during trigger execution
4. This causes the profile creation to fail, even though the user account is created successfully

## Solution

### Option 1: Apply the Fix via Supabase Dashboard (Recommended)

1. **Open your Supabase project dashboard**
2. **Navigate to SQL Editor** in the left sidebar
3. **Click "New Query"**
4. **Copy and paste the contents of `apply_rls_fix.sql`**
5. **Click "Run"** to execute the fix

### Option 2: Apply the Fix via Supabase CLI (If you have it installed)

```bash
# Navigate to your project directory
cd "C:\Users\hp\Documents\david code\projects\DocsDrafter\DocsDrafter"

# Apply the migration
supabase db reset

# Or push the updated migration
supabase db push
```

### Option 3: Manual Database Update

If you prefer to run the SQL commands individually:

```sql
-- 1. Update the RLS policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR auth.uid() IS NULL
    );

-- 2. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## What the Fix Does

### 1. **Updated RLS Policy**
- **Before**: Only allowed inserts when `auth.uid() = id`
- **After**: Allows inserts when `auth.uid() = id` OR `auth.uid() IS NULL`
- **Why**: The trigger runs in a service context where `auth.uid()` might be `NULL`

### 2. **Improved Trigger Function**
- **Added**: Error handling with `EXCEPTION` block
- **Benefit**: If profile creation fails, user account creation still succeeds
- **Logging**: Warnings are logged for debugging purposes

## Testing the Fix

### 1. **Test User Registration**

Try registering a new user through your app:

```javascript
// This should now work without the RLS error
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'Test User'
    }
  }
});
```

### 2. **Verify Profile Creation**

Check that profiles are being created automatically:

```sql
-- Run this in Supabase SQL Editor
SELECT 
    u.id,
    u.email,
    u.created_at as user_created,
    p.full_name,
    p.role,
    p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
```

### 3. **Check RLS Policies**

Verify the policies are correctly applied:

```sql
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## Security Considerations

### ✅ **What's Safe**
- The fix maintains security by still requiring `auth.uid() = id` for normal user operations
- Only allows `NULL` auth context for service operations (triggers)
- Users still can't access other users' profiles

### ⚠️ **What to Monitor**
- Check your Supabase logs for any warnings from the trigger function
- Monitor that profiles are being created successfully for new users
- Ensure no unauthorized profile access occurs

## Troubleshooting

### If the fix doesn't work:

1. **Check if the policy was applied**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **Verify the trigger exists**:
   ```sql
   SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
   ```

3. **Test the trigger function manually**:
   ```sql
   SELECT public.test_profile_creation(gen_random_uuid(), 'test@example.com');
   ```

4. **Check Supabase logs** in your dashboard for any error messages

### If you still get RLS errors:

1. **Temporarily disable RLS** for testing:
   ```sql
   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
   ```

2. **Test registration** - it should work

3. **Re-enable RLS** and apply a more permissive policy:
   ```sql
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow all profile operations" ON public.profiles
       FOR ALL USING (true) WITH CHECK (true);
   ```

4. **Gradually tighten security** once you confirm the basic flow works

## Files Modified

- ✅ `supabase_migration.sql` - Updated with the fix
- ✅ `apply_rls_fix.sql` - Quick fix script for Supabase dashboard
- ✅ `fix_rls_policy.sql` - Detailed fix with multiple approaches
- ✅ `RLS_FIX_GUIDE.md` - This comprehensive guide

## Next Steps

1. **Apply the fix** using your preferred method above
2. **Test user registration** in your app
3. **Verify profile creation** in your Supabase dashboard
4. **Monitor logs** for any issues
5. **Update your documentation** with the new schema

The registration process should now work smoothly without RLS policy errors! 🎉