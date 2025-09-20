// Strongly-typed TemplateConfig renderer (supports bind.path, sourcePath/dataPath aliases, and style aliases)

export type CSSPrimitive = string | number;
export type CSSStyle = Record<string, CSSPrimitive>;

type BindRef = { bind?: { path?: string } };

export interface TemplateConfig {
  title?: string;
  styles?: Partial<{
    // canonical keys
    document: CSSStyle;
    heading: CSSStyle;
    paragraph: CSSStyle;
    line: CSSStyle;
    list: CSSStyle;
    listItem: CSSStyle;
    table: CSSStyle;
    th: CSSStyle;
    td: CSSStyle;
    divider: CSSStyle;
    signature: CSSStyle;
    // aliases from seed data
    page: CSSStyle;
    h1: CSSStyle;
    h2: CSSStyle;
    h3: CSSStyle;
    h4: CSSStyle;
    h5: CSSStyle;
    h6: CSSStyle;
    p: CSSStyle;
    // new styles for keyValueList
    kvList: CSSStyle;
    kvRow: CSSStyle;
    kvLabel: CSSStyle;
    kvValue: CSSStyle;
  }> & Record<string, CSSStyle>;
  blocks: TemplateBlock[];
}

export type TemplateBlock =
  | HeadingBlock
  | ParagraphBlock
  | LineBlock
  | ListBlock
  | TableBlock
  | KeyValueTableBlock
  | KeyValueListBlock
  | DividerBlock
  | SpacerBlock
  | SignatureBlock;

export interface HeadingBlock {
  type: 'heading';
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: CSSStyle;
}
export interface ParagraphBlock extends BindRef {
  type: 'paragraph';
  text?: string; // can be omitted if bind.path provided
  style?: CSSStyle;
}
export interface LinePart extends BindRef { text?: string; path?: string }
export interface LineBlock {
  type: 'line';
  parts: LinePart[];
  style?: CSSStyle;
}
export interface ListBlock extends BindRef {
  type: 'list';
  items?: Array<string | LinePart>;
  ordered?: boolean;
  sourcePath?: string; // alias of dataPath for arrays
  dataPath?: string; // preferred name
  style?: CSSStyle;
}
export interface TableColumn { header: string; path: string }
export interface TableBlock extends BindRef {
  type: 'table';
  columns: TableColumn[];
  dataPath?: string; // path to an array of rows
  sourcePath?: string; // alias supported by seed data
  style?: CSSStyle;
  headerStyle?: CSSStyle;
  cellStyle?: CSSStyle;
}
export interface KeyValueRow extends BindRef { label: string; path?: string }
export interface KeyValueTableBlock {
  type: 'keyValueTable';
  rows: KeyValueRow[];
  style?: CSSStyle;
}
export interface KeyValueListBlock {
  type: 'keyValueList';
  rows: KeyValueRow[];
  style?: CSSStyle;
}
export interface DividerBlock { type: 'divider'; style?: CSSStyle }
export interface SpacerBlock { type: 'spacer'; size?: number }
export interface SignatureBlock {
  type: 'signature';
  name?: string | { bind?: { path?: string } };
  title?: string | { bind?: { path?: string } };
  showRegards?: boolean;
  style?: CSSStyle;
}

