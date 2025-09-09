import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { signUp } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const theme = useTheme();
  
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
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Surface style={{ padding: 24, borderRadius: 12, elevation: 2 }}>
            {/* Header */}
            <View style={{ marginBottom: 32, alignItems: 'center' }}>
              <Text variant="headlineMedium" style={{ marginBottom: 8, textAlign: 'center' }}>
                Create Account
              </Text>
              <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                Join DocsDrafter to manage your documents
              </Text>
            </View>

            {/* Registration Form */}
            <View style={{ gap: 16 }}>
              {/* Full Name Input */}
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
                    mode="outlined"
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoCorrect={false}
                    error={!!errors.fullName}
                    left={<TextInput.Icon icon="account" />}
                  />
                )}
              />
              {errors.fullName && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: -8 }}>
                  {errors.fullName.message}
                </Text>
              )}

              {/* Email Input */}
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
                    mode="outlined"
                    label="Email Address"
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={!!errors.email}
                    left={<TextInput.Icon icon="email" />}
                  />
                )}
              />
              {errors.email && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: -8 }}>
                  {errors.email.message}
                </Text>
              )}

              {/* Password Input */}
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
                    mode="outlined"
                    label="Password"
                    placeholder="Create a strong password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={!!errors.password}
                    left={<TextInput.Icon icon="lock" />}
                    right={<TextInput.Icon icon="eye" />}
                  />
                )}
              />
              {errors.password && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: -8 }}>
                  {errors.password.message}
                </Text>
              )}

              {/* Confirm Password Input */}
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
                    mode="outlined"
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={!!errors.confirmPassword}
                    left={<TextInput.Icon icon="lock-check" />}
                    right={<TextInput.Icon icon="eye" />}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: -8 }}>
                  {errors.confirmPassword.message}
                </Text>
              )}

              {/* Password Requirements */}
              <Surface style={{ padding: 16, marginVertical: 8, backgroundColor: theme.colors.primaryContainer, borderRadius: 8 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, marginBottom: 8 }}>
                  Password Requirements:
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  • At least 8 characters long{"\n"}
                  • Contains uppercase and lowercase letters{"\n"}
                  • Contains at least one number
                </Text>
              </Surface>

              {/* Sign Up Button */}
              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                loading={isLoading}
                style={{ marginVertical: 8 }}
                contentStyle={{ paddingVertical: 8 }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              {/* Terms and Privacy */}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 8 }}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                <Divider style={{ flex: 1 }} />
                <Text variant="bodyMedium" style={{ marginHorizontal: 16, color: theme.colors.onSurfaceVariant }}>or</Text>
                <Divider style={{ flex: 1 }} />
              </View>

              {/* Sign In Link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Already have an account?{' '}
                </Text>
                <Button mode="text" onPress={handleSignIn} compact>
                  Sign in
                </Button>
              </View>
            </View>
          </Surface>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}