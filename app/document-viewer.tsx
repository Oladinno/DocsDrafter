import React, { useState, useEffect } from 'react';
import {
  View,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Dialog, IconButton, Portal, Snackbar, Surface, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { getDocumentById, getDocumentDownloadUrl, deleteDocumentComplete } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useResponsiveStyles, useResponsiveLayout } from '../src/hooks/useResponsive';
import type { Document } from '../lib/supabase';

interface DocumentViewerParams {
  documentId: string;
  title?: string;
}

function DocumentViewerScreen() {
  const { documentId, title } = useLocalSearchParams<DocumentViewerParams>();
  const router = useRouter();
  const { user } = useAuth();
  const paperTheme = usePaperTheme();
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();
  const [document, setDocument] = useState<Document | null>(null);
  const [pdfUri, setPdfUri] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const screenData = Dimensions.get('window');

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError('');

      if (!documentId) {
        setError('Document ID is required');
        return;
      }

      // Get document metadata
      const docData = await getDocumentById(documentId);
      if (!docData) {
        setError('Document not found');
        return;
      }

      setDocument(docData);

      // Get download URL for PDF viewing
      const downloadUrl = await getDocumentDownloadUrl(docData.storage_path);
      if (!downloadUrl) {
        setError('Unable to load document');
        return;
      }

      setPdfUri(downloadUrl);
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError('');

      if (!document || !pdfUri) {
        setError('Document not available for download');
        setSnackbarVisible(true);
        return;
      }

      // Create filename with proper extension
      const fileName = `${document.template_name.replace(/[^a-zA-Z0-9]/g, '_')}.${document.file_type.toLowerCase()}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(pdfUri, fileUri);

      if (downloadResult.status === 200) {
        // Check if sharing is available
        if (await isAvailableAsync()) {
          await shareAsync(downloadResult.uri, {
            mimeType: document.file_type === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: `Save ${document.template_name}`,
          });
          setSuccessMessage('Document downloaded and shared successfully');
        } else {
          setSuccessMessage(`File saved to: ${downloadResult.uri}`);
        }
        setSnackbarVisible(true);
      } else {
        throw new Error('Download failed');
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      setError(err.message || 'Failed to download document');
      setSnackbarVisible(true);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteDialogVisible(false);
      setError('');

      if (!document) {
        setError('Document not found');
        setSnackbarVisible(true);
        return;
      }

      await deleteDocumentComplete(document.id);

      setSuccessMessage('The document has been successfully deleted.');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
      setSnackbarVisible(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!pdfUri || !document) {
        setError('Document not available for sharing');
        setSnackbarVisible(true);
        return;
      }

      if (Platform.OS === 'ios') {
        await Share.share({
          url: pdfUri,
          title: document.template_name,
        });
      } else {
        await Share.share({
          message: `Check out this document: ${document.template_name}`,
          url: pdfUri,
          title: document.template_name,
        });
      }
    } catch (err: any) {
      console.error('Error sharing document:', err);
      setError('Failed to share document');
      setSnackbarVisible(true);
    }
  };

  if (loading) {
    return (
      <Surface style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          <Text style={{ color: paperTheme.colors.onSurface, marginTop: 16 }}>Loading document...</Text>
        </View>
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Error" />
        </Appbar.Header>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Surface 
            style={{ 
              padding: 32, 
              borderRadius: 16, 
              alignItems: 'center',
              backgroundColor: paperTheme.colors.errorContainer 
            }}
          >
            <Text 
              variant="headlineSmall" 
              style={{ 
                color: paperTheme.colors.onErrorContainer, 
                textAlign: 'center',
                marginBottom: 16 
              }}
            >
              Error Loading Document
            </Text>
            <Text 
              variant="bodyMedium" 
              style={{ 
                color: paperTheme.colors.onErrorContainer, 
                textAlign: 'center',
                marginBottom: 24 
              }}
            >
              {error}
            </Text>
            <Button 
              mode="contained" 
              onPress={loadDocument}
              style={{ backgroundColor: paperTheme.colors.primary }}
            >
              Try Again
            </Button>
          </Surface>
        </View>
      </Surface>
    );
  }

  return (
    <SafeAreaView style={responsive.containerStyle}>
      <Surface style={[responsive.containerStyle, { backgroundColor: paperTheme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content 
            title={document?.template_name || title || 'Document'} 
            titleStyle={{ fontSize: 20, fontWeight: 'bold' }}
            subtitle={document ? `${document.file_type} • ${new Date(document.created_at).toLocaleDateString()}` : ''}
          />
        </Appbar.Header>
      
      <Surface style={{ 
        padding: responsive.spacing.md, 
        backgroundColor: paperTheme.colors.surface 
      }}>
        
        {/* Action Buttons */}
        <View style={{ 
          flexDirection: layout.getFlexDirection('row'), 
          gap: responsive.spacing.sm,
          marginBottom: responsive.spacing.md,
          flexWrap: responsive.isPhone ? 'wrap' : 'nowrap'
        }}>
          <Button
            mode="outlined"
            onPress={handleShare}
            disabled={!pdfUri}
            icon="share"
            style={{ 
              flex: responsive.isPhone ? undefined : 1,
              minWidth: responsive.isPhone ? '30%' : undefined
            }}
            compact={responsive.isPhone}
          >
            Share
          </Button>
          
          <Button
            mode="contained"
            onPress={handleDownload}
            disabled={downloading || !pdfUri}
            loading={downloading}
            icon={downloading ? undefined : "download"}
            style={{ 
              flex: responsive.isPhone ? undefined : 1,
              minWidth: responsive.isPhone ? '30%' : undefined
            }}
            compact={responsive.isPhone}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleDelete}
            disabled={deleting}
            loading={deleting}
            icon={deleting ? undefined : "delete"}
            buttonColor={paperTheme.colors.errorContainer}
            textColor={paperTheme.colors.onErrorContainer}
            style={{ 
              flex: responsive.isPhone ? undefined : 1,
              minWidth: responsive.isPhone ? '30%' : undefined
            }}
            compact={responsive.isPhone}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </View>
      </Surface>

      {/* Document Info */}
      {document && (
        <Surface style={{ 
          padding: responsive.spacing.sm, 
          backgroundColor: paperTheme.colors.surfaceVariant 
        }}>
          <Text 
            variant="bodySmall" 
            style={{ color: paperTheme.colors.onSurfaceVariant }}
          >
            {document.file_type} • Created {new Date(document.created_at).toLocaleDateString()}
          </Text>
        </Surface>
      )}

      {/* PDF Viewer */}
      {pdfUri && document?.file_type === 'PDF' ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: pdfUri }}
            style={{
              flex: 1,
              width: responsive.screenWidth,
              height: responsive.screenHeight,
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setError('Failed to load PDF');
              setSnackbarVisible(true);
            }}
            onLoadStart={() => console.log('PDF loading started')}
            onLoadEnd={() => console.log('PDF loading completed')}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={paperTheme.colors.primary} />
                <Text style={{ color: paperTheme.colors.onSurface, marginTop: responsive.spacing.xs }}>Loading PDF...</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: responsive.spacing.lg }}>
          <Surface 
            style={{ 
              padding: responsive.spacing.xl, 
              borderRadius: responsive.spacing.md, 
              alignItems: 'center',
              backgroundColor: paperTheme.colors.surfaceVariant 
            }}
          >
            <Text 
              variant="headlineSmall" 
              style={{ 
                color: paperTheme.colors.onSurfaceVariant, 
                textAlign: 'center',
                marginBottom: responsive.spacing.md 
              }}
            >
              {document?.file_type === 'DOCX' ? 'Word Document' : 'Document'}
            </Text>
            <Text 
              variant="bodyMedium" 
              style={{ 
                color: paperTheme.colors.onSurfaceVariant, 
                textAlign: 'center',
                marginBottom: responsive.spacing.lg,
                paddingHorizontal: responsive.spacing.md 
              }}
            >
              {document?.file_type === 'DOCX'
                ? 'Word documents cannot be viewed in-app. Use the download button to save and open with a compatible app.'
                : 'This document type cannot be previewed in-app.'}
            </Text>
            <Button 
              mode="contained" 
              onPress={handleDownload}
              disabled={downloading}
              loading={downloading}
              icon={downloading ? undefined : "download"}
            >
              {downloading ? 'Downloading...' : 'Download Document'}
            </Button>
          </Surface>
        </View>
      )}
      </Surface>

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
          backgroundColor: error ? paperTheme.colors.errorContainer : paperTheme.colors.primaryContainer
        }}
      >
        <Text style={{
          color: error ? paperTheme.colors.onErrorContainer : paperTheme.colors.onPrimaryContainer
        }}>
          {error || successMessage}
        </Text>
      </Snackbar>

      {/* Delete confirmation dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Document</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete "{document?.title || 'this document'}"? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} mode="contained" buttonColor={paperTheme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

export default DocumentViewerScreen;