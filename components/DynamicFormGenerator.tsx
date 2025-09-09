import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller, FieldValues } from 'react-hook-form';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  TextInput as PaperTextInput,
  Button,
  Card,
  Text as PaperText,
  HelperText,
  useTheme,
  Surface,
  Menu,
  Divider,
  IconButton,
} from 'react-native-paper';

interface JSONSchemaProperty {
  type: string;
  title?: string;
  format?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: { [key: string]: JSONSchemaProperty };
  required?: string[];
}

interface JSONSchema {
  type: string;
  properties: { [key: string]: JSONSchemaProperty };
  required?: string[];
}

interface DynamicFormGeneratorProps {
  schema: JSONSchema;
  onSubmit: (data: FieldValues) => void;
  loading?: boolean;
}

interface FormFieldProps {
  name: string;
  property: JSONSchemaProperty;
  control: any;
  errors: any;
  required: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  property,
  control,
  errors,
  required,
}) => {
  const paperTheme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const renderField = () => {
    switch (property.type) {
      case 'string':
        if (property.format === 'date') {
          return (
            <Controller
              name={name}
              control={control}
              rules={{ required: required ? `${property.title || name} is required` : false }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <PaperTextInput
                    mode="outlined"
                    label={property.title || name}
                    value={value ? new Date(value).toLocaleDateString() : ''}
                    placeholder="Select date"
                    editable={false}
                    right={
                      <PaperTextInput.Icon 
                        icon="calendar" 
                        onPress={() => setShowDatePicker(true)}
                      />
                    }
                    onPressIn={() => setShowDatePicker(true)}
                    error={!!errors[name]}
                  />
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                          setSelectedDate(date);
                          onChange(date.toISOString().split('T')[0]);
                        }
                      }}
                    />
                  )}
                </View>
              )}
            />
          );
        }
        
        if (property.enum) {
          return (
            <Controller
              name={name}
              control={control}
              rules={{ required: required ? `${property.title || name} is required` : false }}
              render={({ field: { onChange, value } }) => (
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <PaperTextInput
                      mode="outlined"
                      label={property.title || name}
                      value={value || ''}
                      placeholder="Select an option"
                      editable={false}
                      right={
                        <PaperTextInput.Icon 
                          icon="chevron-down" 
                          onPress={() => setMenuVisible(true)}
                        />
                      }
                      onPressIn={() => setMenuVisible(true)}
                      error={!!errors[name]}
                    />
                  }
                >
                  {property.enum!.map((option, index) => (
                    <Menu.Item
                      key={index}
                      title={option}
                      onPress={() => {
                        onChange(option);
                        setMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
              )}
            />
          );
        }
        
        return (
          <Controller
            name={name}
            control={control}
            rules={{ required: required ? `${property.title || name} is required` : false }}
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                mode="outlined"
                label={property.title || name}
                placeholder={`Enter ${property.title || name}`}
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline={name.includes('body') || name.includes('content')}
                numberOfLines={name.includes('body') || name.includes('content') ? 4 : 1}
                error={!!errors[name]}
              />
            )}
          />
        );
        
      case 'number':
      case 'integer':
        return (
          <Controller
            name={name}
            control={control}
            rules={{ 
              required: required ? `${property.title || name} is required` : false,
              pattern: {
                value: /^\d+$/,
                message: 'Please enter a valid number'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                mode="outlined"
                label={property.title || name}
                placeholder={`Enter ${property.title || name}`}
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                error={!!errors[name]}
              />
            )}
          />
        );
        
      case 'array':
        if (property.items?.type === 'string') {
          return (
            <Controller
              name={name}
              control={control}
              rules={{ required: required ? `${property.title || name} is required` : false }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <PaperTextInput
                    mode="outlined"
                    label={property.title || name}
                    placeholder={`Enter ${property.title || name} (JSON format or comma-separated)`}
                    value={Array.isArray(value) ? value.join(', ') : value || ''}
                    onChangeText={(text) => {
                      try {
                        const parsed = JSON.parse(text);
                        onChange(parsed);
                      } catch {
                        onChange(text.split(',').map(item => item.trim()));
                      }
                    }}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={3}
                    error={!!errors[name]}
                  />
                  <HelperText type="info">
                    Enter as JSON array or comma-separated values
                  </HelperText>
                </View>
              )}
            />
          );
        }
        
        if (property.items?.type === 'object') {
          // For complex arrays like invoice items, we'll show a simplified input
          return (
            <Controller
              name={name}
              control={control}
              rules={{ required: required ? `${property.title || name} is required` : false }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="text-sm text-gray-600 mb-2">
                    Enter items in JSON format or use simplified format
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-gray-900"
                    placeholder={`Enter ${property.title || name} (JSON format)`}
                    value={typeof value === 'string' ? value : JSON.stringify(value || [], null, 2)}
                    onChangeText={(text) => {
                      try {
                        const parsed = JSON.parse(text);
                        onChange(parsed);
                      } catch {
                        onChange(text);
                      }
                    }}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              )}
            />
          );
        }
        break;
        
      default:
        return (
          <Controller
            name={name}
            control={control}
            rules={{ required: required ? `${property.title || name} is required` : false }}
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                mode="outlined"
                label={property.title || name}
                placeholder={`Enter ${property.title || name}`}
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors[name]}
              />
            )}
          />
        );
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {renderField()}
      {errors[name] && (
        <HelperText type="error" visible={!!errors[name]}>
          {errors[name]?.message}
        </HelperText>
      )}
    </View>
  );
};

const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  schema,
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const requiredFields = schema.required || [];

  const handleFormSubmit = (data: FieldValues) => {
    // Validate required fields
    const missingFields = requiredFields.filter(field => !data[field] || data[field] === '');
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please fill in the following required fields: ${missingFields.join(', ')}`
      );
      return;
    }

    onSubmit(data);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Form',
      'Are you sure you want to reset all fields?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => reset() },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 16 }}>
        {Object.entries(schema.properties).map(([fieldName, property]) => (
          <FormField
            key={fieldName}
            name={fieldName}
            property={property}
            control={control}
            errors={errors}
            required={requiredFields.includes(fieldName)}
          />
        ))}
        
        <Surface style={{ padding: 16, marginTop: 16, borderRadius: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={handleReset}
              disabled={loading}
              style={{ flex: 1 }}
              icon="refresh"
            >
              Reset
            </Button>
            
            <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                loading={loading}
                style={{ flex: 1 }}
                icon="file-document"
              >
                {loading ? 'Generating...' : 'Generate Document'}
              </Button>
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
};

export default DynamicFormGenerator;