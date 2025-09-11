import * as FileSystem from 'expo-file-system';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export interface CreateDocxParams {
  html: string;
  fileName: string; // without extension
}

export interface CreateDocxResult {
  fileUri: string;
  base64?: string;
}

export async function createDocx({ html, fileName }: CreateDocxParams): Promise<CreateDocxResult> {
  try {
    const plain = html
      .replace(/<\/(h\d|p|div|li|tr)>/gi, '\n')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '');

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [new Paragraph({ children: [new TextRun(plain)] })],
        },
      ],
    });

    const base64 = await Packer.toBase64String(doc);
    const fileUri = `${FileSystem.documentDirectory}${fileName}.docx`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return { fileUri, base64 };
  } catch (e) {
    throw e;
  }
}