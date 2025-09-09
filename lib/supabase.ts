import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage implementation using Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client with secure storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'user';
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'admin' | 'user';
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string;
          role?: 'admin' | 'user';
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          name: string;
          json_schema: any;
          description: string | null;
          created_at: string;
          metadata: any;
        };
        Insert: {
          name: string;
          json_schema: any;
          description?: string | null;
        };
        Update: {
          name?: string;
          json_schema?: any;
          description?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          template_name: string;
          storage_path: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_name: string;
          storage_path: string;
          file_type: string;
        };
        Update: {
          template_name?: string;
          storage_path?: string;
          file_type?: string;
        };
      };
    };
    Enums: {
      user_role: 'admin' | 'user';
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Database table types
export type UserProfile = Tables<'profiles'>;
export type Template = Tables<'templates'>;
export type Document = Tables<'documents'>;
export type UserRole = 'admin' | 'user';

// Form data type for document generation
export interface DocumentFormData {
  [key: string]: any;
}

// Helper functions for common operations
export const auth = supabase.auth;
export const storage = supabase.storage;

// Auth helper functions
export const signUp = async (email: string, password: string, fullName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'user', // Default role
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'docsdrafter://reset-password',
  });
  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

// Profile management functions
export const getUserProfile = async (userId: string): Promise<{ profile: UserProfile | null; error: any }> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile, error };
};

export const createUserProfile = async (profile: Database['public']['Tables']['profiles']['Insert']) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId: string, updates: Database['public']['Tables']['profiles']['Update']) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

// Role-based access control
export const hasRole = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  if (requiredRole === 'user') return userRole === 'user' || userRole === 'admin';
  if (requiredRole === 'admin') return userRole === 'admin';
  return false;
};

export const canAccessDocument = async (userId: string, documentId: string): Promise<boolean> => {
  const { data: document, error } = await supabase
    .from('documents')
    .select('user_id')
    .eq('id', documentId)
    .single();
  
  if (error || !document) return false;
  
  // Users can only access their own documents
  return document.user_id === userId;
};

// Template management functions
export const getTemplates = async () => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('name', { ascending: true });
  return { data, error };
};

export const getTemplate = async (templateId: string) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();
  return { data, error };
};

export const getTemplateByName = async (templateName: string) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('name', templateName)
    .single();
  return { data, error };
};

// Document management functions
export const getUserDocuments = async (userId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createDocument = async (document: Database['public']['Tables']['documents']['Insert']) => {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single();
  return { data, error };
};

export const updateDocument = async (documentId: string, updates: Database['public']['Tables']['documents']['Update']) => {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();
  return { data, error };
};

export const deleteDocument = async (documentId: string) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);
  return { error };
};

// Document generation function
export const generateDocument = async (
  templateId: string, 
  userInputs: DocumentFormData, 
  fileType: 'PDF' | 'DOCX' = 'PDF'
) => {
  try {
    console.log('Calling Edge Function with:', {
      template_id: templateId,
      user_inputs: userInputs,
      file_type: fileType,
    });
    
    const { data, error } = await supabase.functions.invoke('generate-document', {
      body: {
        template_id: templateId,
        user_inputs: userInputs,
        file_type: fileType,
      },
    });
    
    if (error) {
      console.error('Edge Function Error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        context: error.context
      });
      
      // Provide more specific error messages
      if (error.message?.includes('non-2xx status code')) {
        return {
          data: null,
          error: {
            ...error,
            message: 'Document generation service is currently unavailable. This may be due to missing environment variables or service configuration issues. Please contact support.',
            userFriendly: true
          }
        };
      }
    }
    
    console.log('Edge Function Response:', data);
    return { data, error };
  } catch (err) {
    console.error('Unexpected error in generateDocument:', err);
    return {
      data: null,
      error: {
        message: 'An unexpected error occurred during document generation. Please try again.',
        originalError: err,
        userFriendly: true
      }
    };
  }
};

// Enhanced document management functions
export const getDocumentById = async (documentId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      templates (
        id,
        name,
        description
      )
    `)
    .eq('id', documentId)
    .single();
  return { data, error };
};

export const getDocumentDownloadUrl = async (filePath: string, expiresIn: number = 3600) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn);
  return { data, error };
};

export const downloadDocument = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);
  return { data, error };
};

export const deleteDocumentFile = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .remove([filePath]);
  return { data, error };
};

// Complete document deletion (database record + file)
export const deleteDocumentComplete = async (documentId: string) => {
  // First get the document to find the file path
  const { data: document, error: fetchError } = await getDocumentById(documentId);
  if (fetchError || !document) {
    return { error: fetchError || new Error('Document not found') };
  }

  // Delete the file from storage
  const { error: storageError } = await deleteDocumentFile(document.file_path);
  if (storageError) {
    console.warn('Failed to delete file from storage:', storageError);
  }

  // Delete the database record
  const { error: dbError } = await deleteDocument(documentId);
  return { error: dbError };
};

// Document status update function removed - status field not in schema

// Get documents with template information
export const getUserDocumentsWithTemplates = async (userId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      templates (
        id,
        name,
        description
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

// Filter documents by status function removed - status field not in schema

// Search documents by template name
export const searchUserDocuments = async (userId: string, searchTerm: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      templates (
        id,
        name,
        description
      )
    `)
    .eq('user_id', userId)
    .ilike('template_name', `%${searchTerm}%`)
    .order('created_at', { ascending: false });
  return { data, error };
};

// Document generation with progress tracking
export const generateDocumentWithTracking = async (
  templateId: string,
  userInputs: DocumentFormData,
  fileType: 'PDF' | 'DOCX' = 'PDF',
  onProgress?: (status: string) => void
) => {
  try {
    onProgress?.('Starting document generation...');
    
    const { data, error } = await generateDocument(templateId, userInputs, fileType);
    
    if (error) {
      onProgress?.('Document generation failed');
      return { data: null, error };
    }
    
    onProgress?.('Document generated successfully');
    return { data, error: null };
  } catch (err) {
    onProgress?.('Document generation failed');
    return { data: null, error: err };
  }
};