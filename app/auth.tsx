import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { signIn, signUp } from '../lib/supabase';

type FormData = {
  email: string;
  password: string;
  confirmPassword?: string;
};

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>();
  const password = watch('password');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { data: authData, error } = await signUp(data.email, data.password);
        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          Alert.alert(
            'Success', 
            'Account created successfully! Please check your email for verification.',
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
        }
      } else {
        const { data: authData, error } = await signIn(data.email, data.password);
        if (error) {
          Alert.alert('Sign In Error', error.message);
        } else {
          Alert.alert(
            'Success', 
            'Signed in successfully!',
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    reset();
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-3xl font-bold text-center text-gray-800 mb-8">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        
        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 mb-2 font-medium">Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  placeholder="Enter your email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              )}
            />
            {errors.email && (
              <Text className="text-red-500 text-sm mt-1">{errors.email.message}</Text>
            )}
          </View>

          <View>
            <Text className="text-gray-700 mb-2 font-medium">Password</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoComplete="password"
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>
            )}
          </View>

          {isSignUp && (
            <View>
              <Text className="text-gray-700 mb-2 font-medium">Confirm Password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="password"
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            className={`py-4 rounded-lg mt-6 ${
              loading ? 'bg-gray-400' : 'bg-blue-500'
            }`}
          >
            <Text className="text-white text-center font-semibold text-lg">
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMode} className="mt-4">
            <Text className="text-blue-500 text-center">
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}