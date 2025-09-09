import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
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
  Snackbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useResponsiveStyles, useResponsiveLayout } from '../src/hooks/useResponsive';
import { getTemplates, Template } from '../lib/supabase';
import { ScrollView } from 'react-native-gesture-handler';


interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const paperTheme = usePaperTheme();
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();
  
  const getCategoryColor = (category: string) => {
    const colors = {
      'Legal': paperTheme.colors.primaryContainer,
      'Business': paperTheme.colors.secondaryContainer,
      'Financial': paperTheme.colors.tertiaryContainer,
      'Education': paperTheme.colors.surfaceVariant,
      'default': paperTheme.colors.surfaceVariant
    };
    return colors[category as keyof typeof colors] || colors.default;
  };

  const getCategoryTextColor = (category: string) => {
    const colors = {
      'Legal': paperTheme.colors.onPrimaryContainer,
      'Business': paperTheme.colors.onSecondaryContainer,
      'Financial': paperTheme.colors.onTertiaryContainer,
      'Education': paperTheme.colors.onSurfaceVariant,
      'default': paperTheme.colors.onSurfaceVariant
    };
    return colors[category as keyof typeof colors] || colors.default;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'Legal': 'shield-check',
      'Business': 'briefcase',
      'Financial': 'credit-card',
      'Education': 'school',
      'default': 'file-document'
    };
    return icons[category as keyof typeof icons] || icons.default;
  };

  // Safely access metadata and json_schema
  const metadata = typeof template.metadata === 'object' && template.metadata !== null ? template.metadata : {};
  const category = metadata.category || 'Business';
  
  const json_schema = typeof template.json_schema === 'object' && template.json_schema !== null ? template.json_schema : {};
  const fieldCount = json_schema.properties ? Object.keys(json_schema.properties).length : 0;

  return (
    <Card 
      style={[responsive.cardStyle, { 
        marginBottom: responsive.spacing.md,
        flex: responsive.layout.gridColumns > 1 ? 1 : undefined,
        marginHorizontal: 0
      }]} 
      mode="elevated" 
      onPress={() => onSelect(template)}
    >
      <Card.Content>
        <View style={{ 
          flexDirection: responsive.isPhone ? 'row' : 'column', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          marginBottom: responsive.spacing.md 
        }}>
          <View style={{ 
            flexDirection: responsive.isPhone ? 'row' : 'column', 
            alignItems: responsive.isPhone ? 'center' : 'center', 
            flex: 1 
          }}>
            <Surface 
              style={{ 
                width: responsive.getIconSize('large'), 
                height: responsive.getIconSize('large'), 
                borderRadius: 12, 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: responsive.isPhone ? responsive.spacing.md : 0,
                marginBottom: responsive.isPhone ? 0 : responsive.spacing.sm,
                backgroundColor: getCategoryColor(category)
              }}
            >
              <IconButton
                icon={getCategoryIcon(category)}
                size={responsive.getIconSize('medium')}
                iconColor={getCategoryTextColor(category)}
              />
            </Surface>
            <View style={{ flex: 1 }}>
              <Text 
                variant="titleLarge" 
                numberOfLines={2} 
                style={{ 
                  marginBottom: responsive.spacing.xs,
                  textAlign: responsive.isPhone ? 'left' : 'center'
                }}
              >
                {template.name}
              </Text>
              <Chip 
                style={{ 
                  backgroundColor: getCategoryColor(category),
                  alignSelf: responsive.isPhone ? 'flex-start' : 'center'
                }}
                textStyle={{ color: getCategoryTextColor(category) }}
                compact
              >
                {category}
              </Chip>
            </View>
          </View>
          <IconButton
            icon="chevron-right"
            size={responsive.getIconSize('small')}
            iconColor={paperTheme.colors.primary}
          />
        </View>
        
        {template.description && (
          <Text 
            variant="bodyMedium" 
            style={{ 
              color: paperTheme.colors.onSurfaceVariant, 
              marginBottom: responsive.spacing.md, 
              lineHeight: 20,
              textAlign: responsive.isPhone ? 'left' : 'center'
            }}
          >
            {template.description}
          </Text>
        )}
        
        <View style={{ 
          flexDirection: responsive.isPhone ? 'row' : 'column', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: responsive.spacing.md, 
          borderTopWidth: 1, 
          borderTopColor: paperTheme.colors.outline,
          gap: responsive.spacing.xs
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton 
              icon="format-list-bulleted" 
              size={responsive.getIconSize('small')} 
              iconColor={paperTheme.colors.onSurfaceVariant} 
            />
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              {fieldCount} fields
            </Text>
          </View>
          <Text 
            variant="bodySmall" 
            style={{ 
              color: paperTheme.colors.onSurfaceVariant,
              textAlign: responsive.isPhone ? 'right' : 'center'
            }}
          >
            {new Date(template.created_at).toLocaleDateString()}
          </Text>
        </View>
      </Card.Content>
     </Card>
   );
 };

const NewDocumentScreen: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Legal', 'Business', 'Financial', 'Education'];
  const paperTheme = usePaperTheme();
  const responsive = useResponsiveStyles();
  const layout = useResponsiveLayout();

  const fetchTemplates = async () => {
    try {
      setError(null);
      const { data, error } = await getTemplates();
      if (error) {
        console.error('Error fetching templates:', error);
        setError('Failed to load templates. Please try again.');
        setSnackbarVisible(true);
        return;
      }
      setTemplates(data || []);
      setFilteredTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Network error. Please check your connection.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.metadata?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTemplates(filtered);
    }
  }, [searchQuery, templates]);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(
        (template) => template.metadata?.category === selectedCategory
      );
      setFilteredTemplates(filtered);
    }
  }, [selectedCategory, templates]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const handleTemplateSelect = (template: Template) => {
    // Navigate to document form with selected template
    router.push({
      pathname: '/document-form',
      params: {
        templateId: template.id,
        templateName: template.name,
        templateSchema: JSON.stringify(template.json_schema),
      },
    });
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <TemplateCard template={item} onSelect={handleTemplateSelect} />
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Surface style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" animating={true} />
          <Text variant="bodyLarge" style={{ marginTop: 16, color: paperTheme.colors.onSurfaceVariant }}>
            Loading templates...
          </Text>
        </Surface>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      <Surface style={{ flex: 1 }}>
        {/* Header */}
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Choose Template" />
        </Appbar.Header>
        
        <Surface style={{ 
          paddingHorizontal: responsive.layout.containerPadding, 
          paddingVertical: responsive.spacing.md 
        }}>
          <Text 
            variant="bodyMedium" 
            style={{ 
              textAlign: responsive.isPhone ? 'left' : 'center', 
              marginBottom: responsive.spacing.md, 
              color: paperTheme.colors.onSurfaceVariant 
            }}
          >
            Select from our collection of professionally designed templates
          </Text>
          
          {/* Search Bar */}
          <Searchbar
            placeholder="Search templates..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={{ marginBottom: responsive.spacing.md }}
          />
          
          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ marginBottom: responsive.spacing.md }}
            contentContainerStyle={{ 
              paddingHorizontal: responsive.spacing.xs,
              gap: responsive.spacing.xs
            }}
          >
            {categories.map((category) => (
              <Chip
                key={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={{ 
                  marginHorizontal: responsive.spacing.xs,
                  minWidth: responsive.isPhone ? 80 : 100
                }}
                textStyle={{ fontSize: responsive.isPhone ? 12 : 14 }}
                compact={responsive.isPhone}
              >
                {category}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: responsive.layout.containerPadding }}>
          {filteredTemplates.length === 0 ? (
            <Surface style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center', 
              paddingVertical: responsive.spacing.xxl, 
              marginTop: responsive.spacing.xl 
            }}>
              <Surface 
                style={{ 
                  width: responsive.getIconSize('large'), 
                  height: responsive.getIconSize('large'),
                  borderRadius: responsive.getIconSize('large') / 2, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: responsive.spacing.lg,
                  backgroundColor: paperTheme.colors.surfaceVariant
                }}
              >
                <IconButton 
                  icon="file-document-outline" 
                  size={responsive.getIconSize('large')} 
                  iconColor={paperTheme.colors.onSurfaceVariant} 
                />
              </Surface>
              <Text 
                variant="headlineSmall" 
                style={{ 
                  marginBottom: responsive.spacing.xs, 
                  textAlign: 'center' 
                }}
              >
                {searchQuery ? 'No templates found' : 'No templates available'}
              </Text>
              <Text 
                variant="bodyMedium" 
                style={{ 
                  color: paperTheme.colors.onSurfaceVariant, 
                  textAlign: 'center', 
                  paddingHorizontal: responsive.spacing.lg 
                }}
              >
                {searchQuery 
                  ? 'Try adjusting your search terms or browse all templates'
                  : 'Templates will appear here once they are created'
                }
              </Text>
              {error && (
                <Button 
                  mode="outlined" 
                  onPress={fetchTemplates}
                  style={{ marginTop: responsive.spacing.md }}
                  icon="refresh"
                >
                  Retry
                </Button>
              )}
            </Surface>
          ) : (
            <>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Select a template to create your document
              </Text>
              <FlatList
                data={filteredTemplates}
                renderItem={renderTemplate}
                keyExtractor={(item) => item.id}
                numColumns={responsive.layout.gridColumns}
                key={responsive.layout.gridColumns}
                columnWrapperStyle={responsive.layout.gridColumns > 1 ? {
                  gap: responsive.spacing.sm
                } : undefined}
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
                  paddingBottom: 20,
                  gap: responsive.isTablet ? responsive.spacing.md : 0
                }}
              />
            </>
          )}
        </View>
        
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4000}
          action={{
            label: 'Retry',
            onPress: fetchTemplates,
          }}
        >
          {error}
        </Snackbar>
      </Surface>
    </SafeAreaView>
  );
};

export default NewDocumentScreen;