import React from 'react';

export interface FormInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  autoComplete?: string;
  disabled?: boolean;
}

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
    <div className="flex flex-col gap-1">
      {label && <label className="text-hub-muted text-sm">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        className="bg-hub-card border border-hub-border rounded-xl px-4 py-3 text-hub-text text-base placeholder-hub-muted focus:outline-none focus:border-hub-accent transition-colors disabled:opacity-50"
      />
    </div>
  );
}
