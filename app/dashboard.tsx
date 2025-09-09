import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Searchbar,
  Surface,
  Chip,
  ActivityIndicator,
  useTheme as usePaperTheme,
  Appbar,
  FAB,
  Menu,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LoadingSpinner from '../components/LoadingSpinner';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { useResponsiveStyles, useResponsiveLayout } from '../src/hooks/useResponsive';
import { 
  getUserDocuments, 
  deleteDocumentComplete, 
  getDocumentDownloadUrl 
} from '../lib/supabase';

// Import Document type from supabase lib
import type { Document } from '../lib/supabase';

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
  const [menuVisible, setMenuVisible] = useState(false);
  const paperTheme = usePaperTheme();
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.template_name}"?`,
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
      case 'pdf': return 'file-pdf-box';
      case 'docx': return 'file-word-box';
      default: return 'file-document';
    }
  };

  // Removed status-related functions since status field doesn't exist in schema

  return (
    <Card style={[responsive.cardStyle, { marginBottom: responsive.spacing.md }]} mode="elevated">
      <Card.Content>
        <View style={{ 
          flexDirection: layout.getFlexDirection(true), 
          alignItems: responsive.isPhone ? 'flex-start' : 'center', 
          justifyContent: 'space-between', 
          marginBottom: responsive.spacing.md 
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            flex: 1,
            marginBottom: responsive.isPhone ? responsive.spacing.sm : 0
          }}>
            <Surface 
              style={{ 
                width: responsive.getIconSize('large') + 16, 
                height: responsive.getIconSize('large') + 16, 
                borderRadius: 12, 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: responsive.spacing.md,
                backgroundColor: paperTheme.colors.primaryContainer
              }}
            >
              <IconButton
                icon={getFileTypeIcon(document.file_type)}
                size={responsive.getIconSize('medium')}
                iconColor={paperTheme.colors.onPrimaryContainer}
              />
            </Surface>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" numberOfLines={1} style={{ marginBottom: 4 }}>
                {document.template_name}
              </Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                {document.file_type}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" style={{ 
            color: paperTheme.colors.onSurfaceVariant,
            textAlign: responsive.isPhone ? 'left' : 'right'
          }}>
            {new Date(document.created_at).toLocaleDateString()}
          </Text>
        </View>
      </Card.Content>
      
      <Card.Actions style={{ 
        flexDirection: layout.getFlexDirection(false),
        flexWrap: responsive.isPhone ? 'wrap' : 'nowrap',
        gap: responsive.spacing.xs
      }}>
        <Button
          mode="contained-tonal"
          icon="eye"
          onPress={() => onView(document)}
          style={[responsive.buttonStyle, { 
            marginRight: responsive.isPhone ? 0 : responsive.spacing.xs,
            marginBottom: responsive.isPhone ? responsive.spacing.xs : 0,
            flex: responsive.isPhone ? 1 : 0
          }]}
          compact={responsive.isPhone}
        >
          {responsive.isPhone ? 'View' : 'View'}
        </Button>
        
        <Button
          mode="contained-tonal"
          icon={downloading ? undefined : "download"}
          onPress={handleDownload}
          disabled={downloading}
          style={[responsive.buttonStyle, { 
            marginRight: responsive.isPhone ? 0 : responsive.spacing.xs,
            marginBottom: responsive.isPhone ? responsive.spacing.xs : 0,
            flex: responsive.isPhone ? 1 : 0
          }]}
          compact={responsive.isPhone}
        >
          {downloading && <ActivityIndicator size="small" />}
          {downloading ? (responsive.isPhone ? 'Downloading...' : 'Downloading...') : (responsive.isPhone ? 'Download' : 'Download')}
        </Button>
        
        <Button
          mode="contained-tonal"
          icon={deleting ? undefined : "delete"}
          onPress={handleDelete}
          disabled={deleting}
          buttonColor={paperTheme.colors.errorContainer}
          textColor={paperTheme.colors.onErrorContainer}
          style={[responsive.buttonStyle, { 
            flex: responsive.isPhone ? 1 : 0
          }]}
          compact={responsive.isPhone}
        >
          {deleting && <ActivityIndicator size="small" />}
          {deleting ? (responsive.isPhone ? 'Deleting...' : 'Deleting...') : (responsive.isPhone ? 'Delete' : 'Delete')}
        </Button>
      </Card.Actions>
    </Card>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, profile, role, hasRole, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await getUserDocuments(user.id);
        
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
      const { data: downloadUrl, error } = await getDocumentDownloadUrl(document.storage_path);
      if (error) throw error;
      
      if (!downloadUrl) {
        Alert.alert('Error', 'Could not get download URL');
        return;
      }

      // Download the file
      const fileUri = FileSystem.documentDirectory + document.template_name;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl.signedUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Share the downloaded file
        await shareAsync(downloadResult.uri);
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
    doc.template_name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  const paperTheme = usePaperTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperTheme.colors.background }}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text variant="bodyLarge" style={{ marginTop: 16, color: paperTheme.colors.onBackground }}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      {/* Header */}
      <Surface style={[responsive.headerStyle, { paddingVertical: responsive.spacing.md }]} elevation={1}>
        <View style={{ 
          flexDirection: layout.getFlexDirection(true), 
          justifyContent: 'space-between', 
          alignItems: responsive.isPhone ? 'flex-start' : 'center',
          gap: responsive.spacing.md
        }}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ color: paperTheme.colors.onSurface }}>
              Welcome back!
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
              {profile?.full_name || user?.email}
            </Text>
            {role && (
              <Chip 
                style={{ alignSelf: 'flex-start', marginTop: responsive.spacing.xs }}
                textStyle={{ fontSize: responsive.isPhone ? 11 : 12 }}
                compact
              >
                Role: {role}
              </Chip>
            )}
          </View>
          
          <View style={{ 
            flexDirection: responsive.isPhone ? 'column' : 'row', 
            alignItems: responsive.isPhone ? 'stretch' : 'center',
            gap: responsive.spacing.xs,
            width: responsive.isPhone ? '100%' : 'auto'
          }}>
            <ThemeToggle />
            <Button
              mode="contained-tonal"
              onPress={handleSignOut}
              buttonColor={paperTheme.colors.errorContainer}
              textColor={paperTheme.colors.onErrorContainer}
              style={responsive.isPhone ? { width: '100%' } : {}}
              compact={responsive.isPhone}
            >
              Sign Out
            </Button>
          </View>
        </View>
      </Surface>

      {/* Search */}
      <Surface style={[responsive.containerStyle, { paddingVertical: responsive.spacing.md }]} elevation={0}>
        <Searchbar
          placeholder="Search documents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ backgroundColor: paperTheme.colors.surfaceVariant }}
        />
      </Surface>

      {/* Documents List */}
      <View style={[responsive.containerStyle, { flex: 1, paddingTop: responsive.spacing.md }]}>
        {filteredDocuments.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="titleLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>
              {searchQuery ? 'No documents found' : 'No documents yet'}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: 'center' }}>
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
            numColumns={responsive.layout.gridColumns}
            key={responsive.layout.gridColumns}
            columnWrapperStyle={responsive.gridStyle.columnWrapperStyle}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[paperTheme.colors.primary]}
                tintColor={paperTheme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: 100,
              gap: responsive.isTablet ? responsive.spacing.md : 0
            }}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={{
          position: 'absolute',
          margin: responsive.spacing.md,
          right: 0,
          bottom: 0,
          backgroundColor: paperTheme.colors.primary,
        }}
        size={responsive.isPhone ? 'medium' : 'large'}
        onPress={handleCreateDocument}
      />
    </View>
  );
}

const DashboardScreen: React.FC = () => {
  return (
    <ProtectedRoute loadingMessage="Loading dashboard...">
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default DashboardScreen;