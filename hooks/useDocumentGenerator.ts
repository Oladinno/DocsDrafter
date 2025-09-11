import { useState } from 'react';
import { supabase, getCurrentUser, Template, DocumentFormData } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { createPdf } from '../utils/generators/pdfGenerator';
import { createDocx } from '../utils/generators/docxGenerator';

export type FileType = 'pdf' | 'docx';

interface DocumentGeneratorResult {
  generate: (template: Template, formData: DocumentFormData, fileType: FileType) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

// Helper to produce a consistent HTML document for both PDF and DOCX
const buildDocumentHTML = (template: Template, formData: DocumentFormData): string => {
  const fieldsHtml = Object.entries(formData)
    .map(([key, value]) => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${key}</td><td style="padding:8px;border:1px solid #e5e7eb;">${String(value)}</td></tr>`) 
    .join('');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${template.name}</title>
      <style>
        body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111827; }
        .container { padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 16px; }
        p { margin: 0 0 12px; color: #374151; }
        table { border-collapse: collapse; width: 100%; font-size: 14px; }
        thead th { text-align: left; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${template.name}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${fieldsHtml}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;
};

export function useDocumentGenerator(): DocumentGeneratorResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (template: Template, formData: DocumentFormData, fileType: FileType) => {
    setLoading(true);
    setError(null);

    try {
      const { user } = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const html = buildDocumentHTML(template, formData);
      const fileBaseName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}`;

      let fileUri: string = '';
      let base64Data: string | undefined;
      let mimeType: string = '';

      if (fileType === 'pdf') {
        const pdf = await createPdf({ html, fileName: fileBaseName });
        fileUri = pdf.fileUri;
        base64Data = pdf.base64;
        mimeType = 'application/pdf';
      } else {
        const docx = await createDocx({ html, fileName: fileBaseName });
        fileUri = docx.fileUri;
        base64Data = docx.base64;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      // Ensure we have base64 data for upload
      if (!base64Data) {
        base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      }

      // Optionally share the document
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }

      // Upload to Supabase Storage
      const storagePath = `${user.id}/${fileBaseName}.${fileType.toLowerCase()}`;
      const bytes = Buffer.from(base64Data, 'base64');

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, bytes, { contentType: mimeType });

      if (uploadError) throw uploadError;

      // Insert into documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({ user_id: user.id, template_name: template.name, storage_path: storagePath, file_type: fileType });

      if (dbError) throw dbError;
    } catch (err: any) {
      setError(err);
      console.error('Error generating document:', err);
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}