import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { FormInputProps } from './FormInput';

const inputTypeMap: Record<NonNullable<FormInputProps['type']>, object> = {
  text: {},
  email: { keyboardType: 'email-address', autoCapitalize: 'none' },
  password: { secureTextEntry: true },
  number: { keyboardType: 'numeric' },
};

export function FormInput({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  autoComplete,
  disabled = false,
}: FormInputProps) {
  return (
    <View className="gap-1">
      {label && <Text className="text-hub-muted text-sm">{label}</Text>}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8fa4af"
        value={value}
        onChangeText={onChange}
        autoComplete={autoComplete as any}
        editable={!disabled}
        className={`bg-hub-card border border-hub-border rounded-xl px-4 py-3 text-hub-text text-base ${disabled ? 'opacity-50' : ''}`}
        {...inputTypeMap[type]}
      />
    </View>
  );
}
