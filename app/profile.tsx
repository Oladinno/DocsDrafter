import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Divider,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useResponsiveStyles, useResponsiveLayout } from '../src/hooks/useResponsive';

export default function ProfileScreen() {
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();
  const paperTheme = usePaperTheme();
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
    <ScrollView 
      style={[responsive.containerStyle, { backgroundColor: 'white' }]}
      contentContainerStyle={{
        padding: responsive.spacing.md,
        maxWidth: responsive.isTablet ? 600 : undefined,
        alignSelf: responsive.isTablet ? 'center' : 'stretch',
        width: responsive.isTablet ? '100%' : undefined
      }}
    >
      <View style={{ paddingHorizontal: responsive.spacing.lg, paddingVertical: responsive.spacing.xl }}>
        <Card style={{ 
          marginBottom: responsive.spacing.lg,
          backgroundColor: paperTheme.colors.surface 
        }}>
          <Card.Content style={{ padding: responsive.spacing.lg }}>
            <Text 
              variant="headlineSmall" 
              style={{ 
                marginBottom: responsive.spacing.md,
                textAlign: responsive.isPhone ? 'left' : 'center',
                color: paperTheme.colors.onSurface
              }}
            >
              Profile Information
            </Text>
            
            <View style={{ 
              alignItems: 'center', 
              marginBottom: responsive.spacing.lg 
            }}>
              <Avatar.Text 
                size={responsive.getIconSize('large')}
                label={user?.email?.charAt(0)?.toUpperCase() || 'U'}
                style={{ 
                  marginBottom: responsive.spacing.md,
                  backgroundColor: paperTheme.colors.primary
                }}
              />
              <Text 
                variant="titleLarge" 
                style={{ 
                  color: paperTheme.colors.onSurface,
                  textAlign: 'center'
                }}
              >
                {user?.email}
              </Text>
              <Text 
                variant="bodyMedium" 
                style={{ 
                  color: paperTheme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  marginTop: responsive.spacing.xs
                }}
              >
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          
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
        </Card.Content>
      </Card>
      
      <Card style={{ 
        backgroundColor: paperTheme.colors.surface 
      }}>
        <Card.Content style={{ padding: responsive.spacing.lg }}>
            <Divider style={{ marginVertical: responsive.spacing.md }} />
           
           <View style={{ gap: responsive.spacing.md }}>
             <Text 
               variant="titleMedium" 
               style={{ 
                 color: paperTheme.colors.onSurface,
                 marginBottom: responsive.spacing.sm
               }}
             >
               Account Actions
             </Text>
             
             <Button 
               mode="contained"
               onPress={handleSignOut}
               icon="logout"
               buttonColor={paperTheme.colors.error}
               textColor={paperTheme.colors.onError}
               style={{ 
                 marginTop: responsive.spacing.sm,
                 alignSelf: responsive.isPhone ? 'stretch' : 'center',
                 minWidth: responsive.isPhone ? undefined : 200
               }}
               contentStyle={{ 
                 paddingVertical: responsive.spacing.xs 
               }}
             >
               Sign Out
             </Button>
           </View>
           </Card.Content>
         </Card>
      </View>
    </ScrollView>
  );
}