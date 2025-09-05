import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getUserDocuments, 
  deleteDocumentComplete, 
  getDocumentDownloadUrl 
} from '../lib/supabase';

// Document type based on the new schema
interface Document {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  file_path: string;
  file_type: 'PDF' | 'DOCX';
  status: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface DocumentItemProps {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onRefresh: () => void;
}

function DocumentItem({ document, onView, onDownload, onDelete, onRefresh }: DocumentItemProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await onDelete(document.id);
            setDeleting(false);
            onRefresh();
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(document);
    setDownloading(false);
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return 'document-text';
      case 'docx': return 'document';
      default: return 'document-text';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Ionicons 
              name={getFileTypeIcon(document.file_type)} 
              size={20} 
              color="#6B7280" 
              style={{ marginRight: 8 }}
            />
            <Text className="text-lg font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {document.title}
            </Text>
            <View className={`px-2 py-1 rounded-full ${
              document.status === 'completed' ? 'bg-green-100' :
              document.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <Text className={`text-xs font-medium ${
                document.status === 'completed' ? 'text-green-600' :
                document.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500 mr-4">
              {document.file_type}
            </Text>
            <Text className="text-xs text-gray-500">
              {new Date(document.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="flex-row justify-end pt-3 border-t border-gray-100 space-x-2">
        <TouchableOpacity
          className="bg-green-100 px-3 py-2 rounded-lg flex-row items-center"
          onPress={() => onView(document)}
          disabled={document.status !== 'completed'}
        >
          <Ionicons name="eye-outline" size={16} color="#059669" />
          <Text className="text-green-600 text-sm font-medium ml-1">View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-blue-100 px-3 py-2 rounded-lg flex-row items-center"
          onPress={handleDownload}
          disabled={downloading || document.status !== 'completed'}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Ionicons name="download-outline" size={16} color="#2563EB" />
          )}
          <Text className="text-blue-600 text-sm font-medium ml-1">
            {downloading ? 'Downloading...' : 'Download'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-red-100 px-3 py-2 rounded-lg flex-row items-center"
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          )}
          <Text className="text-red-600 text-sm font-medium ml-1">
            {deleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, profile, role, hasRole, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await getUserDocuments();
        
      if (error) {
        console.error('Error loading documents:', error);
        Alert.alert('Error', 'Failed to load documents');
        return;
      }
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };



  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await deleteDocumentComplete(documentId);
        
      if (error) {
        Alert.alert('Error', 'Failed to delete document');
      } else {
        Alert.alert('Success', 'Document deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleViewDocument = (document: Document) => {
    router.push({
      pathname: '/document-viewer',
      params: { documentId: document.id }
    });
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const { data: downloadUrl, error } = await getDocumentDownloadUrl(document.file_path);
      if (error) throw error;
      
      if (!downloadUrl) {
        Alert.alert('Error', 'Could not get download URL');
        return;
      }

      // Download the file
      const fileUri = FileSystem.documentDirectory + document.title;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Share the downloaded file
        await Sharing.shareAsync(downloadResult.uri);
        Alert.alert('Success', 'Document downloaded and ready to share');
      } else {
        Alert.alert('Error', 'Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const handleCreateDocument = () => {
    // Navigate to new document flow
    router.push('/new-document');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );



  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 py-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">
              Welcome back!
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {profile?.full_name || user?.email}
            </Text>
            {role && (
              <Text className="text-xs text-primary-600 capitalize mt-1">
                Role: {role}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            className="bg-red-100 px-4 py-2 rounded-lg"
            onPress={handleSignOut}
          >
            <Text className="text-red-600 font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <TextInput
          className="input-field"
          placeholder="Search documents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Documents List */}
      <View className="flex-1 px-6 py-4">
        {filteredDocuments.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg mb-2">
              {searchQuery ? 'No documents found' : 'No documents yet'}
            </Text>
            <Text className="text-gray-400 text-center">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Create your first document to get started'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDocuments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DocumentItem
                document={item}
                onView={handleViewDocument}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteDocument}
                onRefresh={handleRefresh}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>



      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={handleCreateDocument}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <ProtectedRoute loadingMessage="Loading dashboard...">
      <DashboardContent />
    </ProtectedRoute>
  );
}