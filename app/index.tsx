import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, user, profile } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, loading, router]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (loading) {
    return <LoadingSpinner message="Loading DocsDrafter..." />;
  }

  // If user is authenticated, they'll be redirected to dashboard
  // This component only shows for unauthenticated users

  return (
    <View className="flex-1 bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <View className="flex-1 justify-center items-center px-6 py-12">
        {/* Logo/Brand */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-primary-600 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">📝</Text>
          </View>
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            DocsDrafter
          </Text>
          <Text className="text-lg text-gray-600 text-center">
            Your intelligent document management solution
          </Text>
        </View>

        {/* Features */}
        <View className="w-full max-w-sm mb-12">
          <View className="bg-white rounded-lg p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Why Choose DocsDrafter?
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row items-center">
                <Text className="text-primary-600 text-lg mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Secure document storage</Text>
              </View>
              
              <View className="flex-row items-center">
                <Text className="text-primary-600 text-lg mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Role-based access control</Text>
              </View>
              
              <View className="flex-row items-center">
                <Text className="text-primary-600 text-lg mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Real-time collaboration</Text>
              </View>
              
              <View className="flex-row items-center">
                <Text className="text-primary-600 text-lg mr-3">✓</Text>
                <Text className="text-gray-700 flex-1">Cross-platform access</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full max-w-sm space-y-4">
          <TouchableOpacity
            className="btn-primary"
            onPress={handleGetStarted}
          >
            <Text className="text-white text-lg font-semibold text-center">
              Get Started
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="btn-secondary"
            onPress={handleSignIn}
          >
            <Text className="text-primary-600 text-lg font-medium text-center">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-12">
          <Text className="text-sm text-gray-500 text-center">
            Secure • Reliable • Easy to Use
          </Text>
        </View>
      </View>
    </View>
  );
}