// Utilities
const escapeHtml = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const cssToString = (style?: CSSStyle): string => {
  if (!style) return '';
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${String(v)}`)
    .join(';');
};

const getValueAtPath = (obj: Record<string, any>, path?: string): any => {
  if (!path) return '';
  return path.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
};

const extractPath = (x?: string | BindRef): string | undefined => {
  if (!x) return undefined;
  if (typeof x === 'string') return x;
  const maybeBind = x as BindRef;
  return maybeBind.bind?.path || undefined;
};

// BEGIN: normalization utilities to parse stringified JSON containers before rendering
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && (v as any).constructor === Object;

const looksLikeJsonContainer = (s: string): boolean => {
  const t = s.trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
};

const tryParseJson = (s: string): unknown | undefined => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};

const normalizeDataForRendering = (input: unknown, seen: WeakSet<object> = new WeakSet()): any => {
  if (typeof input === 'string') {
    if (looksLikeJsonContainer(input)) {
      const parsed = tryParseJson(input);
      if (parsed && (Array.isArray(parsed) || isPlainObject(parsed))) {
        return normalizeDataForRendering(parsed, seen);
      }
    }
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeDataForRendering(item, seen));
  }
  if (isPlainObject(input)) {
    const obj = input as Record<string, unknown>;
    if (seen.has(obj)) return obj;
    seen.add(obj);
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = normalizeDataForRendering(v, seen);
    }
    return out;
  }
  return input;
};
// END: normalization utilities

const valueToDisplay = (v: any): string => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const replaceMustache = (text: string, data: Record<string, any>): string =>
  text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p1) => {
    const v = getValueAtPath(data, String(p1));
    if (Array.isArray(v)) return escapeHtml(v.join(', '));
    if (v && typeof v === 'object') return escapeHtml(JSON.stringify(v));
    return escapeHtml(v);
  });

// Style helpers
const resolveStyles = (styles?: TemplateConfig['styles']) => {
  const s = styles || {};
  return {
    document: s.document || s.page,
    heading: s.heading,
    paragraph: s.paragraph || s.p,
    line: s.line,
    list: s.list,
    listItem: s.listItem,
    table: s.table,
    th: s.th,
    td: s.td,
    divider: s.divider,
    signature: s.signature,
    kvList: s.kvList,
    kvRow: s.kvRow,
    kvLabel: s.kvLabel,
    kvValue: s.kvValue,
    // aliases for heading levels
    h: {
      1: s.h1,
      2: s.h2,
      3: s.h3,
      4: s.h4,
      5: s.h5,
      6: s.h6,
    } as Record<number, CSSStyle | undefined>,
  };
};

// Rendering
export const renderBlocksFromTemplateConfig = (
  config: TemplateConfig,
  data: Record<string, any>
): string => {
  const styles = resolveStyles(config.styles);
  const normalizedData = normalizeDataForRendering(data) as Record<string, any>;

  const parts: string[] = [];
  for (const block of config.blocks || []) {
    switch (block.type) {
      case 'heading': {
        const b = block as HeadingBlock;
        const level = Math.min(Math.max(b.level || 2, 1), 6);
        const text = replaceMustache(b.text, normalizedData);
        const styleCand = b.style || styles.h[level] || styles.heading;
        const s = cssToString(styleCand as CSSStyle);
        parts.push(`<h${level}` + (s ? ` style="${s}"` : '') + `>${text}</h${level}>`);
        break;
      }
      case 'paragraph': {
        const b = block as ParagraphBlock;
        const boundPath = extractPath(b);
        const boundVal = boundPath ? getValueAtPath(normalizedData, boundPath) : undefined;
        const textRaw = b.text != null ? replaceMustache(b.text, normalizedData) : valueToDisplay(boundVal);
        const text = escapeHtml(textRaw);
        const s = cssToString(b.style || (styles.paragraph as CSSStyle));
        parts.push(`<p` + (s ? ` style="${s}"` : '') + `>${text}</p>`);
        break;
      }
      case 'line': {
        const b = block as LineBlock;
        const text = (b.parts || [])
          .map((p) => {
            const pth = extractPath(p) || p.path;
            const val = pth ? getValueAtPath(normalizedData, pth) : p.text ?? '';
            return escapeHtml(valueToDisplay(val));
          })
          .join(' ');
        const s = cssToString(b.style || (styles.line as CSSStyle));
        parts.push(`<div` + (s ? ` style="${s}"` : '') + `>${text}</div>`);
        break;
      }
      case 'list': {
        const b = block as ListBlock;
        const source = b.dataPath || b.sourcePath;
        let itemsResolved: string[] = [];
        if (source) {
          const arr = getValueAtPath(normalizedData, source);
          if (Array.isArray(arr)) itemsResolved = arr.map((v) => escapeHtml(valueToDisplay(v)));
        } else if (b.items && b.items.length) {
          itemsResolved = b.items.flatMap((it) => {
            if (typeof it === 'string') return [replaceMustache(it, normalizedData)];
            const pth = extractPath(it) || it.path;
            const val = pth ? getValueAtPath(normalizedData, pth) : it.text ?? '';
            return Array.isArray(val) ? val.map((v) => escapeHtml(valueToDisplay(v))) : [escapeHtml(valueToDisplay(val))];
          });
        }
        const s = cssToString(b.style || (styles.list as CSSStyle));
        const li = itemsResolved
          .map((t) => `<li` + (styles.listItem ? ` style="${cssToString(styles.listItem)}"` : '') + `>${t}</li>`)
          .join('');
        const tag = b.ordered ? 'ol' : 'ul';
        parts.push(`<${tag}` + (s ? ` style="${s}"` : '') + `>${li}</${tag}>`);
        break;
      }
      case 'table': {
        const b = block as TableBlock;
        const rowsSrc = b.dataPath || b.sourcePath ? getValueAtPath(normalizedData, b.dataPath || b.sourcePath) : [normalizedData];
        const rows = Array.isArray(rowsSrc) ? rowsSrc : [];
        const tableS = cssToString(b.style || (styles.table as CSSStyle));
        const thS = cssToString(b.headerStyle || (styles.th as CSSStyle));
        const tdS = cssToString(b.cellStyle || (styles.td as CSSStyle));
        const head = b.columns.map((c) => `<th` + (thS ? ` style="${thS}"` : '') + `>${escapeHtml(c.header)}</th>`).join('');
        const body = rows
          .map((row) => {
            const tds = b.columns
              .map((c) => `<td` + (tdS ? ` style="${tdS}"` : '') + `>${escapeHtml(valueToDisplay(getValueAtPath(row, c.path)))}</td>`)
              .join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');
        parts.push(`<table` + (tableS ? ` style="${tableS}"` : '') + `><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
        break;
      }
      case 'keyValueTable': {
        const b = block as KeyValueTableBlock;
        const tableS = cssToString(b.style || (styles.table as CSSStyle));
        const thS = cssToString(styles.th as CSSStyle);
        const tdS = cssToString(styles.td as CSSStyle);
        const body = (b.rows || [])
          .map((r) => {
            const pth = extractPath(r) || r.path;
            const v = valueToDisplay(getValueAtPath(normalizedData, pth));
            return `<tr><th` + (thS ? ` style="${thS}"` : '') + `>${escapeHtml(r.label)}</th><td` + (tdS ? ` style="${tdS}"` : '') + `>${escapeHtml(v)}</td></tr>`;
          })
          .join('');
        parts.push(`<table` + (tableS ? ` style="${tableS}"` : '') + `><tbody>${body}</tbody></table>`);
        break;
      }
      case 'keyValueList': {
        const b = block as KeyValueListBlock;
        const listS = cssToString(b.style || (styles.kvList as CSSStyle));
        const rowS = cssToString(styles.kvRow as CSSStyle);
        const labelS = cssToString(styles.kvLabel as CSSStyle);
        const valueS = cssToString(styles.kvValue as CSSStyle);
        const rows = (b.rows || [])
          .map((r) => {
            const pth = extractPath(r) || r.path;
            const v = valueToDisplay(getValueAtPath(normalizedData, pth));
            return `<div class="kv-row"` + (rowS ? ` style="${rowS}"` : '') + `>` +
                   `<div class="kv-label"` + (labelS ? ` style="${labelS}"` : '') + `>${escapeHtml(r.label)}</div>` +
                   `<div class="kv-value"` + (valueS ? ` style="${valueS}"` : '') + `>${escapeHtml(v)}</div>` +
                   `</div>`;
          })
          .join('');
        parts.push(`<div class="kv-list"` + (listS ? ` style="${listS}"` : '') + `>${rows}</div>`);
        break;
      }
      case 'divider': {
        const b = block as DividerBlock;
        const s = cssToString(b.style || (styles.divider as CSSStyle));
        parts.push(`<hr` + (s ? ` style="${s}"` : '') + `/>`);
        break;
      }
      case 'spacer': {
        const b = block as SpacerBlock;
        const h = b.size ?? 12;
        parts.push(`<div style="height:${h}px"></div>`);
        break;
      }
      case 'signature': {
        const b = block as SignatureBlock;
        const namePath = extractPath(b.name as any);
        const titlePath = extractPath(b.title as any);
        const name = escapeHtml(valueToDisplay(namePath ? getValueAtPath(normalizedData, namePath) : b.name));
        const title = escapeHtml(valueToDisplay(titlePath ? getValueAtPath(normalizedData, titlePath) : b.title));
        const s = cssToString(b.style || (styles.signature as CSSStyle));
        const greeting = b.showRegards ? '<div>Regards,</div>' : '';
        parts.push(`<div` + (s ? ` style="${s}"` : '') + `>${greeting}<div style="margin-top:12px;font-weight:600;">${name}</div>${title ? `<div>${title}</div>` : ''}</div>`);
        break;
      }
    }
  }
  return parts.join('\n');
};

