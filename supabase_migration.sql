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
    metadata JSONB DEFAULT '{}'::jsonb,
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
        -- Return NEW to allow user creation to proceed despite profile creation failure
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure 'metadata' column exists for legacy databases
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Insert some sample templates with metadata.templateConfig for structured rendering
INSERT INTO public.templates (name, json_schema, description, metadata) VALUES
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
    'Professional business letter template with standard formatting',
'{
  "templateConfig": {
    "title": "Business Letter",
    "styles": {
      "page": {"margin": "24px", "fontFamily": "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "color": "#111827"},
      "h1": {"fontSize": "20px", "margin": "0 0 16px"},
      "p": {"margin": "0 0 12px"},
      "table": {"borderCollapse": "collapse", "width": "100%", "fontSize": "14px"}
    },
    "blocks": [
      {"type": "heading", "level": 1, "text": "Business Letter"},
      {"type": "keyValueTable", "rows": [
        {"label": "Recipient Name", "bind": {"path": "recipient_name"}},
        {"label": "Recipient Address", "bind": {"path": "recipient_address"}}
      ]},
      {"type": "paragraph", "text": "Subject: {{subject}}"},
      {"type": "paragraph", "text": "Dear {{recipient_name}},"},
      {"type": "paragraph", "bind": {"path": "body"}},
      {"type": "signature", "name": {"bind": {"path": "sender_name"}}, "title": {"bind": {"path": "sender_title"}}}
    ]
  }
}'
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
    'Professional invoice template with itemized billing',
'{
  "templateConfig": {
    "title": "Invoice",
    "styles": {
      "page": {"margin": "24px", "fontFamily": "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "color": "#111827"},
      "h1": {"fontSize": "22px", "margin": "0 0 16px"},
      "p": {"margin": "0 0 8px"},
      "table": {"borderCollapse": "collapse", "width": "100%", "fontSize": "14px"}
    },
    "blocks": [
      {"type": "heading", "level": 1, "text": "Invoice {{invoice_number}}"},
      {"type": "keyValueTable", "rows": [
        {"label": "Client Name", "bind": {"path": "client_name"}},
        {"label": "Client Address", "bind": {"path": "client_address"}},
        {"label": "Invoice Date", "bind": {"path": "invoice_date"}},
        {"label": "Due Date", "bind": {"path": "due_date"}}
      ]},
      {"type": "table", "sourcePath": "items", "columns": [
        {"header": "Description", "path": "description"},
        {"header": "Quantity", "path": "quantity"},
        {"header": "Rate", "path": "rate"},
        {"header": "Amount", "path": "amount"}
      ]},
      {"type": "paragraph", "text": "Total: {{total}}"}
    ]
  }
}'
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
    'Structured meeting minutes template with agenda and action items',
'{
  "templateConfig": {
    "title": "Meeting Minutes",
    "styles": {
      "page": {"margin": "24px", "fontFamily": "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "color": "#111827"},
      "h1": {"fontSize": "20px", "margin": "0 0 16px"},
      "p": {"margin": "0 0 8px"},
      "table": {"borderCollapse": "collapse", "width": "100%", "fontSize": "14px"}
    },
    "blocks": [
      {"type": "heading", "level": 1, "text": "Meeting Minutes: {{meeting_title}}"},
      {"type": "keyValueTable", "rows": [
        {"label": "Date", "bind": {"path": "date"}}
      ]},
      {"type": "paragraph", "text": "Attendees:"},
      {"type": "list", "ordered": false, "sourcePath": "attendees"},
      {"type": "paragraph", "text": "Agenda Items:"},
      {"type": "table", "sourcePath": "agenda_items", "columns": [
        {"header": "Topic", "path": "topic"},
        {"header": "Discussion", "path": "discussion"},
        {"header": "Action Items", "path": "action_items"}
      ]},
      {"type": "paragraph", "text": "Next Meeting: {{next_meeting}}"}
    ]
  }
}'
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

