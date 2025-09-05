# Supabase Database Setup Guide for DocsDrafter

This guide will help you set up the complete database schema for the DocsDrafter application using Supabase.

## Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install the Supabase CLI
   ```bash
   npm install -g supabase
   ```
3. **Project Setup**: Create a new Supabase project in your dashboard

## Method 1: Using Supabase Dashboard (Recommended for beginners)

### Step 1: Access SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
1. Copy the entire content from `supabase_migration.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the migration

### Step 3: Verify Setup
1. Go to **Table Editor** to see your new tables:
   - `users`
   - `templates` 
   - `documents`
2. Check **Authentication** > **Policies** to verify RLS policies are active

## Method 2: Using Supabase CLI (Recommended for development)

### Step 1: Initialize Supabase in Your Project
```bash
# Navigate to your project directory
cd "C:\Users\hp\Documents\david code\projects\DocsDrafter\DocsDrafter"

# Initialize Supabase
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Create Migration File
```bash
# Generate a new migration
supabase migration new initial_schema
```

### Step 3: Add Migration Content
1. Copy content from `supabase_migration.sql`
2. Paste into the generated migration file in `supabase/migrations/`

### Step 4: Apply Migration
```bash
# Apply migration to local development
supabase db reset

# Push to remote Supabase project
supabase db push
```

## Method 3: Direct SQL Execution

If you prefer to run SQL commands directly:

```sql
-- Connect to your Supabase database and run these commands:

-- 1. Create tables
\i supabase_migration.sql

-- 2. Verify tables were created
\dt public.*

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Database Schema Overview

### Tables Created

#### 1. `profiles` Table
- **Purpose**: Extends Supabase auth.users with additional profile data
- **Columns**:
  - `id` (UUID, Primary Key, References auth.users)
  - `email` (TEXT, Unique)
  - `full_name` (TEXT)
  - `avatar_url` (TEXT)
  - `role` (TEXT, Default: 'user')
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

#### 2. `templates` Table
- **Purpose**: Stores document templates with JSON schema definitions
- **Columns**:
  - `id` (UUID, Primary Key)
  - `name` (TEXT)
  - `json_schema` (JSONB)
  - `description` (TEXT)
  - `created_at` (TIMESTAMP)

#### 3. `documents` Table
- **Purpose**: Tracks user-generated documents
- **Columns**:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to profiles)
  - `template_name` (TEXT)
  - `storage_path` (TEXT)
  - `file_type` (TEXT)
  - `created_at` (TIMESTAMP)

### Row Level Security (RLS) Policies

#### Profiles Table Policies
- Users can only view, update, and insert their own profile
- Prevents users from accessing other users' data

#### Templates Table Policies
- All authenticated users can view templates (public access)
- Authenticated users can create new templates

#### Documents Table Policies
- Users can only access their own documents (full CRUD)
- Complete isolation between users' documents

### Sample Templates Included

1. **Business Letter**: Professional letter template
2. **Invoice**: Itemized billing template
3. **Meeting Minutes**: Structured meeting notes template

## Environment Configuration

Update your `.env` file with Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing the Setup

### 1. Test Authentication
```javascript
// In your app, test user registration
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});
```

### 2. Test Template Access
```javascript
// Fetch available templates
const { data: templates } = await supabase
  .from('templates')
  .select('*');
```

### 3. Test Document Creation
```javascript
// Create a new document
const { data, error } = await supabase
  .from('documents')
  .insert({
    template_name: 'Business Letter',
    storage_path: '/documents/letter_123.pdf',
    file_type: 'pdf'
  });
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure you're authenticated when testing
   - Check that policies are enabled on all tables

2. **Permission Denied**
   - Verify your user has the correct role
   - Check that auth.uid() matches the user_id in queries

3. **Migration Failures**
   - Ensure extensions are enabled
   - Check for syntax errors in SQL
   - Verify foreign key constraints

### Useful Commands

```bash
# Check migration status
supabase migration list

# Reset local database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

## Next Steps

1. **Storage Setup**: Configure Supabase Storage for document files
2. **API Integration**: Update your app to use the new schema
3. **Testing**: Write tests for your database operations
4. **Backup**: Set up automated backups for production

## Security Notes

- All tables have RLS enabled for maximum security
- Users can only access their own data
- Templates are publicly readable but creation is controlled
- The trigger automatically creates user profiles on signup
- Indexes are optimized for common query patterns

For more information, refer to the [Supabase Documentation](https://supabase.com/docs).