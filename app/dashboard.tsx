import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  getUserDocuments,
  createDocument,
  deleteDocument,
  Document,
} from '../lib/supabase';

interface DocumentItemProps {
  document: Document;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

function DocumentItem({ document, onDelete, canDelete }: DocumentItemProps) {
  const router = useRouter();

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
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

  const handleEdit = () => {
    router.push(`/document/${document.id}`);
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {document.title}
          </Text>
          {document.description && (
            <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
              {document.description}
            </Text>
          )}
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500">
              Created: {new Date(document.created_at).toLocaleDateString()}
            </Text>
            {document.updated_at !== document.created_at && (
              <Text className="text-xs text-gray-500 ml-3">
                Updated: {new Date(document.updated_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="bg-blue-100 px-3 py-1 rounded"
            onPress={handleEdit}
          >
            <Text className="text-blue-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
          
          {canDelete && (
            <TouchableOpacity
              className="bg-red-100 px-3 py-1 rounded"
              onPress={handleDelete}
            >
              <Text className="text-red-600 text-sm font-medium">Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
        <Text className="text-xs text-gray-500 capitalize">
          Status: {document.status}
        </Text>
        <Text className="text-xs text-gray-500">
          {document.content?.length || 0} characters
        </Text>
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadDocuments = async () => {
    try {
      const { data, error } = await getUserDocuments();
      if (error) {
        Alert.alert('Error', 'Failed to load documents');
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
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

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await createDocument({
        title: newDocTitle.trim(),
        description: newDocDescription.trim() || null,
        content: '',
        status: 'draft',
      });

      if (error) {
        Alert.alert('Error', 'Failed to create document');
      } else {
        setNewDocTitle('');
        setNewDocDescription('');
        setShowCreateForm(false);
        loadDocuments();
        Alert.alert('Success', 'Document created successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await deleteDocument(documentId);
      if (error) {
        Alert.alert('Error', 'Failed to delete document');
      } else {
        setDocuments(docs => docs.filter(doc => doc.id !== documentId));
        Alert.alert('Success', 'Document deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
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
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canDeleteDocument = (document: Document) => {
    return hasRole('admin') || document.user_id === user?.id;
  };

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

      {/* Search and Create */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row space-x-3 mb-3">
          <TextInput
            className="flex-1 input-field"
            placeholder="Search documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          <TouchableOpacity
            className="btn-primary px-4"
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <Text className="text-white font-medium">
              {showCreateForm ? 'Cancel' : 'New'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Document Form */}
        {showCreateForm && (
          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Create New Document
            </Text>
            
            <TextInput
              className="input-field mb-3"
              placeholder="Document title"
              value={newDocTitle}
              onChangeText={setNewDocTitle}
            />
            
            <TextInput
              className="input-field mb-4"
              placeholder="Description (optional)"
              value={newDocDescription}
              onChangeText={setNewDocDescription}
              multiline
              numberOfLines={3}
            />
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 btn-primary"
                onPress={handleCreateDocument}
                disabled={creating}
              >
                <Text className="text-white font-medium text-center">
                  {creating ? 'Creating...' : 'Create Document'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 btn-secondary"
                onPress={() => {
                  setShowCreateForm(false);
                  setNewDocTitle('');
                  setNewDocDescription('');
                }}
              >
                <Text className="text-gray-600 font-medium text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
                onDelete={handleDeleteDocument}
                canDelete={canDeleteDocument(item)}
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

      {/* Stats Footer */}
      <View className="bg-white border-t border-gray-200 px-6 py-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-gray-600">
            Total Documents: {documents.length}
          </Text>
          <Text className="text-sm text-gray-600">
            {filteredDocuments.length !== documents.length &&
              `Showing: ${filteredDocuments.length}`}
          </Text>
        </View>
      </View>
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