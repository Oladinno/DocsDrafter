import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { signUp } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await signUp(
        data.email,
        data.password,
        data.fullName
      );
      
      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (authData.user) {
        reset();
        Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before signing in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (isLoading) {
    return <LoadingSpinner message="Creating your account..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-center text-gray-900 mb-2">
              Create Account
            </Text>
            <Text className="text-base text-center text-gray-600">
              Join DocsDrafter to manage your documents
            </Text>
          </View>

          {/* Registration Form */}
          <View className="space-y-6">
            {/* Full Name Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Full Name
              </Text>
              <Controller
                control={control}
                name="fullName"
                rules={{
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Full name must be at least 2 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`input-field ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.fullName && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.fullName.message}
                </Text>
              )}
            </View>

            {/* Email Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`input-field ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`input-field ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a strong password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.password && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`input-field ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Password Requirements */}
            <View className="bg-blue-50 p-4 rounded-lg">
              <Text className="text-sm font-medium text-blue-800 mb-2">
                Password Requirements:
              </Text>
              <Text className="text-xs text-blue-700">
                • At least 8 characters long{"\n"}
                • Contains uppercase and lowercase letters{"\n"}
                • Contains at least one number
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              className="btn-primary"
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-semibold text-center">
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Terms and Privacy */}
            <Text className="text-xs text-gray-500 text-center leading-4">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500 text-sm">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Sign In Link */}
            <View className="flex-row justify-center">
              <Text className="text-gray-600 text-sm">
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignIn}>
                <Text className="text-primary-600 text-sm font-medium">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}