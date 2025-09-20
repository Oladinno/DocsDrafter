import { useState } from 'react';
import { supabase, getCurrentUser, Template, DocumentFormData } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { createPdf } from '../utils/generators/pdfGenerator';
import { createDocx } from '../utils/generators/docxGenerator';
import { renderDocumentFromTemplateConfig, TemplateConfig, TemplateBlock } from '../utils/templateRenderer';

export type FileType = 'pdf' | 'docx';

interface DocumentGeneratorResult {
  generate: (template: Template, formData: DocumentFormData, fileType: FileType) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

// JSON Schema support for structured rendering and validation
interface JSONSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  format?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: { [key: string]: JSONSchemaProperty };
  required?: string[];
}

interface JSONSchema {
  type: 'object' | string;
  properties: { [key: string]: JSONSchemaProperty };
  required?: string[];
}

const escapeHtml = (value: unknown): string => {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getValueAtPath = (obj: Record<string, any>, path: string): unknown => {
  return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
};

const renderWithTemplate = (htmlTemplate: string, data: Record<string, any>): string => {
  return htmlTemplate.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p1) => {
    const v = getValueAtPath(data, p1);
    if (v == null) return '';
    if (Array.isArray(v)) return escapeHtml(v.join(', '));
    if (typeof v === 'object') return escapeHtml(JSON.stringify(v));
    return escapeHtml(v);
  });
};

const renderArrayOfObjectsTable = (items: Record<string, any>[]): string => {
  if (!items || items.length === 0) return '<p>(No items)</p>';
  const list = items
    .map((item, idx) => {
      const rows = Object.entries(item || {})
        .map(
          ([k, v]) =>
            `<div class="kv-row"><div class="kv-key">${escapeHtml(k)}</div><div class="kv-value">${escapeHtml(v)}</div></div>`
        )
        .join('');
      return `<li class="object-item"><div class="object-item-title">Item ${idx + 1}</div>${rows}</li>`;
    })
    .join('');
  return `<ul class="object-list">${list}</ul>`;
};

const renderPropertyRow = (label: string, value: any): string => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    const arrayHtml = value.every((v) => typeof v === 'object' && v != null)
      ? renderArrayOfObjectsTable(value as Record<string, any>[])
      : `<ul class="bullet-list">${value.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`;
    return `<div class="kv-group"><div class="kv-label">${escapeHtml(label)}</div>${arrayHtml}</div>`;
  }
  if (value && typeof value === 'object') {
    const rows = Object.entries(value)
      .map(
        ([k, v]) =>
          `<div class="kv-row"><div class="kv-key">${escapeHtml(k)}</div><div class="kv-value">${escapeHtml(v)}</div></div>`
      )
      .join('');
    return `<div class="kv-group"><div class="kv-label">${escapeHtml(label)}</div>${rows}</div>`;
  }
  return `<div class="kv-row"><div class="kv-key">${escapeHtml(label)}</div><div class="kv-value">${escapeHtml(value)}</div></div>`;
};

const buildFromSchema = (schema: JSONSchema, formData: Record<string, any>): string => {
  const rows: string[] = [];
  const props = schema?.properties || {};
  for (const [key, prop] of Object.entries(props)) {
    const label = prop.title || key;
    const value = (formData as any)[key];

    if (prop.type === 'object' && prop.properties && value && typeof value === 'object') {
      const innerRows = Object.entries(prop.properties)
        .map(([innerKey, innerProp]) => {
          const innerLabel = (innerProp as JSONSchemaProperty).title || innerKey;
          const innerValue = (value as any)?.[innerKey];
          return renderPropertyRow(innerLabel, innerValue);
        })
        .join('');
      rows.push(`<section class="section"><h3 class="section-title">${escapeHtml(label)}</h3>${innerRows}</section>`);
      continue;
    }

    if (prop.type === 'array') {
      rows.push(renderPropertyRow(label, value));
      continue;
    }
    rows.push(renderPropertyRow(label, value));
  }
  return rows.join('');
};

