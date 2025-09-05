import { Stack } from 'expo-router';
import { AuthProvider } from '../hooks/useAuth';
import '../global.css'; // NativeWind styles

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4f4f5',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="unauthorized" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Authentication' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      </Stack>
    </AuthProvider>
  );
}