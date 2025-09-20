import { File, Directory, Paths } from 'expo-file-system/next';
import * as LegacyFS from 'expo-file-system/legacy';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  ImageRun,
} from 'docx';
import { Buffer } from 'buffer';

export interface CreateDocxParams {
  html: string;
  fileName: string; // without extension
}

export interface CreateDocxResult {
  fileUri: string;
  base64?: string;
}

// Utility: decode data URI (e.g., data:image/png;base64,....)
function decodeDataUri(dataUri: string): { mime: string; data: Uint8Array } | null {
  try {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const b64 = match[2];
    const buf = Buffer.from(b64, 'base64');
    return { mime, data: Uint8Array.from(buf) };
  } catch {
    return null;
  }
}
function stripTags(html: string): string {
  return html
    .replace(/<\/(h\d|p|div|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTag(html: string, tag: string): { before: string; inner: string; after: string } | null {
  const open = new RegExp(`<${tag}[^>]*>`, 'i');
  const close = new RegExp(`</${tag}>`, 'i');
  const openMatch = html.match(open);
  if (!openMatch) return null;
  const startIdx = openMatch.index ?? 0;
  const afterOpenIdx = startIdx + openMatch[0].length;
  const rest = html.slice(afterOpenIdx);
  const closeMatch = rest.match(close);
  if (!closeMatch) return null;
  const inner = rest.slice(0, closeMatch.index ?? 0);
  const after = rest.slice((closeMatch.index ?? 0) + closeMatch[0].length);
  const before = html.slice(0, startIdx);
  return { before, inner, after };
}

function parseTable(html: string): { node: Table; afterHtml: string; beforeTextParas: Paragraph[] } | null {
  const m = extractTag(html, 'table');
  if (!m) return null;
  const beforeText = stripTags(m.before);
  const beforeTextParas = beforeText
    ? beforeText.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }))
    : [];

  // extract rows
  const rows: TableRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(m.inner))) {
    const cellsHtml = rowMatch[1];
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi;
    const cells: TableCell[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(cellsHtml))) {
      const tagName = (cellMatch[1] || 'td').toLowerCase();
      const isHeader = tagName === 'th';
      const raw = cellMatch[2];
      const text = stripTags(raw) || '';
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: isHeader })],
            }),
          ],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  return { node: table, afterHtml: m.after, beforeTextParas };
}

function parseHeading(html: string): { node: Paragraph; afterHtml: string; beforeTextParas: Paragraph[] } | null {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const m = extractTag(html, `h${level}`);
    if (m) {
      const beforeText = stripTags(m.before);
      const beforeTextParas = beforeText
        ? beforeText.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }))
        : [];
      const text = stripTags(m.inner);
      return {
        node: new Paragraph({ text, heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel] || HeadingLevel.HEADING_1 }),
        afterHtml: m.after,
        beforeTextParas,
      };
    }
  }
  return null;
}

function parseList(html: string): { nodes: Paragraph[]; afterHtml: string; beforeTextParas: Paragraph[] } | null {
  const kinds = ['ul', 'ol'] as const;
  for (const tag of kinds) {
    const m = extractTag(html, tag);
    if (m) {
      const beforeText = stripTags(m.before);
      const beforeTextParas = beforeText
        ? beforeText.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }))
        : [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const paras: Paragraph[] = [];
      let li: RegExpExecArray | null;
      let idx = 1;
      while ((li = liRegex.exec(m.inner))) {
        const text = stripTags(li[1]);
        const bullet = tag === 'ul' ? '• ' : `${idx}. `;
        paras.push(new Paragraph({ children: [new TextRun(`${bullet}${text}`)] }));
        idx++;
      }
      return { nodes: paras, afterHtml: m.after, beforeTextParas };
    }
  }
  return null;
}

function parseImage(html: string): { node: Paragraph; afterHtml: string; beforeTextParas: Paragraph[] } | null {
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/i;
  const m = html.match(imgRegex);
  if (!m || m.index === undefined) return null;
  const before = html.slice(0, m.index);
  const after = html.slice(m.index + m[0].length);
  const beforeText = stripTags(before);
  const beforeTextParas = beforeText
    ? beforeText.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }))
    : [];
  const src = m[1];
  const decoded = decodeDataUri(src);
  if (!decoded) {
    // If not data URI, just ignore image but keep a placeholder paragraph
    return {
      node: new Paragraph({ children: [new TextRun('[Image]')] }),
      afterHtml: after,
      beforeTextParas,
    };
  }
  const imgType: 'png' | 'jpg' | 'gif' | 'bmp' = decoded.mime.includes('png')
    ? 'png'
    : decoded.mime.includes('jpeg') || decoded.mime.includes('jpg')
    ? 'jpg'
    : decoded.mime.includes('gif')
    ? 'gif'
    : decoded.mime.includes('bmp')
    ? 'bmp'
    : 'png';
  const imagePara = new Paragraph({
    children: [
      new ImageRun({ data: Buffer.from(decoded.data), type: imgType, transformation: { width: 400, height: 200 } }),
    ],
    alignment: AlignmentType.CENTER,
  });
  return { node: imagePara, afterHtml: after, beforeTextParas };
}

