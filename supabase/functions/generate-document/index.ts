import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DocumentRequest {
  template_name: string;
  form_data: Record<string, any>;
}

interface DocumentResponse {
  storage_path: string;
  file_type: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { template_name, form_data }: DocumentRequest = await req.json();

    if (!template_name || !form_data) {
      return new Response(
        JSON.stringify({ error: 'Missing template_name or form_data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch template from database
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('name', template_name)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate document content based on template
    const documentContent = generateDocumentContent(template, form_data);

    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${template_name}_${timestamp}.pdf`;
    const storagePath = `documents/${user.id}/${fileName}`;

    // For this implementation, we'll create a simple PDF-like content
    // In a real implementation, you might use a PDF generation library
    const pdfContent = createSimplePDF(template.name, documentContent);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(storagePath, pdfContent, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload document' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response: DocumentResponse = {
      storage_path: storagePath,
      file_type: 'pdf',
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-document function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDocumentContent(
  template: any,
  formData: Record<string, any>
): Record<string, any> {
  // Parse the template's JSON schema to understand the structure
  const schema = JSON.parse(template.json_schema);
  const content: Record<string, any> = {};

  // Process each field in the form data according to the schema
  for (const [key, value] of Object.entries(formData)) {
    if (schema.properties && schema.properties[key]) {
      const fieldSchema = schema.properties[key];
      
      // Format the value based on the field type
      switch (fieldSchema.type) {
        case 'string':
          content[key] = String(value || '');
          break;
        case 'number':
          content[key] = Number(value) || 0;
          break;
        case 'array':
          content[key] = Array.isArray(value) ? value : [value].filter(Boolean);
          break;
        default:
          content[key] = value;
      }
    }
  }

  return content;
}

function createSimplePDF(templateName: string, content: Record<string, any>): Uint8Array {
  // This is a simplified PDF creation function
  // In a real implementation, you would use a proper PDF library like jsPDF or PDFKit
  
  let pdfText = `Document: ${templateName}\n\n`;
  pdfText += `Generated on: ${new Date().toLocaleString()}\n\n`;
  pdfText += 'Content:\n';
  pdfText += '=' .repeat(50) + '\n\n';
  
  for (const [key, value] of Object.entries(content)) {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (Array.isArray(value)) {
      pdfText += `${formattedKey}:\n`;
      value.forEach((item, index) => {
        pdfText += `  ${index + 1}. ${item}\n`;
      });
      pdfText += '\n';
    } else {
      pdfText += `${formattedKey}: ${value}\n\n`;
    }
  }
  
  pdfText += '\n' + '=' .repeat(50) + '\n';
  pdfText += 'End of Document';
  
  // Convert text to bytes (simplified PDF format)
  // Note: This creates a text file, not a real PDF
  // For production, use a proper PDF generation library
  return new TextEncoder().encode(pdfText);
}