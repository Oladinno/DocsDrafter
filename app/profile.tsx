import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { user, error } = await getCurrentUser();
      if (error) {
        console.error('Error getting user:', error);
        Alert.alert('Error', 'Failed to load user profile');
        router.replace('/auth');
      } else if (!user) {
        Alert.alert('Error', 'No user found');
        router.replace('/auth');
      } else {
        setUser(user);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Success', 
          'Signed out successfully',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-lg text-gray-600">Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-lg text-gray-600 mb-4">No user found</Text>
        <TouchableOpacity 
          onPress={() => router.replace('/auth')}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        <View className="bg-gray-50 rounded-lg p-6 mb-6">
          <Text className="text-2xl font-bold text-gray-800 mb-4">Profile Information</Text>
          
          <View className="space-y-4">
            <View>
              <Text className="text-gray-600 font-medium mb-1">Email</Text>
              <Text className="text-gray-800 text-lg">{user.email}</Text>
            </View>
            
            <View>
              <Text className="text-gray-600 font-medium mb-1">User ID</Text>
              <Text className="text-gray-800 text-sm font-mono">{user.id}</Text>
            </View>
            
            <View>
              <Text className="text-gray-600 font-medium mb-1">Created At</Text>
              <Text className="text-gray-800">
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
            
            <View>
              <Text className="text-gray-600 font-medium mb-1">Last Sign In</Text>
              <Text className="text-gray-800">
                {user.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'
                }
              </Text>
            </View>
            
            <View>
              <Text className="text-gray-600 font-medium mb-1">Email Confirmed</Text>
              <Text className={`font-semibold ${
                user.email_confirmed_at ? 'text-green-600' : 'text-red-600'
              }`}>
                {user.email_confirmed_at ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>
        
        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => router.push('/')}
            className="bg-blue-500 py-4 rounded-lg"
          >
            <Text className="text-white text-center font-semibold text-lg">Go to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSignOut}
            className="bg-red-500 py-4 rounded-lg"
          >
            <Text className="text-white text-center font-semibold text-lg">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}