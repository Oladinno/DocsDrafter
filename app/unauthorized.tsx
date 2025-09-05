import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function UnauthorizedScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const handleGoToDashboard = () => {
    router.replace('/dashboard');
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 justify-center items-center px-6">
      <View className="bg-white rounded-lg p-6 shadow-sm max-w-sm w-full">
        {/* Unauthorized Icon */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <Text className="text-red-600 text-2xl">🚫</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Access Denied
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

        {/* Help Information */}
        <View className="bg-yellow-50 p-4 rounded-lg mb-4">
          <Text className="text-sm font-medium text-yellow-800 mb-1">
            Need Access?
          </Text>
          <Text className="text-sm text-yellow-700 leading-5">
            Contact your administrator to request the necessary permissions for this resource.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3">
          <TouchableOpacity
            className="btn-primary"
            onPress={handleGoToDashboard}
          >
            <Text className="text-white text-base font-semibold text-center">
              Go to Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="btn-secondary"
            onPress={handleGoBack}
          >
            <Text className="text-primary-600 text-base font-medium text-center">
              Go Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-100 py-3 px-4 rounded-lg"
            onPress={handleSignOut}
          >
            <Text className="text-gray-600 text-base font-medium text-center">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}