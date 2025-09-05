import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'https://esm.sh/docx@8.2.2';

interface DocumentRequest {
  template_id: string;
  user_inputs: Record<string, any>;
  file_type: 'PDF' | 'DOCX';
}

interface DocumentResponse {
  document_id: string;
  storage_path: string;
  file_type: string;
  download_url: string;
  created_at: string;
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
    const { template_id, user_inputs, file_type }: DocumentRequest = await req.json();

    if (!template_id || !user_inputs || !file_type) {
      return new Response(
        JSON.stringify({ error: 'Missing template_id, user_inputs, or file_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file_type
    if (!['PDF', 'DOCX'].includes(file_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file_type. Must be PDF or DOCX' }),
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
      .eq('id', template_id)
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

    // Generate document content by merging user inputs into template placeholders
    const documentContent = mergeTemplateWithInputs(template, user_inputs);

    // Generate unique document ID
    const documentId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file_type.toLowerCase();
    const fileName = `${documentId}.${fileExtension}`;
    const storagePath = `documents/${user.id}/${fileName}`;

    // Generate document based on file type
    let documentBuffer: Uint8Array;
    let contentType: string;

    if (file_type === 'PDF') {
      documentBuffer = await generatePDF(template, documentContent);
      contentType = 'application/pdf';
    } else {
      documentBuffer = await generateDOCX(template, documentContent);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(storagePath, documentBuffer, {
        contentType,
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

    // Insert document metadata into documents table
    const { data: documentRecord, error: insertError } = await supabaseClient
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        template_id: template_id,
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        file_path: storagePath,
        file_type: file_type,
        status: 'completed',
        metadata: {
          template_name: template.name,
          user_inputs: user_inputs,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Try to clean up uploaded file
      await supabaseClient.storage.from('documents').remove([storagePath]);
      return new Response(
        JSON.stringify({ error: 'Failed to save document metadata' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate download URL
    const { data: urlData } = await supabaseClient.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    const response: DocumentResponse = {
      document_id: documentId,
      storage_path: storagePath,
      file_type: file_type,
      download_url: urlData?.signedUrl || '',
      created_at: documentRecord.created_at,
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

function mergeTemplateWithInputs(
  template: any,
  userInputs: Record<string, any>
): Record<string, any> {
  // Parse the template's JSON schema to understand the structure
  const schema = JSON.parse(template.json_schema);
  const content: Record<string, any> = {};

  // Process each field in the user inputs according to the schema
  for (const [key, value] of Object.entries(userInputs)) {
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
        case 'boolean':
          content[key] = Boolean(value);
          break;
        default:
          content[key] = value;
      }
    }
  }

  // Add template metadata
  content._template_name = template.name;
  content._generated_at = new Date().toLocaleString();

  return content;
}

async function generatePDF(template: any, content: Record<string, any>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Standard letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  let yPosition = height - 50;
  
  // Title
  page.drawText(template.name, {
    x: 50,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;
  
  // Generated date
  page.drawText(`Generated on: ${content._generated_at}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  yPosition -= 40;
  
  // Content
  for (const [key, value] of Object.entries(content)) {
    if (key.startsWith('_')) continue; // Skip metadata fields
    
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Field label
    page.drawText(`${formattedKey}:`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
    
    // Field value
    let valueText = '';
    if (Array.isArray(value)) {
      valueText = value.join(', ');
    } else {
      valueText = String(value);
    }
    
    // Handle long text by wrapping
    const maxWidth = width - 100;
    const words = valueText.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, 11);
      
      if (textWidth > maxWidth && line) {
        page.drawText(line, {
          x: 70,
          y: yPosition,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
        line = word;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: 70,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    yPosition -= 30;
    
    // Add new page if needed
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }
  }
  
  return await pdfDoc.save();
}

async function generateDOCX(template: any, content: Record<string, any>): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: template.name,
                bold: true,
                size: 32,
              }),
            ],
            heading: HeadingLevel.TITLE,
          }),
          
          // Generated date
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${content._generated_at}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
          
          new Paragraph({ text: '' }), // Empty line
          
          // Content
          ...Object.entries(content)
            .filter(([key]) => !key.startsWith('_'))
            .flatMap(([key, value]) => {
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              let valueText = '';
              if (Array.isArray(value)) {
                valueText = value.join(', ');
              } else {
                valueText = String(value);
              }
              
              return [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${formattedKey}:`,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: valueText,
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({ text: '' }), // Empty line
              ];
            }),
        ],
      },
    ],
  });
  
  return await Packer.toBuffer(doc);
}