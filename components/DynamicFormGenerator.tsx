import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller, FieldValues, useFieldArray } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
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

const getError = (errors: any, name: string) => {
  if (!name || !errors) return null;
  const parts = name.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  return parts.reduce((obj, part) => obj && obj[part], errors);
};

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
  const [menuVisible, setMenuVisible] = useState(false);
  const error = getError(errors, name);

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
                    error={!!error}
                  />
                  {showDatePicker && (
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
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
                      error={!!error}
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
                error={!!error}
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
                value: property.type === 'number' ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/,
                message: property.type === 'number' ? 'Please enter a valid number' : 'Please enter a valid integer'
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
                error={!!error}
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
                    error={!!error}
                  />
                  <HelperText type="info">
                    Enter as JSON array or comma-separated values
                  </HelperText>
                </View>
              )}
            />
          );
        }
        
        if (property.items?.type === 'object' && property.items.properties) {
          const { fields, append, remove } = useFieldArray({
            control,
            name,
          });
          const itemProperties = property.items.properties;
          const defaultItem = Object.keys(itemProperties).reduce((acc, key) => {
            const prop = itemProperties[key];
            if (prop.type === 'array') {
              acc[key] = [];
            } else {
              acc[key] = '';
            }
            return acc;
          }, {} as Record<string, any>);

          return (
            <Surface style={{ padding: 12, borderRadius: 8, backgroundColor: paperTheme.colors.surfaceVariant, marginVertical: 8 }}>
              <PaperText variant="titleMedium" style={{ marginBottom: 8 }}>{property.title || name}</PaperText>
              {fields.map((item, index) => (
                <Card key={item.id} style={{ marginBottom: 12, padding: 12, backgroundColor: paperTheme.colors.surface }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <PaperText variant="bodyLarge" style={{fontWeight: 'bold'}}>Item {index + 1}</PaperText>
                    <IconButton icon="delete-outline" onPress={() => remove(index)} size={20} />
                  </View>
                  <Divider style={{marginBottom: 12}} />
                  {Object.entries(itemProperties).map(([propName, propInfo]) => (
                    <FormField
                      key={propName}
                      name={`${name}[${index}].${propName}`}
                      property={propInfo}
                      control={control}
                      errors={errors}
                      required={property.items?.required?.includes(propName) || false}
                    />
                  ))}
                </Card>
              ))}
              <Button mode="contained-tonal" onPress={() => append(defaultItem)} style={{ marginTop: 8 }} icon="plus">
                Add Item
              </Button>
            </Surface>
          );
        }
        
        return <PaperText>Unsupported array type in form.</PaperText>;
        
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
                error={!!error}
              />
            )}
          />
        );
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {renderField()}
      {error && (
        <HelperText type="error" visible={!!error}>
          {error?.message as string}
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
        {schema && schema.properties ? (
          Object.entries(schema.properties).map(([fieldName, property]) => (
            <FormField
              key={fieldName}
              name={fieldName}
              property={property}
              control={control}
              errors={errors}
              required={requiredFields.includes(fieldName)}
            />
          ))
        ) : (
          <PaperText>This template has no configurable fields.</PaperText>
        )}
        
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
                onPress={handleSubmit(handleFormSubmit)}                disabled={loading}
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