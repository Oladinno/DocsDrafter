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
      documents: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          content?: string | null;
          user_id: string;
        };
        Update: {
          title?: string;
          content?: string | null;
          updated_at?: string;
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

// User profile type
export type UserProfile = Tables<'profiles'>;
export type UserRole = 'admin' | 'user';

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

// Document management functions
export const getUserDocuments = async (userId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
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
    .update({ ...updates, updated_at: new Date().toISOString() })
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