const validateAgainstSchema = (schema: JSONSchema | null | undefined, formData: Record<string, any>): string[] => {
  const errors: string[] = [];
  if (!schema?.properties) return errors;
  const required = schema.required || [];
  for (const field of required) {
    const v = (formData as any)[field];
    if (v === undefined || v === null || v === '') errors.push(`${field} is required`);
  }
  for (const [key, prop] of Object.entries(schema.properties)) {
    const v = (formData as any)[key];
    if (v == null) continue;
    switch (prop.type) {
      case 'number':
      case 'integer': {
        const isNumeric = typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v));
        if (!isNumeric) errors.push(`${key} must be a number`);
        break;
      }
      case 'array': {
        if (!Array.isArray(v)) errors.push(`${key} must be an array`);
        break;
      }
      case 'object': {
        if (typeof v !== 'object' || Array.isArray(v)) errors.push(`${key} must be an object`);
        break;
      }
      case 'boolean': {
        const isBool = typeof v === 'boolean' || v === 'true' || v === 'false';
        if (!isBool) errors.push(`${key} must be a boolean`);
        break;
      }
      default:
        break;
    }
    if ((prop as JSONSchemaProperty).format === 'date' && v) {
      const d = new Date(v);
      if (isNaN(d.getTime())) errors.push(`${key} must be a valid date`);
    }
  }
  return errors;
};

// Helper to produce a consistent HTML document for both PDF and DOCX
const buildDocumentHTML = (template: Template, formData: DocumentFormData): string => {
  const metadata = (template as any)?.metadata || {};

  // Normalize incoming data first
  const normalizedData = normalizeDataForRendering(formData as Record<string, any>) as Record<string, any>;

  // Enforced: Only render using metadata.templateConfig
  if (!metadata || typeof metadata.templateConfig !== 'object' || !metadata.templateConfig) {
    throw new Error('Template is missing metadata.templateConfig. All structured layouts must be stored under metadata.templateConfig.');
  }

  return renderDocumentFromTemplateConfig(
    metadata.templateConfig as TemplateConfig,
    normalizedData as Record<string, any>,
    { title: (template as any)?.name || (template as any)?.type || 'Document' }
  );
};

// Filename helpers for consistent, user-friendly naming
const sanitizePart = (s: string): string =>
  String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/_+/g, '_');

const trimSeparators = (s: string): string => s.replace(/^[._-\s]+/, '').replace(/[._-\s]+$/, '');

const capLength = (s: string, max = 120): string => (s.length > max ? s.slice(0, max) : s);

const formatTimestamp = (d: Date = new Date()): string => {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;
};

