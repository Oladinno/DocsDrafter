import { Stack } from 'expo-router';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { useTheme as usePaperTheme } from 'react-native-paper';
import '../global.css'; // NativeWind styles
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function StackNavigator() {
  const paperTheme = usePaperTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: paperTheme.colors.surface,
        },
        headerTintColor: paperTheme.colors.onSurface,
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
        <Stack.Screen name="new-document" options={{ headerShown: false }} />
        <Stack.Screen name="document-form" options={{ headerShown: false }} />
      </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <StackNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}