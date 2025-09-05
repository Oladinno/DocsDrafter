import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useRequireAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { UserRole } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole;
  fallbackRoute?: string;
  loadingMessage?: string;
}

export function ProtectedRoute({
  children,
  requireRole,
  fallbackRoute = '/login',
  loadingMessage = 'Checking authentication...',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, loading, hasRole } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    React.useEffect(() => {
      router.replace(fallbackRoute);
    }, [router, fallbackRoute]);
    
    return <LoadingSpinner message="Redirecting to login..." />;
  }

  // Check role-based access if required
  if (requireRole && !hasRole(requireRole)) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-6">
        <View className="bg-white rounded-lg p-6 shadow-sm max-w-sm w-full">
          {/* Access Denied Icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Text className="text-red-600 text-2xl">⚠️</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Access Denied
            </Text>
            <Text className="text-base text-gray-600 text-center leading-6">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </Text>
          </View>

          {/* Role Information */}
          <View className="bg-yellow-50 p-4 rounded-lg mb-4">
            <Text className="text-sm font-medium text-yellow-800 mb-1">
              Required Role:
            </Text>
            <Text className="text-sm text-yellow-700 capitalize">
              {requireRole}
            </Text>
          </View>

          {/* Back Button */}
          <View className="flex-row justify-center">
            <Text 
              className="text-primary-600 text-sm font-medium"
              onPress={() => router.back()}
            >
              Go Back
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Render protected content
  return <>{children}</>;
}

// Higher-order component for protecting entire screens
export function withProtectedRoute<T extends object>(
  Component: React.ComponentType<T>,
  options?: {
    requireRole?: UserRole;
    fallbackRoute?: string;
    loadingMessage?: string;
  }
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute
        requireRole={options?.requireRole}
        fallbackRoute={options?.fallbackRoute}
        loadingMessage={options?.loadingMessage}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for programmatic route protection
export function useRouteProtection({
  requireRole,
  fallbackRoute = '/login',
}: {
  requireRole?: UserRole;
  fallbackRoute?: string;
} = {}) {
  const router = useRouter();
  const { isAuthenticated, loading, hasRole } = useAuth();

  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace(fallbackRoute);
      return;
    }

    if (requireRole && !hasRole(requireRole)) {
      router.replace('/unauthorized');
      return;
    }
  }, [isAuthenticated, loading, hasRole, requireRole, router, fallbackRoute]);

  return {
    isAuthorized: isAuthenticated && (!requireRole || hasRole(requireRole)),
    isLoading: loading,
  };
}

// Component for unauthorized access page
export function UnauthorizedScreen() {
  const router = useRouter();
  const { user, role } = useAuth();

  return (
    <View className="flex-1 bg-gray-50 justify-center items-center px-6">
      <View className="bg-white rounded-lg p-6 shadow-sm max-w-sm w-full">
        {/* Unauthorized Icon */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <Text className="text-red-600 text-2xl">🚫</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Unauthorized Access
          </Text>
          <Text className="text-base text-gray-600 text-center leading-6">
            You don't have the required permissions to access this resource.
          </Text>
        </View>

        {/* User Information */}
        {user && (
          <View className="bg-gray-50 p-4 rounded-lg mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Current User:
            </Text>
            <Text className="text-sm text-gray-600">
              {user.email}
            </Text>
            {role && (
              <Text className="text-sm text-gray-600 capitalize mt-1">
                Role: {role}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View className="space-y-3">
          <Text 
            className="btn-primary text-center"
            onPress={() => router.replace('/dashboard')}
          >
            <Text className="text-white text-base font-semibold">
              Go to Dashboard
            </Text>
          </Text>
          
          <Text 
            className="text-primary-600 text-base font-medium text-center"
            onPress={() => router.back()}
          >
            Go Back
          </Text>
        </View>
      </View>
    </View>
  );
}