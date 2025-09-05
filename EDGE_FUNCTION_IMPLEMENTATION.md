# Supabase Edge Function for Document Generation

This document outlines the complete implementation of the Supabase Edge Function for document generation, including client integration.

## Overview

The Edge Function accepts template data, user inputs, and file type preferences to generate PDF or DOCX documents. It handles the complete workflow from template processing to file storage and metadata management.

## Edge Function Implementation

### Location
`supabase/functions/generate-document/index.ts`

### Key Features
- **Template Processing**: Loads templates from database using `template_id`
- **Dynamic Content Generation**: Merges user inputs with template placeholders
- **Multi-format Support**: Generates both PDF (via pdf-lib) and DOCX (via docx) files
- **Secure Storage**: Uploads files to Supabase Storage with organized paths
- **Metadata Tracking**: Inserts document records with comprehensive metadata
- **Download URLs**: Returns signed URLs for secure file access

### Request Format
```typescript
interface DocumentRequest {
  template_id: string;
  user_inputs: Record<string, any>;
  file_type: 'PDF' | 'DOCX';
}
```

### Response Format
```typescript
interface DocumentResponse {
  success: boolean;
  document_id: string;
  download_url: string;
  file_path: string;
  created_at: string;
  message?: string;
  error?: string;
}
```

### Storage Structure
Files are stored in Supabase Storage with the path:
```
/documents/{user_id}/{document_id}.{ext}
```

## Client Integration

### Location
`lib/supabase.ts`

### Enhanced Functions

#### Core Generation Function
```typescript
export async function generateDocument(
  templateId: string,
  userInputs: Record<string, any>,
  fileType: 'PDF' | 'DOCX' = 'PDF'
): Promise<DocumentResponse>
```

#### Advanced Generation with Tracking
```typescript
export async function generateDocumentWithTracking(
  templateId: string,
  userInputs: Record<string, any>,
  fileType: 'PDF' | 'DOCX' = 'PDF',
  onStatusUpdate?: (status: string) => void
): Promise<DocumentResponse>
```

#### Document Management Functions
- `getDocumentById(documentId: string)`: Retrieve document metadata
- `deleteDocumentComplete(documentId: string)`: Delete document and file
- `updateDocumentStatus(documentId: string, status: string)`: Update document status
- `getDocumentDownloadUrl(filePath: string)`: Get fresh download URL

## UI Integration

### Location
`app/document-form.tsx`

### Enhanced Features
- **File Type Selection**: Users can choose between PDF and DOCX formats
- **Real-time Status Updates**: Shows generation progress with status messages
- **Improved UX**: Better loading states and error handling
- **Responsive Design**: Optimized for mobile devices

### Key Components
- `FileTypeSelector`: Toggle between PDF/DOCX options
- Enhanced loading overlay with status tracking
- Integrated form submission with new API

## Database Schema Updates

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  template_id UUID REFERENCES templates(id),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'DOCX')),
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Features

1. **Authentication**: All requests require valid Supabase auth
2. **Authorization**: Users can only access their own documents
3. **Input Validation**: Comprehensive validation of all inputs
4. **Secure Storage**: Files stored with proper access controls
5. **Signed URLs**: Time-limited download URLs for security

## Error Handling

- **Template Not Found**: Returns 404 with descriptive message
- **Invalid Inputs**: Returns 400 with validation errors
- **Generation Failures**: Returns 500 with error details
- **Storage Issues**: Handles upload failures gracefully
- **Database Errors**: Comprehensive error logging and user feedback

## Performance Optimizations

1. **Efficient Template Loading**: Direct database queries with minimal data transfer
2. **Streaming Uploads**: Large files handled efficiently
3. **Optimized PDF/DOCX Generation**: Uses efficient libraries
4. **Minimal Memory Usage**: Processes documents without excessive memory consumption

## Testing

To test the implementation:

1. **Create a Template**: Add a template with JSON schema to the database
2. **Use the Form**: Navigate to the document form with a template ID
3. **Select File Type**: Choose between PDF or DOCX
4. **Fill Form**: Complete the dynamic form based on template schema
5. **Generate Document**: Submit and monitor the generation process
6. **Download**: Use the provided download URL to access the generated file

## Dependencies

The implementation requires these packages:
- `pdf-lib`: For PDF generation
- `docx`: For DOCX generation
- `@supabase/supabase-js`: For Supabase integration

## Deployment

The Edge Function is deployed to Supabase and automatically available at:
```
https://your-project.supabase.co/functions/v1/generate-document
```

## Future Enhancements

1. **Template Versioning**: Support for template version control
2. **Batch Generation**: Generate multiple documents simultaneously
3. **Advanced Formatting**: Rich text and complex layout support
4. **Integration APIs**: Webhook support for external integrations
5. **Analytics**: Document generation analytics and reporting

This implementation provides a complete, production-ready document generation system with robust error handling, security, and user experience features.