export const renderDocumentFromTemplateConfig = (
  config: TemplateConfig,
  data: Record<string, any>,
  options?: { title?: string }
): string => {
  const styles = resolveStyles(config.styles);
  const docS = cssToString(styles.document as CSSStyle);
  const body = renderBlocksFromTemplateConfig(config, data);
  const title = options?.title || config.title || 'Document';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 1in; }
      :root { --text-color: #111827; --muted-color: #6b7280; --border-color:#e5e7eb; --bg-muted:#f9fafb; }
      html,body{padding:0;margin:0}
      body{font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', sans-serif; font-size: 12pt; line-height: 1.5; color: var(--text-color); }
      .container{max-width: 7in; margin: 0 auto;}
      h1,h2,h3,h4,h5,h6{margin: 0 0 12pt 0; line-height: 1.25; font-weight: 700;}
      h1{font-size: 20pt; margin-top: 0;}
      h2{font-size: 16pt; margin-top: 16pt;}
      h3{font-size: 14pt; margin-top: 14pt;}
      p{margin: 0 0 10pt 0;}
      ul,ol{margin: 0 0 10pt 1.25rem; padding: 0;}
      li{margin: 4pt 0;}
      table{border-collapse: collapse; width: 100%; margin: 10pt 0;}
      th,td{border: 1px solid var(--border-color); padding: 6pt 8pt; text-align: left; vertical-align: top;}
      thead th{background: var(--bg-muted); font-weight: 600;}
      tbody tr:nth-child(even){background: #fafafa;}
      img{max-width:100%; height:auto;}
      hr{border:0; border-top: 1px solid var(--border-color); margin: 12pt 0;}
      .kv-list{display: grid; grid-template-columns: 1.75in 1fr; gap: 6pt 12pt;}
      .kv-label{font-weight: 600; color: var(--muted-color);}
      .kv-row{display: contents;}
      @media print {
        body{-webkit-print-color-adjust: exact; print-color-adjust: exact;}
        table, tr, td, th { page-break-inside: avoid; }
        h1,h2,h3{ page-break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="container"` + (docS ? ` style="${docS}"` : '') + `>
      ${body}
    </div>
  </body>
</html>`;
};