-- Seed: Appraisal Letter template (structured letter format)
INSERT INTO public.templates (name, json_schema, description, metadata)
SELECT 'Appraisal Letter',
'{
  "type": "object",
  "properties": {
    "company_letterhead": {"type": "string", "title": "Company Letterhead"},
    "date": {"type": "string", "title": "Date (DD/MM/YYYY)"},
    "employee_full_name": {"type": "string", "title": "Employee Full Name"},
    "employee_first_name": {"type": "string", "title": "Employee First Name"},
    "designation": {"type": "string", "title": "Designation"},
    "department": {"type": "string", "title": "Department"},
    "period_start_date": {"type": "string", "title": "Start Date (DD/MM/YYYY)"},
    "period_end_date": {"type": "string", "title": "End Date (DD/MM/YYYY)"},
    "key_areas": {"type": "array", "title": "Key Areas", "items": {"type": "string"}},
    "specific_achievement": {"type": "string", "title": "Specific Achievement / Initiative"},
    "old_salary": {"type": "string", "title": "Current Salary"},
    "new_salary": {"type": "string", "title": "Revised Salary"},
    "effective_from": {"type": "string", "title": "Effective From (DD/MM/YYYY)"},
    "future_assignment": {"type": "string", "title": "Future Project/Department/Role"},
    "authorized_person_name": {"type": "string", "title": "Authorized Person Name"},
    "authorized_person_designation": {"type": "string", "title": "Authorized Person Designation"},
    "company_name": {"type": "string", "title": "Company Name"}
  },
  "required": [
    "date",
    "employee_full_name",
    "employee_first_name",
    "designation",
    "department",
    "period_start_date",
    "period_end_date",
    "key_areas",
    "specific_achievement",
    "old_salary",
    "new_salary",
    "effective_from",
    "authorized_person_name",
    "authorized_person_designation",
    "company_name"
  ]
}',
'Formal appraisal letter template rendered as paragraphs and heading (no tables)',
'{
  "templateConfig": {
    "title": "Appraisal Letter",
    "styles": {
      "page": {"margin": "24px", "fontFamily": "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "color": "#111827", "fontSize": "14px", "lineHeight": "1.6"},
      "h1": {"fontSize": "20px", "margin": "0 0 16px", "fontWeight": "600", "textAlign": "left"},
      "p": {"margin": "0 0 12px"},
      "signature": {"margin": "16px 0 0"}
    },
    "blocks": [
      {"type": "heading", "level": 1, "text": "Appraisal Letter"},

      {"type": "paragraph", "text": "{{company_letterhead}}"},
      {"type": "paragraph", "text": "Date: {{date}}"},

      {"type": "paragraph", "text": "To,"},
      {"type": "paragraph", "bind": {"path": "employee_full_name"}},
      {"type": "paragraph", "bind": {"path": "designation"}},
      {"type": "paragraph", "bind": {"path": "department"}},

      {"type": "paragraph", "text": "Subject: Performance Appraisal for {{period_start_date}} to {{period_end_date}}"},

      {"type": "paragraph", "text": "Dear {{employee_first_name}},"},

      {"type": "paragraph", "text": "We are pleased to inform you that following the performance review for the appraisal period {{period_start_date}} to {{period_end_date}}, your contributions and dedication have been highly appreciated."},

      {"type": "paragraph", "text": "Your performance in the areas of {{key_areas}} has been commendable. We recognize your efforts in {{specific_achievement}} and value the impact it has created for the organization."},

      {"type": "paragraph", "text": "Based on your performance, we are glad to revise your compensation package as follows:"},
      {"type": "paragraph", "text": "Current Salary: {{old_salary}}"},
      {"type": "paragraph", "text": "Revised Salary: {{new_salary}}"},
      {"type": "paragraph", "text": "Effective From: {{effective_from}}"},

      {"type": "paragraph", "text": "In addition, you are being considered for future responsibilities in {{future_assignment}}, where we believe your skills will add further value."},

      {"type": "paragraph", "text": "We congratulate you on your achievements and encourage you to continue delivering excellent results. Your hard work and commitment are key to both your professional growth and the success of the company."},

      {"type": "paragraph", "text": "We look forward to your continued contributions."},

      {"type": "paragraph", "text": "Warm regards,"},
      {"type": "paragraph", "bind": {"path": "authorized_person_name"}},
      {"type": "paragraph", "bind": {"path": "authorized_person_designation"}},
      {"type": "paragraph", "bind": {"path": "company_name"}}
    ]
  }
}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates WHERE name = 'Appraisal Letter'
);

-- One-time migration: Move root-level templateConfig column into metadata.templateConfig if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name IN ('templateconfig', 'templateConfig')
  ) THEN
    -- Build dynamic SQL to reference the correct column name
    EXECUTE (
      SELECT format(
        $$UPDATE public.templates
          SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('templateConfig', to_jsonb(%I))
          WHERE (metadata ? 'templateConfig') IS FALSE AND %I IS NOT NULL;$$,
        c.column_name, c.column_name
      )
      FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name='templates' AND c.column_name IN ('templateconfig','templateConfig')
      LIMIT 1
    );
  END IF;
END
$$;

-- Constraint: enforce metadata.templateConfig is a JSON object
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'templates_metadata_templateconfig_obj'
      AND conrelid = 'public.templates'::regclass
  ) THEN
    ALTER TABLE public.templates
    ADD CONSTRAINT templates_metadata_templateconfig_obj
    CHECK (
      metadata ? 'templateConfig' AND jsonb_typeof(metadata->'templateConfig') = 'object'
    );
  END IF;
END
$$;