const buildFileBaseName = (typeOrName: string, keyVal?: string): string => {
  const parts = [sanitizePart(typeOrName), keyVal ? sanitizePart(keyVal) : undefined, formatTimestamp()].filter(Boolean) as string[];
  let joined = parts.join('_').replace(/_+/g, '_');
  joined = trimSeparators(joined);
  joined = capLength(joined, 120);
  return joined || `Document_${formatTimestamp()}`;
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

      // Normalize inputs before validation and rendering
      const normalizedFormData = normalizeDataForRendering(formData as Record<string, any>) as Record<string, any>;

      // Validate inputs against JSON schema if present
      const schema: JSONSchema | undefined = (template as any)?.json_schema;
      const validationErrors = validateAgainstSchema(schema, normalizedFormData as Record<string, any>);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
      }

      const html = buildDocumentHTML(template, normalizedFormData);

      // Build a smart file name: use template type/name + an important user key if available
      const preferKeys = [
        'Invoice Number', 'Invoice', 'Invoice ID', 'Employee Name', 'Recipient Name', 'Name',
        'Reference', 'Ref', 'Order Number', 'Order No', 'Contract Number', 'ID', 'Code'
      ];
      const typeOrName = ((template as any)?.type || (template as any)?.name || 'Document') as string;
      const keyFound = Object.keys(normalizedFormData as Record<string, any>).find((k) =>
        preferKeys.some((pk) => pk.toLowerCase() === k.toLowerCase())
      );
      const keyVal = keyFound ? String((normalizedFormData as any)[keyFound]) : '';
      const fileBaseName = buildFileBaseName(typeOrName, keyVal);

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
        .insert({ user_id: user.id, template_name: (template as any)?.name || (template as any)?.type || 'Document', storage_path: storagePath, file_type: fileType });

      if (dbError) {
        // Attempt to clean up the uploaded file
        console.error('Database insert failed, attempting to clean up storage...', dbError);
        await supabase.storage.from('documents').remove([storagePath]);
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

// Normalization utilities (parse stringified arrays/objects before validation & rendering)
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

// Replace bracket placeholders like [Employee Name] with the value from user input.
const replacePlaceholdersInString = (templateStr: string, values: Record<string, any>): string => {
  if (!templateStr) return '';
  return templateStr.replace(/\[([^\]]+)\]/g, (_m, p1) => {
    const key = String(p1).trim();
    // Try exact key, then case-insensitive match
    if (values[key] != null) return String(values[key]);
    const found = Object.keys(values).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && values[found] != null) return String(values[found]);
    return '[Not provided]';
  });
};

// Deep-replace placeholders through any JSON-like structure
const deepReplacePlaceholders = (node: any, values: Record<string, any>): any => {
  if (node == null) return node;
  if (typeof node === 'string') return replacePlaceholdersInString(node, values);
  if (Array.isArray(node)) return node.map((n) => deepReplacePlaceholders(n, values));
  if (typeof node === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = deepReplacePlaceholders(v, values);
    }
    return out;
  }
  return node;
};

// Title-case a key to use as a label in generic rendering
const toTitle = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// Generic object renderer -> table rows
const renderObjectToTable = (obj: Record<string, any>): string => {
  const rows: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    rows.push(renderPropertyRow(toTitle(k), v));
  }
  return `<div class="kv-list">${rows.join('')}</div>`;
};

