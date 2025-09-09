import { useState } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Template, DocumentFormData } from '../lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type FileType = 'PDF' | 'DOCX';

interface DocumentGeneratorResult {
  generate: (template: Template, formData: DocumentFormData, fileType: FileType) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useDocumentGenerator(): DocumentGeneratorResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (template: Template, formData: DocumentFormData, fileType: FileType) => {
    setLoading(true);
    setError(null);

    try {
      const { user } = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      let fileUri = '';
      let fileContent: Uint8Array;
      const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}`;

      if (fileType === 'PDF') {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        let y = height - 40;
        const text = `This is a generated PDF for template: ${template.name}\n\n${JSON.stringify(formData, null, 2)}`;
        
        page.drawText(text, {
          x: 50,
          y: y,
          font,
          size: fontSize,
          color: rgb(0, 0, 0),
        });

        fileContent = await pdfDoc.save();
        fileUri = `${FileSystem.documentDirectory}${fileName}.pdf`;
      } else { // DOCX
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun(`This is a generated DOCX for template: ${template.name}`),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun(JSON.stringify(formData, null, 2)),
                ],
              }),
            ],
          }],
        });

        const buffer = await Packer.toBuffer(doc);
        fileContent = new Uint8Array(buffer);
        fileUri = `${FileSystem.documentDirectory}${fileName}.docx`;
      }

      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(fileContent).toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the document
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }

      // Upload to Supabase Storage
      const storagePath = `${user.id}/${fileName}.${fileType.toLowerCase()}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileContent, {
          contentType: fileType === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Insert into documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          template_name: template.name,
          storage_path: storagePath,
          file_type: fileType,
        });

      if (dbError) {
        throw dbError;
      }

    } catch (err: any) {
      setError(err);
      console.error('Error generating document:', err);
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}