function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  let remaining = html;
  const children: (Paragraph | Table)[] = [];

  let iterations = 0;
  const MAX_ITERATIONS = 10000;
  while (remaining && remaining.length > 0) {
    if (++iterations > MAX_ITERATIONS) {
      console.warn('Max iterations reached in HTML parsing');
      break;
    }
    // Order: table -> heading -> list -> image -> paragraph chunks
    const tableParsed = parseTable(remaining);
    if (tableParsed) {
      children.push(...tableParsed.beforeTextParas);
      children.push(tableParsed.node);
      remaining = tableParsed.afterHtml;
      continue;
    }

    const headingParsed = parseHeading(remaining);
    if (headingParsed) {
      children.push(...headingParsed.beforeTextParas);
      children.push(headingParsed.node);
      remaining = headingParsed.afterHtml;
      continue;
    }

    const listParsed = parseList(remaining);
    if (listParsed) {
      children.push(...listParsed.beforeTextParas);
      children.push(...listParsed.nodes);
      remaining = listParsed.afterHtml;
      continue;
    }

    const imgParsed = parseImage(remaining);
    if (imgParsed) {
      children.push(...imgParsed.beforeTextParas);
      children.push(imgParsed.node);
      remaining = imgParsed.afterHtml;
      continue;
    }

    // Fallback: treat as plain text until next known tag
    const nextTagIdx = remaining.search(/<\/?(table|h\d|ul|ol|li|p|div|br|img)[^>]*>/i);
    if (nextTagIdx === -1) {
      const text = stripTags(remaining);
      if (text) {
        const paras = text.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }));
        children.push(...paras);
      }
      remaining = '';
    } else {
      const before = remaining.slice(0, nextTagIdx);
      const text = stripTags(before);
      if (text) {
        const paras = text.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }));
        children.push(...paras);
      }
      remaining = remaining.slice(nextTagIdx);

      // If we encounter <p> or <div>, extract and convert to paragraph explicitly
      const block = extractTag(remaining, 'p') || extractTag(remaining, 'div');
      if (block) {
        const beforeText = stripTags(block.before);
        if (beforeText) {
          const paras = beforeText.split(/\n{2,}/).map((t) => new Paragraph({ children: [new TextRun(t)] }));
          children.push(...paras);
        }
        const innerText = stripTags(block.inner);
        if (innerText) children.push(new Paragraph({ children: [new TextRun(innerText)] }));
        remaining = block.after;
      } else {
        // No <p>/<div> block at the head. Consume a single leading tag to ensure progress
        const tagAtStart = remaining.match(/^<\/?(?:table|h\d|ul|ol|li|p|div|br|img)[^>]*>/i);
        if (tagAtStart && tagAtStart[0]) {
          // Convert <br> to an empty paragraph to preserve line breaks
          if (/^<br\b/i.test(tagAtStart[0])) {
            children.push(new Paragraph({ children: [new TextRun('')] }));
          }
          // Advance past the tag
          remaining = remaining.slice(tagAtStart[0].length);
        } else {
          // As a last resort, drop one character to avoid infinite loop
          remaining = remaining.slice(1);
        }
      }
    }
  }

  return children;
}

export async function createDocx({ html, fileName }: CreateDocxParams): Promise<CreateDocxResult> {
  // Validate fileName
  if (!fileName || !/^[\w\-. ]+$/.test(fileName)) {
    throw new Error('Invalid fileName: must contain only alphanumeric characters, spaces, dots, hyphens, and underscores');
  }

  // Remove <style> blocks to prevent CSS from appearing in the output
  const sanitizedHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  try {
    const children = htmlToDocxChildren(sanitizedHtml);
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 24 }, // 12pt
            paragraph: { spacing: { after: 120 } }, // ~6pt after paragraphs
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
            },
          },
          children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun(stripTags(sanitizedHtml))] })],
        },
      ],
    });

    const base64 = await Packer.toBase64String(doc);
    const dir = new Directory(Paths.document);
    const file = new File(dir, `${fileName}.docx`);
    await LegacyFS.writeAsStringAsync(file.uri, base64, { encoding: 'base64' });
    return { fileUri: file.uri, base64 };
  } catch (e) {
    console.error('Failed to parse HTML to DOCX:', e);
    // Fallback to plain text if parsing fails
    const plain = stripTags(sanitizedHtml);
    const createPlainTextDoc = (text: string) =>
      new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Calibri', size: 24 },
              paragraph: { spacing: { after: 120 } },
            },
          },
        },
        sections: [
          {
            properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
            children: [new Paragraph({ children: [new TextRun(text)] })],
          },
        ],
      });
    const doc = createPlainTextDoc(plain);
    const base64 = await Packer.toBase64String(doc);
    const dir = new Directory(Paths.document);
    const file = new File(dir, `${fileName}.docx`);
    await LegacyFS.writeAsStringAsync(file.uri, base64, { encoding: 'base64' });
    return { fileUri: file.uri, base64 };
  }
}