// Build HTML from a Template JSON (e.g., { type, template: {...} })
const buildHTMLFromTemplateObject = (
  templateObj: any,
  userValues: Record<string, any>
): { html: string; suggestedFileStub?: string } => {
  const type = (templateObj?.type as string) || 'Document';
  const t = deepReplacePlaceholders(templateObj?.template ?? templateObj, userValues);

  const companyBlock = t?.company
    ? `<div style="margin-bottom:8px;">
        <div style="font-weight:600;">${escapeHtml(t.company.name ?? '')}</div>
        <div>${escapeHtml(t.company.address ?? '')}</div>
      </div>`
    : '';

  const dateLine = t?.date ? `<div style="margin:8px 0;">${escapeHtml(t.date)}</div>` : '';

  const recipientBlock = t?.recipient
    ? `<div style="margin:12px 0;">
        <div>To: <strong>${escapeHtml(t.recipient.name ?? '')}</strong></div>
        ${t.recipient.designation ? `<div>Designation: ${escapeHtml(t.recipient.designation)}</div>` : ''}
      </div>`
    : '';

  // Body: respect paragraph breaks
  const bodyBlock = t?.body
    ? `<div style="white-space:pre-wrap;line-height:1.5;margin:12px 0;">${escapeHtml(String(t.body))}</div>`
    : '';

  const signatureBlock = t?.signature
    ? `<div style="margin-top:24px;">
        <div>Sincerely,</div>
        <div style="margin-top:12px;font-weight:600;">${escapeHtml(t.signature.name ?? '')}</div>
        <div>${escapeHtml(t.signature.designation ?? '')}</div>
      </div>`
    : '';

  // Any additional fields not covered above -> generic table for completeness
  const known = new Set(['date', 'recipient', 'body', 'company', 'signature']);
  const extras: Record<string, any> = {};
  for (const [k, v] of Object.entries(t || {})) {
    if (!known.has(k)) extras[k] = v;
  }
  const extrasBlock = Object.keys(extras).length ? `<div style="margin-top:16px;">${renderObjectToTable(extras)}</div>` : '';

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(type)}</title>
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
        ${companyBlock}
        ${dateLine}
        ${recipientBlock}
        ${bodyBlock}
        ${extrasBlock}
        ${signatureBlock}
      </div>
    </body>
  </html>`;

  // Suggest a file stub like "Type_John_Doe"
  const keyOrder = [
    'Invoice Number', 'Invoice', 'Invoice ID', 'Employee Name', 'Recipient Name', 'Name',
    'Reference', 'Ref', 'Order Number', 'Order No', 'Contract Number', 'ID', 'Code'
  ];
  const findKey = () => {
    for (const k of keyOrder) {
      const found = Object.keys(userValues).find((u) => u.toLowerCase() === k.toLowerCase());
      if (found && userValues[found]) return String(userValues[found]);
    }
    return undefined;
  };
  const keyVal = findKey();
  const suggestedFileStub = [type, keyVal].filter(Boolean).join('_');

  return { html, suggestedFileStub };
};

// ---------------- Schema → TemplateConfig auto-generation (block-style) ----------------
const schemaToTemplateConfig = (schema: JSONSchema): TemplateConfig => {
  const titleCase = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const makePath = (parent: string, key: string) => (parent ? `${parent}.${key}` : key);
  const isPrimitive = (t?: string) => t === 'string' || t === 'number' || t === 'integer' || t === 'boolean';

  const buildBlocks = (s: JSONSchema, parentPath = ''): TemplateBlock[] => {
    const blocks: TemplateBlock[] = [];
    const primitiveRows: Array<{ label: string; bind: { path: string } }> = [];
    for (const [key, prop] of Object.entries(s.properties || {})) {
      const path = makePath(parentPath, key);
      const label = prop.title || titleCase(key);
      if (isPrimitive(prop.type)) {
        primitiveRows.push({ label, bind: { path } });
        continue;
      }
      if (prop.type === 'array') {
        const items = prop.items;
        if (items && items.type === 'object' && items.properties) {
          const columns = Object.entries(items.properties).map(([colKey, colProp]) => ({
            header: (colProp as JSONSchemaProperty).title || titleCase(colKey),
            path: colKey,
          }));
          blocks.push({ type: 'table', columns, dataPath: path } as TemplateBlock);
        } else {
          blocks.push({ type: 'list', dataPath: path } as TemplateBlock);
        }
        continue;
      }
      if (prop.type === 'object' && prop.properties) {
        blocks.push({ type: 'heading', text: label, level: 3 } as TemplateBlock);
        const innerSchema: JSONSchema = { type: 'object', properties: prop.properties, required: prop.required };
        blocks.push(...buildBlocks(innerSchema, path));
        continue;
      }
    }
    if (primitiveRows.length) blocks.push({ type: 'keyValueList', rows: primitiveRows } as TemplateBlock);
    return blocks;
  };

  return {
    title: undefined,
    styles: {
      table: { borderCollapse: 'collapse', width: '100%' },
      th: { fontWeight: '600', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px' },
      td: { border: '1px solid #e5e7eb', padding: '8px' },
      paragraph: { margin: '0 0 12px' },
      heading: { margin: '12px 0 6px', fontWeight: '600' },
      // defaults for keyValueList
      kvList: { display: 'grid', rowGap: '8px' },
      kvRow: { display: 'grid', gridTemplateColumns: '220px 1fr', columnGap: '12px', alignItems: 'start' },
      kvLabel: { fontWeight: '600', color: '#374151' },
      kvValue: { color: '#111827' },
    },
    blocks: buildBlocks(schema),
  } as TemplateConfig;
};