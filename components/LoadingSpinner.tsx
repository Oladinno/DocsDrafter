import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'large', 
  color = '#3b82f6' 
}: LoadingSpinnerProps) {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-gray-600 mt-4 text-lg">{message}</Text>
      )}
    </View>
  );
}