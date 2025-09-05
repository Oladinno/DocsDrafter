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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg px-3 py-3 bg-white"
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text className={value ? 'text-gray-900' : 'text-gray-500'}>
                      {value ? new Date(value).toLocaleDateString() : 'Select date'}
                    </Text>
                  </TouchableOpacity>
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
                <View className="border border-gray-300 rounded-lg bg-white">
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Select an option" value="" />
                    {property.enum!.map((option, index) => (
                      <Picker.Item key={index} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
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
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-gray-900"
                placeholder={`Enter ${property.title || name}`}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline={name.includes('body') || name.includes('content')}
                numberOfLines={name.includes('body') || name.includes('content') ? 4 : 1}
                textAlignVertical={name.includes('body') || name.includes('content') ? 'top' : 'center'}
              />
            )}
          />
        );
        
      case 'number':
        return (
          <Controller
            name={name}
            control={control}
            rules={{ 
              required: required ? `${property.title || name} is required` : false,
              pattern: {
                value: /^[0-9]+(\.[0-9]+)?$/,
                message: 'Please enter a valid number'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-gray-900"
                placeholder={`Enter ${property.title || name}`}
                value={value?.toString()}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                onBlur={onBlur}
                keyboardType="numeric"
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
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-gray-900"
                  placeholder={`Enter ${property.title || name} (comma-separated)`}
                  value={Array.isArray(value) ? value.join(', ') : value}
                  onChangeText={(text) => onChange(text.split(',').map(item => item.trim()))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
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
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-gray-900"
                placeholder={`Enter ${property.title || name}`}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        );
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-2">
        {property.title || name}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      {renderField()}
      {errors[name] && (
        <Text className="text-red-500 text-sm mt-1">
          {errors[name].message}
        </Text>
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
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4">
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
        
        <View className="flex-row space-x-3 mt-6">
          <TouchableOpacity
            className="flex-1 bg-gray-200 py-3 rounded-lg"
            onPress={handleReset}
            disabled={loading}
          >
            <Text className="text-gray-700 font-medium text-center">
              Reset
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${
              loading ? 'bg-blue-300' : 'bg-blue-500'
            }`}
            onPress={handleSubmit(handleFormSubmit)}
            disabled={loading}
          >
            <Text className="text-white font-medium text-center">
              {loading ? 'Generating...' : 'Generate Document'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default DynamicFormGenerator;