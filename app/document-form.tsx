import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FieldValues } from 'react-hook-form';
import DynamicFormGenerator from '../components/DynamicFormGenerator';
import { generateDocumentWithTracking, DocumentFormData } from '../lib/supabase';
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
  const [selectedFileType, setSelectedFileType] = useState<'PDF' | 'DOCX'>('PDF');
  const [generationStatus, setGenerationStatus] = useState<string>('');

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
    if (!user || !templateId) {
      Alert.alert('Error', 'User not authenticated or template not found.');
      return;
    }

    setLoading(true);
    setGenerationStatus('Preparing document generation...');
    
    try {
      // Generate document using enhanced Supabase Edge Function
      const { data: generatedDoc, error: generateError } = await generateDocumentWithTracking(
        templateId,
        formData as DocumentFormData,
        selectedFileType,
        (status) => setGenerationStatus(status)
      );

      if (generateError) {
        console.error('Error generating document:', generateError);
        Alert.alert(
          'Generation Error',
          'Failed to generate document. Please try again.'
        );
        return;
      }

      if (!generatedDoc || !generatedDoc.document_id) {
        Alert.alert(
          'Generation Error',
          'Document generation failed. Please try again.'
        );
        return;
      }

      Alert.alert(
        'Success',
        `${selectedFileType} document generated successfully!`,
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
      setGenerationStatus('');
    }
  };

  const FileTypeSelector = () => (
    <View className="bg-white mx-4 mb-4 rounded-lg border border-gray-200">
      <View className="p-4 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Select File Type
        </Text>
        <Text className="text-sm text-gray-600">
          Choose the format for your generated document
        </Text>
      </View>
      <View className="p-4">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            className={`flex-1 p-4 rounded-lg border-2 ${
              selectedFileType === 'PDF'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
            onPress={() => setSelectedFileType('PDF')}
            disabled={loading}
          >
            <View className="items-center">
              <Ionicons
                name="document-text"
                size={32}
                color={selectedFileType === 'PDF' ? '#3B82F6' : '#6B7280'}
              />
              <Text
                className={`mt-2 font-medium ${
                  selectedFileType === 'PDF' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                PDF
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                Portable Document Format
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 p-4 rounded-lg border-2 ${
              selectedFileType === 'DOCX'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
            onPress={() => setSelectedFileType('DOCX')}
            disabled={loading}
          >
            <View className="items-center">
              <Ionicons
                name="document"
                size={32}
                color={selectedFileType === 'DOCX' ? '#3B82F6' : '#6B7280'}
              />
              <Text
                className={`mt-2 font-medium ${
                  selectedFileType === 'DOCX' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                DOCX
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                Microsoft Word Document
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
          <View className="bg-white rounded-lg p-6 items-center max-w-sm mx-4">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-900 font-medium mt-4 text-center">
              Generating {selectedFileType} Document...
            </Text>
            {generationStatus && (
              <Text className="text-gray-600 text-sm mt-2 text-center">
                {generationStatus}
              </Text>
            )}
            <Text className="text-gray-500 text-xs mt-2 text-center">
              This may take a few moments
            </Text>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* File Type Selector */}
        <FileTypeSelector />
        
        {/* Form */}
        <DynamicFormGenerator
          schema={schema}
          onSubmit={handleFormSubmit}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DocumentFormScreen;