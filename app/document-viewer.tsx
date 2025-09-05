import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDocumentById, getDocumentDownloadUrl, deleteDocumentComplete } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

interface DocumentViewerParams {
  documentId: string;
  title?: string;
}

export default function DocumentViewerScreen() {
  const { documentId, title } = useLocalSearchParams<DocumentViewerParams>();
  const router = useRouter();
  const { user } = useAuth();
  const [document, setDocument] = useState<any>(null);
  const [pdfUri, setPdfUri] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>('');

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
      const downloadUrl = await getDocumentDownloadUrl(docData.file_path);
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

      if (!document || !pdfUri) {
        Alert.alert('Error', 'Document not available for download');
        return;
      }

      // Create filename with proper extension
      const fileName = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.${document.file_type.toLowerCase()}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(pdfUri, fileUri);

      if (downloadResult.status === 200) {
        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: document.file_type === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: `Save ${document.title}`,
          });
        } else {
          Alert.alert(
            'Download Complete',
            `File saved to: ${downloadResult.uri}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      Alert.alert('Download Error', err.message || 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document?.title || 'this document'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);

      if (!document) {
        Alert.alert('Error', 'Document not found');
        return;
      }

      await deleteDocumentComplete(document.id);

      Alert.alert(
        'Document Deleted',
        'The document has been successfully deleted.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error deleting document:', err);
      Alert.alert('Delete Error', err.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!pdfUri || !document) {
        Alert.alert('Error', 'Document not available for sharing');
        return;
      }

      if (Platform.OS === 'ios') {
        await Share.share({
          url: pdfUri,
          title: document.title,
        });
      } else {
        await Share.share({
          message: `Check out this document: ${document.title}`,
          url: pdfUri,
          title: document.title,
        });
      }
    } catch (err: any) {
      console.error('Error sharing document:', err);
      Alert.alert('Share Error', 'Failed to share document');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <LoadingSpinner size="large" />
          <Text className="text-gray-600 mt-4">Loading document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text className="text-gray-700 font-medium ml-2">Back</Text>
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="document-text-outline" size={64} color="#EF4444" />
          <Text className="text-red-600 text-lg font-semibold mt-4 text-center">
            Error Loading Document
          </Text>
          <Text className="text-gray-600 mt-2 text-center">{error}</Text>
          <TouchableOpacity
            onPress={loadDocument}
            className="bg-blue-600 px-6 py-3 rounded-lg mt-6"
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center flex-1"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 font-medium ml-2 flex-1" numberOfLines={1}>
            {document?.title || title || 'Document'}
          </Text>
        </TouchableOpacity>
        
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={handleShare}
            className="p-2"
            disabled={!pdfUri}
          >
            <Ionicons name="share-outline" size={24} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDownload}
            className="p-2"
            disabled={downloading || !pdfUri}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#374151" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDelete}
            className="p-2"
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Document Info */}
      {document && (
        <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <Text className="text-sm text-gray-600">
            {document.file_type} • Created {new Date(document.created_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* PDF Viewer */}
      {pdfUri && document?.file_type === 'PDF' ? (
        <View className="flex-1">
          <Pdf
            source={{ uri: pdfUri, cache: true }}
            onLoadComplete={(numberOfPages) => {
              console.log(`PDF loaded with ${numberOfPages} pages`);
            }}
            onPageChanged={(page, numberOfPages) => {
              console.log(`Current page: ${page}/${numberOfPages}`);
            }}
            onError={(error) => {
              console.error('PDF Error:', error);
              setError('Failed to load PDF');
            }}
            style={{
              flex: 1,
              width: screenData.width,
              height: screenData.height,
            }}
            enablePaging={true}
            horizontal={false}
            spacing={10}
            password=""
            scale={1.0}
            minScale={0.5}
            maxScale={3.0}
            renderActivityIndicator={() => (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-600 mt-2">Loading PDF...</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="document-text-outline" size={64} color="#6B7280" />
          <Text className="text-gray-700 text-lg font-semibold mt-4 text-center">
            {document?.file_type === 'DOCX' ? 'Word Document' : 'Document'}
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            {document?.file_type === 'DOCX'
              ? 'Word documents cannot be viewed in-app. Use the download button to save and open with a compatible app.'
              : 'This document type cannot be previewed in-app.'}
          </Text>
          <TouchableOpacity
            onPress={handleDownload}
            className="bg-blue-600 px-6 py-3 rounded-lg mt-6 flex-row items-center"
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download-outline" size={20} color="white" />
            )}
            <Text className="text-white font-medium ml-2">
              {downloading ? 'Downloading...' : 'Download Document'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}