import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getTemplates, Template } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
      onPress={() => onSelect(template)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-sm text-gray-600 mb-2">
              {template.description}
            </Text>
          )}
          <Text className="text-xs text-gray-500">
            Created: {new Date(template.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View className="ml-4">
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NewDocumentScreen: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await getTemplates();
      if (error) {
        console.error('Error fetching templates:', error);
        Alert.alert('Error', 'Failed to load templates. Please try again.');
        return;
      }
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert('Error', 'Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

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

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="document-outline" size={64} color="#9CA3AF" />
      <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
        No Templates Available
      </Text>
      <Text className="text-sm text-gray-600 text-center">
        There are no document templates available at the moment.
      </Text>
      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
        onPress={handleRefresh}
      >
        <Text className="text-white font-medium">Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner />
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
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Choose Template
          </Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-4 pt-4">
        {templates.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text className="text-sm text-gray-600 mb-4">
              Select a template to create your document
            </Text>
            <FlatList
              data={templates}
              renderItem={renderTemplate}
              keyExtractor={(item) => item.id}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default NewDocumentScreen;