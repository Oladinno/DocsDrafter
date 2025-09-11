import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface CreatePdfParams {
  html: string;
  fileName: string; // without extension
}

export interface CreatePdfResult {
  fileUri: string;
  base64?: string;
}

function stripHtmlToPlainText(html: string): string {
  // A rudimentary function to strip HTML for fallback rendering
  const withNewlines = html
    .replace(/<\/(h\d|p|div|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n');
  return withNewlines.replace(/<[^>]+>/g, '');
}

export async function createPdf({ html, fileName }: CreatePdfParams): Promise<CreatePdfResult> {
  // Use expo-print as the primary, Expo-native method
  try {
    const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
    return { fileUri: uri, base64 };
  } catch (error) {
    console.error("expo-print failed, falling back to pdf-lib:", error);

    // Fallback to pdf-lib for basic text rendering if expo-print fails
    try {
      const plainText = stripHtmlToPlainText(html);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      page.drawText(plainText, {
        x: 50,
        y: page.getHeight() - 50,
        font,
        size: 12,
        lineHeight: 14,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
      const fileUri = `${FileSystem.documentDirectory}${fileName}.pdf`;
      
      await FileSystem.writeAsStringAsync(fileUri, pdfBytes, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { fileUri, base64: pdfBytes };
    } catch (fallbackError) {
      console.error("PDF generation fallback with pdf-lib also failed:", fallbackError);
      throw fallbackError;
    }
  }
}