import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  getCurrentUser,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  hasRole as checkUserRole,
  UserProfile,
  UserRole,
} from '../lib/supabase';

// Auth Context
const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  hasRole: (requiredRole: UserRole) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { profile: userProfile, error } = await getUserProfile(userId);
      if (error) {
        console.error('Error loading user profile:', error);
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await createUserProfile({
            id: userId,
            email: user?.email || '',
            role: 'user',
            full_name: user?.user_metadata?.full_name || null,
          });
          if (createError) {
            console.error('Error creating user profile:', createError);
          } else {
            setProfile(newProfile);
          }
        }
      } else {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  }, [user]);

  // Function to refresh profile
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  }, [user?.id, loadUserProfile]);

  // Function to sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabaseSignOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in signOut:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to check user role
  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!profile?.role) return false;
    if (requiredRole === 'user') return profile.role === 'user' || profile.role === 'admin';
    if (requiredRole === 'admin') return profile.role === 'admin';
    return false;
  }, [profile?.role]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Load user profile if user exists
          if (session?.user?.id) {
            await loadUserProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user?.id) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    role: profile?.role || null,
    hasRole,
    signOut,
    refreshProfile,
  };
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Additional auth helper hooks
export function useUser() {
  const { user, profile, loading, role, hasRole } = useAuth();
  return { user, profile, loading, role, hasRole };
}

export function useSession() {
  const { session, loading } = useAuth();
  return { session, loading };
}

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth();
  return { profile, loading, refreshProfile };
}

export function useRole() {
  const { role, hasRole, loading } = useAuth();
  return { role, hasRole, loading };
}

// Hook for checking if user is authenticated
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading, requiresAuth: !isAuthenticated && !loading };
}

// Hook for checking specific role requirements
export function useRequireRole(requiredRole: UserRole) {
  const { hasRole, loading, isAuthenticated } = useAuth();
  const hasRequiredRole = hasRole(requiredRole);
  return { 
    hasRequiredRole, 
    loading, 
    isAuthenticated,
    requiresRole: isAuthenticated && !hasRequiredRole && !loading 
  };
}