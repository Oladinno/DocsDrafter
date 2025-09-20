import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FieldValues } from 'react-hook-form';
import {
  Surface,
  Appbar,
  Card,
  Button,
  Text as PaperText,
  Portal,
  Modal,
  ActivityIndicator as PaperActivityIndicator,
  useTheme,
  Snackbar,
} from 'react-native-paper';import DynamicFormGenerator from '../components/DynamicFormGenerator';
import { useDocumentGenerator } from '../hooks/useDocumentGenerator';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { useResponsive } from '../src/hooks/useResponsive';
import { getTemplate, Template as TemplateRow } from '../lib/supabase';

interface JSONSchema {
  type: string;
  properties: { [key: string]: any };
  required?: string[];
}

interface FileTypeSelectorProps {
  selectedFileType: 'pdf' | 'docx';
  setSelectedFileType: (fileType: 'pdf' | 'docx') => void;
  loading: boolean;
}

const FileTypeSelector: React.FC<FileTypeSelectorProps> = ({ selectedFileType, setSelectedFileType, loading }) => {
  const responsive = useResponsive();
  const paperTheme = useTheme();

  return (
    <Card style={{ margin: responsive.spacing.md, marginBottom: responsive.spacing.md }}>
      <Card.Content>
        <PaperText variant="titleMedium" style={{ marginBottom: responsive.spacing.sm }}>
          Select File Type
        </PaperText>
        <PaperText variant="bodyMedium" style={{ marginBottom: responsive.spacing.md, color: paperTheme.colors.onSurfaceVariant }}>
          Choose the format for your generated document
        </PaperText>
        <View style={{ flexDirection: 'row' }}>
          <Button
            mode={selectedFileType === 'pdf' ? 'contained' : 'outlined'}
            onPress={() => {
              Alert.alert('PDF Button Pressed');
              setSelectedFileType('pdf');
            }}
            icon="file-pdf-box"
            disabled={loading}
            style={{ flex: 1, marginRight: responsive.spacing.sm }}
          >
            PDF
          </Button>
          <Button
            mode={selectedFileType === 'docx' ? 'contained' : 'outlined'}
            onPress={() => {
              Alert.alert('DOCX Button Pressed');
              setSelectedFileType('docx');
            }}
            icon="file-word-box"
            disabled={loading}
            style={{ flex: 1 }}
          >
            DOCX
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const DocumentFormScreen: React.FC = () => {
  const { templateId, templateName, templateSchema } = useLocalSearchParams<{
    templateId: string;
    templateName: string;
    templateSchema: string;
  }>();
  
  const { user } = useAuth();
  const paperTheme = useTheme();
  const responsive = useResponsive();
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const { generate, loading, error: generationError } = useDocumentGenerator();
  const [initializing, setInitializing] = useState(true);
  const [selectedFileType, setSelectedFileType] = useState<'pdf' | 'docx'>('pdf');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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

  useEffect(() => {
    if (generationError) {
      setSnackbarMessage(generationError.message || 'An unexpected error occurred.');
      setSnackbarVisible(true);
    }
  }, [generationError]);

  const handleFormSubmit = async (formData: FieldValues) => {
    if (!user || !templateId) {
      Alert.alert('Error', 'User not authenticated or template not found.');
      return;
    }

    // Fetch full template to ensure metadata.templateConfig is available
    const { data: fullTemplate, error: tplErr } = await getTemplate(templateId);
    if (tplErr || !fullTemplate) {
      console.error('Failed to fetch full template:', tplErr);
      Alert.alert('Error', 'Unable to load template details. Please try again.');
      return;
    }

    await generate(fullTemplate as TemplateRow, formData, selectedFileType);

    if (!generationError) {
      Alert.alert(
        'Success',
        `${selectedFileType} document generated and saved!`,
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
    }
  };

  if (initializing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!schema) {
    return (
      <Surface style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Error" />
        </Appbar.Header>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color={paperTheme.colors.error} />
          <PaperText variant="headlineSmall" style={{ marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
            Invalid Template
          </PaperText>
          <PaperText variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 24, color: paperTheme.colors.onSurfaceVariant }}>
            The template schema could not be loaded. Please try selecting a different template.
          </PaperText>
          <Button
            mode="contained"
            onPress={() => router.back()}
            icon="arrow-left"
          >
            Go Back
          </Button>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} disabled={loading} />
        <Appbar.Content 
          title={templateName || 'Document Form'} 
          subtitle="Fill out the form below"
        />
      </Appbar.Header>

      {/* Loading Modal */}
      <Portal>
        <Modal visible={loading} dismissable={false}>
          <Card style={{ margin: 20, padding: 20, alignItems: 'center' }}>
            <PaperActivityIndicator size="large" />
            <PaperText variant="titleMedium" style={{ marginTop: 16, textAlign: 'center' }}>
              Generating {selectedFileType} Document...
            </PaperText>
            <PaperText variant="bodySmall" style={{ marginTop: 8, textAlign: 'center', color: paperTheme.colors.onSurfaceVariant }}>
              This may take a few moments
            </PaperText>
          </Card>
        </Modal>
      </Portal>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* File Type Selector */}
        <FileTypeSelector 
          selectedFileType={selectedFileType}
          setSelectedFileType={setSelectedFileType}
          loading={loading}
        />
        
        {/* Form */}
        <DynamicFormGenerator
          schema={schema}
          onSubmit={handleFormSubmit}
          loading={loading}
        />
      </ScrollView>

      {/* Snackbar for error messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </Surface>
  );
};

export default DocumentFormScreen;