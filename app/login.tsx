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
import { signIn } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await signIn(data.email, data.password);
      
      if (error) {
        Alert.alert('Login Failed', error.message);
      } else if (authData.user) {
        reset();
        router.replace('/dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/register');
  };

  if (isLoading) {
    return <LoadingSpinner message="Signing you in..." />;
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
                Welcome Back
              </Text>
              <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                Sign in to your DocsDrafter account
              </Text>
            </View>

            {/* Login Form */}
            <View style={{ gap: 16 }}>
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
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    label="Password"
                    placeholder="Enter your password"
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

              {/* Forgot Password Link */}
              <View style={{ alignItems: 'flex-end' }}>
                <Button mode="text" onPress={handleForgotPassword}>
                  Forgot your password?
                </Button>
              </View>

              {/* Sign In Button */}
              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                loading={isLoading}
                style={{ marginTop: 8 }}
                contentStyle={{ paddingVertical: 8 }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Divider */}
              <View style={{ marginVertical: 24 }}>
                <Divider />
                <Text variant="bodyMedium" style={{ 
                  textAlign: 'center', 
                  marginTop: -12, 
                  backgroundColor: theme.colors.surface, 
                  paddingHorizontal: 16,
                  color: theme.colors.onSurfaceVariant 
                }}>
                  or
                </Text>
              </View>

              {/* Sign Up Link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Don't have an account?{' '}
                </Text>
                <Button mode="text" onPress={handleSignUp} compact>
                  Sign up
                </Button>
              </View>
            </View>
          </Surface>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}