import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/utils';
import { InputProps } from '@/types';

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  error,
  disabled = false,
  required = false,
  className,
  label,
  hint,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleFocus = (/*_e: React.FocusEvent<HTMLInputElement>*/) => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = (/*_e: React.FocusEvent<HTMLInputElement>*/) => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const isPassword = type === 'password';
  const hasError = Boolean(error);

  const baseClasses = 'w-full px-3 py-2 border rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';
  
  const stateClasses = cn(
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : isFocused
      ? 'border-blue-500 focus:ring-blue-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    disabled && 'bg-gray-50 cursor-not-allowed opacity-75'
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={cn(
            baseClasses,
            stateClasses,
            isPassword && 'pr-10',
            className
          )}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <div className="flex items-center mt-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
      
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 