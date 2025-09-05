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
import { resetPassword } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        Alert.alert('Reset Failed', error.message);
      } else {
        setEmailSent(true);
        reset();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        Alert.alert('Resend Failed', error.message);
      } else {
        Alert.alert('Email Sent', 'Password reset email has been sent again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Sending reset email..." />;
  }

  if (emailSent) {
    return (
      <View className="flex-1 bg-gray-50 justify-center px-6">
        <View className="bg-white rounded-lg p-6 shadow-sm">
          {/* Success Icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Text className="text-green-600 text-2xl">✓</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
              Check Your Email
            </Text>
            <Text className="text-base text-gray-600 text-center leading-6">
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
            </Text>
          </View>

          {/* Instructions */}
          <View className="bg-blue-50 p-4 rounded-lg mb-6">
            <Text className="text-sm font-medium text-blue-800 mb-2">
              Next Steps:
            </Text>
            <Text className="text-sm text-blue-700 leading-5">
              1. Check your email inbox{"\n"}
              2. Click the reset link in the email{"\n"}
              3. Create a new password{"\n"}
              4. Return to the app to sign in
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className="btn-primary"
              onPress={handleBackToLogin}
            >
              <Text className="text-white text-base font-semibold text-center">
                Back to Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="btn-secondary"
              onPress={handleResendEmail}
              disabled={isLoading}
            >
              <Text className="text-primary-600 text-base font-medium text-center">
                Resend Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text className="text-xs text-gray-500 text-center mt-4 leading-4">
            Didn't receive the email? Check your spam folder or try resending.
          </Text>
        </View>
      </View>
    );
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
              Reset Password
            </Text>
            <Text className="text-base text-center text-gray-600 leading-6">
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Reset Form */}
          <View className="space-y-6">
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
                    placeholder="Enter your email address"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Info Box */}
            <View className="bg-yellow-50 p-4 rounded-lg">
              <Text className="text-sm font-medium text-yellow-800 mb-1">
                Important:
              </Text>
              <Text className="text-sm text-yellow-700 leading-5">
                Make sure to use the same email address you used to create your account. The reset link will expire in 1 hour.
              </Text>
            </View>

            {/* Send Reset Email Button */}
            <TouchableOpacity
              className="btn-primary"
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-semibold text-center">
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500 text-sm">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Back to Login */}
            <View className="flex-row justify-center">
              <Text className="text-gray-600 text-sm">
                Remember your password?{' '}
              </Text>
              <TouchableOpacity onPress={handleBackToLogin}>
                <Text className="text-primary-600 text-sm font-medium">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}