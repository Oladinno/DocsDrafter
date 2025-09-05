import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FieldValues } from 'react-hook-form';
import DynamicFormGenerator from '../components/DynamicFormGenerator';
import { generateDocument, createDocument, DocumentFormData } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

interface JSONSchema {
  type: string;
  properties: { [key: string]: any };
  required?: string[];
}

const DocumentFormScreen: React.FC = () => {
  const { templateId, templateName, templateSchema } = useLocalSearchParams<{
    templateId: string;
    templateName: string;
    templateSchema: string;
  }>();
  
  const { user } = useAuth();
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (templateSchema) {
      try {
        const parsedSchema = JSON.parse(templateSchema);
        setSchema(parsedSchema);
      } catch (error) {
        console.error('Error parsing template schema:', error);
        Alert.alert(
          'Error',
          'Invalid template schema. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    }
    setInitializing(false);
  }, [templateSchema]);

  const handleFormSubmit = async (formData: FieldValues) => {
    if (!user || !templateName) {
      Alert.alert('Error', 'User not authenticated or template not found.');
      return;
    }

    setLoading(true);
    
    try {
      // Generate document using Supabase Edge Function
      const { data: generatedDoc, error: generateError } = await generateDocument(
        templateName,
        formData as DocumentFormData
      );

      if (generateError) {
        console.error('Error generating document:', generateError);
        Alert.alert(
          'Generation Error',
          'Failed to generate document. Please try again.'
        );
        return;
      }

      if (!generatedDoc || !generatedDoc.storage_path) {
        Alert.alert(
          'Generation Error',
          'Document was generated but no file path was returned.'
        );
        return;
      }

      // Save document record to database
      const { data: documentRecord, error: saveError } = await createDocument({
        user_id: user.id,
        template_name: templateName,
        storage_path: generatedDoc.storage_path,
        file_type: generatedDoc.file_type || 'pdf',
      });

      if (saveError) {
        console.error('Error saving document record:', saveError);
        Alert.alert(
          'Save Error',
          'Document was generated but failed to save record. Please check your documents list.'
        );
        return;
      }

      Alert.alert(
        'Success',
        'Document generated successfully!',
        [
          {
            text: 'View Documents',
            onPress: () => {
              router.dismissAll();
              router.replace('/dashboard');
            },
          },
          {
            text: 'Create Another',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error in document generation flow:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!schema) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            Invalid Template
          </Text>
          <Text className="text-sm text-gray-600 text-center mb-6">
            The template schema could not be loaded. Please try selecting a different template.
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <Text className="text-lg font-semibold text-gray-900 text-center">
              {templateName}
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              Fill out the form below
            </Text>
          </View>
          <View className="w-8" />
        </View>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black bg-opacity-50 z-50 justify-center items-center">
          <View className="bg-white rounded-lg p-6 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-900 font-medium mt-4">
              Generating Document...
            </Text>
            <Text className="text-gray-600 text-sm mt-2">
              This may take a few moments
            </Text>
          </View>
        </View>
      )}

      {/* Form */}
      <DynamicFormGenerator
        schema={schema}
        onSubmit={handleFormSubmit}
        loading={loading}
      />
    </SafeAreaView>
  );
};

export default DocumentFormScreen;