-- DocsDrafter Supabase Schema Migration
-- This file contains the complete database schema setup for the DocsDrafter application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    json_schema JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    template_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
-- Users can only view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow users to insert their own profile
        auth.uid() = id
        OR
        -- Allow inserts when there's no authenticated user (service context for triggers)
        auth.uid() IS NULL
    );

-- RLS Policies for templates table
-- All authenticated users can view templates (public templates)
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.templates;
CREATE POLICY "Authenticated users can view templates" ON public.templates
    FOR SELECT TO authenticated USING (true);

-- Only authenticated users can create templates (for future admin functionality)
DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.templates;
CREATE POLICY "Authenticated users can create templates" ON public.templates
    FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for documents table
-- Users can only access their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own documents" ON public.documents;
CREATE POLICY "Users can create own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_name ON public.documents(template_name);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates(name);

-- Function to automatically create user profile on signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
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
        -- Log the error and re-throw it to notify the caller
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample templates
INSERT INTO public.templates (name, json_schema, description) VALUES
(
    'Business Letter',
    '{
        "type": "object",
        "properties": {
            "recipient_name": {"type": "string", "title": "Recipient Name"},
            "recipient_address": {"type": "string", "title": "Recipient Address"},
            "subject": {"type": "string", "title": "Subject"},
            "body": {"type": "string", "title": "Letter Body"},
            "sender_name": {"type": "string", "title": "Sender Name"},
            "sender_title": {"type": "string", "title": "Sender Title"}
        },
        "required": ["recipient_name", "subject", "body", "sender_name"]
    }',
    'Professional business letter template with standard formatting'
),
(
    'Invoice',
    '{
        "type": "object",
        "properties": {
            "invoice_number": {"type": "string", "title": "Invoice Number"},
            "client_name": {"type": "string", "title": "Client Name"},
            "client_address": {"type": "string", "title": "Client Address"},
            "invoice_date": {"type": "string", "format": "date", "title": "Invoice Date"},
            "due_date": {"type": "string", "format": "date", "title": "Due Date"},
            "items": {
                "type": "array",
                "title": "Invoice Items",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string", "title": "Description"},
                        "quantity": {"type": "number", "title": "Quantity"},
                        "rate": {"type": "number", "title": "Rate"},
                        "amount": {"type": "number", "title": "Amount"}
                    }
                }
            },
            "total": {"type": "number", "title": "Total Amount"}
        },
        "required": ["invoice_number", "client_name", "invoice_date", "items", "total"]
    }',
    'Professional invoice template with itemized billing'
),
(
    'Meeting Minutes',
    '{
        "type": "object",
        "properties": {
            "meeting_title": {"type": "string", "title": "Meeting Title"},
            "date": {"type": "string", "format": "date", "title": "Meeting Date"},
            "attendees": {"type": "array", "title": "Attendees", "items": {"type": "string"}},
            "agenda_items": {
                "type": "array",
                "title": "Agenda Items",
                "items": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string", "title": "Topic"},
                        "discussion": {"type": "string", "title": "Discussion"},
                        "action_items": {"type": "array", "title": "Action Items", "items": {"type": "string"}}
                    }
                }
            },
            "next_meeting": {"type": "string", "format": "date", "title": "Next Meeting Date"}
        },
        "required": ["meeting_title", "date", "attendees", "agenda_items"]
    }',
    'Structured meeting minutes template with agenda and action items'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.templates IS 'Document templates with JSON schema definitions';
COMMENT ON TABLE public.documents IS 'User-generated documents with template references and file storage paths';

COMMENT ON COLUMN public.templates.json_schema IS 'JSON Schema definition for template fields and validation';
COMMENT ON COLUMN public.documents.storage_path IS 'Path to the generated document file in Supabase Storage';
COMMENT ON COLUMN public.documents.template_name IS 'Reference to the template used for document generation';