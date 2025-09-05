import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

// Document type based on the new schema
interface Document {
  id: string;
  user_id: string;
  template_name: string;
  storage_path: string;
  file_type: string;
  created_at: string;
}

interface DocumentItemProps {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (documentId: string) => void;
}

function DocumentItem({ document, onView, onDownload, onDelete }: DocumentItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.template_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(document.id),
        },
      ]
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'txt': return '📃';
      default: return '📄';
    }
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">
              {getFileTypeIcon(document.file_type)}
            </Text>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              {document.template_name}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500 mr-4">
              Type: {document.file_type.toUpperCase()}
            </Text>
            <Text className="text-xs text-gray-500">
              Created: {new Date(document.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="flex-row justify-end pt-3 border-t border-gray-100 space-x-2">
        <TouchableOpacity
          className="bg-green-100 px-3 py-1 rounded"
          onPress={() => onView(document)}
        >
          <Text className="text-green-600 text-sm font-medium">View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-blue-100 px-3 py-1 rounded"
          onPress={() => onDownload(document)}
        >
          <Text className="text-blue-600 text-sm font-medium">Download</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-red-100 px-3 py-1 rounded"
          onPress={handleDelete}
        >
          <Text className="text-red-600 text-sm font-medium">Delete</Text>
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
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
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (error) {
        Alert.alert('Error', 'Failed to delete document');
      } else {
        setDocuments(documents.filter(doc => doc.id !== documentId));
        Alert.alert('Success', 'Document deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleViewDocument = (document: Document) => {
    // Navigate to document viewer or open in browser
    router.push(`/document/${document.id}`);
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      if (document.storage_path) {
        // For now, we'll show an alert. In a real app, you'd download from Supabase Storage
        Alert.alert(
          'Download',
          `Downloading ${document.template_name}.${document.file_type}`,
          [
            { text: 'OK' }
          ]
        );
        // In a real implementation:
        // const { data } = await supabase.storage.from('documents').download(document.storage_path);
        // Then handle the file download
      } else {
        Alert.alert('Error', 'Document file not found');
      }
    } catch (error) {
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
    doc.template_name.toLowerCase().includes(searchQuery.toLowerCase())
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