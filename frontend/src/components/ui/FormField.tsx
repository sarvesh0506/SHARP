import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="sharp-label block">
        {label}
        {required && <span className="text-[#F43F5E] ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-[#F43F5E]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
};

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  hasError = false,
  className = '',
  ...props
}) => {
  return (
    <input
      aria-invalid={hasError || undefined}
      className={`sharp-input w-full px-3 py-2 ${hasError ? 'sharp-input-error' : ''} ${className}`.trim()}
      {...props}
    />
  );
};

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  hasError = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <select
      aria-invalid={hasError || undefined}
      className={`sharp-input w-full px-3 py-2 ${hasError ? 'sharp-input-error' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
};

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  hasError = false,
  className = '',
  ...props
}) => {
  return (
    <textarea
      aria-invalid={hasError || undefined}
      className={`sharp-input w-full px-3 py-2 resize-y ${hasError ? 'sharp-input-error' : ''} ${className}`.trim()}
      {...props}
    />
  );
};
