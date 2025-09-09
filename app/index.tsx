import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, user, profile } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, loading, router]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (loading) {
    return <LoadingSpinner message="Loading DocsDrafter..." />;
  }

  // If user is authenticated, they'll be redirected to dashboard
  // This component only shows for unauthenticated users

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      {/* Header */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {/* Logo/Brand */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View 
            style={{ 
              width: 80, 
              height: 80, 
              backgroundColor: '#4A90E2', 
              borderRadius: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}
          >
            <Text style={{ fontSize: 36, color: 'white' }}>📝</Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
            DocsDrafter
          </Text>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
            Your intelligent document management solution
          </Text>
        </View>

        {/* Features */}
        <View style={{ width: '100%', maxWidth: 380, marginBottom: 48 }}>
          <View 
            style={{ 
              backgroundColor: 'white', 
              borderRadius: 16, 
              padding: 24, 
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 24, textAlign: 'center' }}>
              Why Choose DocsDrafter?
            </Text>
            
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: '#4A90E2', marginRight: 12 }}>✓</Text>
                <Text style={{ fontSize: 16, color: '#555', flex: 1 }}>Secure document storage</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: '#4A90E2', marginRight: 12 }}>✓</Text>
                <Text style={{ fontSize: 16, color: '#555', flex: 1 }}>Role-based access control</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: '#4A90E2', marginRight: 12 }}>✓</Text>
                <Text style={{ fontSize: 16, color: '#555', flex: 1 }}>Real-time collaboration</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, color: '#4A90E2', marginRight: 12 }}>✓</Text>
                <Text style={{ fontSize: 16, color: '#555', flex: 1 }}>Cross-platform access</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', maxWidth: 380, gap: 16 }}>
          <TouchableOpacity
            style={{ 
              backgroundColor: '#4A90E2', 
              paddingVertical: 16, 
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: 'white', textAlign: 'center' }}>
              Get Started
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ 
              backgroundColor: 'white', 
              paddingVertical: 16, 
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#4A90E2', textAlign: 'center' }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 48 }}>
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
            Secure • Reliable • Easy to Use
          </Text>
        </View>
      </View>
    </View>
  );
}