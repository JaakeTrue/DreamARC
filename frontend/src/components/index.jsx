import React, { forwardRef, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { 
  Tooltip, 
  IconButton, 
  Box,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Clear,
  Search,
  ErrorOutline,
  CheckCircle
} from '@mui/icons-material';

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ko from "./locales/ko.json";

const saved = localStorage.getItem("lang") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: { en:{translation:en}, es:{translation:es}, ko:{translation:ko} },
    lng: saved,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;




const SuperInput = forwardRef(({
  // Core props
  name,
  type = 'text',
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  
  // Validation & Form
  validationSchema,
  required = false,
  pattern,
  minLength,
  maxLength,
  min,
  max,
  
  // UI & Styling
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  disabled = false,
  readOnly = false,
  className,
  sx,
  
  // Advanced Features
  autoComplete = 'off',
  autoFocus = false,
  debounce = 0,
  mask,
  format,
  parse,
  
  // Icons & Addons
  startIcon,
  endIcon,
  clearable = true,
  showPasswordToggle = type === 'password',
  loading = false,
  status, // 'error', 'warning', 'success'
  
  // Accessibility
  ariaLabel,
  ariaDescribedby,
  
  // Customization
  renderStartAdornment,
  renderEndAdornment,
  tooltip,
  
  // Events
  onClear,
  onSearch,
  
  ...rest
}, ref) => {
  const { register, formState: { errors } } = useFormContext?.() || {};
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  
  const debounceTimer = React.useRef();

  // Handle debounced changes
  const handleChange = (event) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    
    if (debounce > 0) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onChange?.(event);
      }, debounce);
    } else {
      onChange?.(event);
    }
  };

  // Apply input mask
  const applyMask = (value) => {
    if (!mask) return value;
    
    switch (mask) {
      case 'phone':
        return value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      case 'credit-card':
        return value.replace(/(\d{4})/g, '$1 ').trim();
      case 'date':
        return value.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
      default:
        return value;
    }
  };

  // Get validation status
  const getStatus = () => {
    if (status) return status;
    if (errors?.[name]) return 'error';
    if (internalValue && !errors?.[name]) return 'success';
    return null;
  };

  const currentStatus = getStatus();
  const hasError = currentStatus === 'error';
  const isSuccess = currentStatus === 'success';

  // Status icon
  const StatusIcon = () => {
    if (loading) return <CircularProgress size={20} />;
    if (hasError) return <ErrorOutline color="error" />;
    if (isSuccess) return <CheckCircle color="success" />;
    return null;
  };

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto', ...sx }}>
      <Tooltip title={tooltip} placement="top" arrow>
        <Box>
          {/* Input Container */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: `2px solid ${
                hasError ? '#f44336' : 
                isSuccess ? '#4caf50' : 
                isFocused ? '#2196f3' : '#e0e0e0'
              }`,
              borderRadius: '8px',
              padding: '8px 12px',
              transition: 'all 0.3s ease',
              backgroundColor: disabled ? '#f5f5f5' : '#ffffff',
              '&:hover': {
                borderColor: disabled ? '#e0e0e0' : 
                          hasError ? '#f44336' : 
                          isSuccess ? '#4caf50' : '#2196f3'
              }
            }}
          >
            {/* Start Adornment */}
            {(startIcon || renderStartAdornment) && (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                {renderStartAdornment ? renderStartAdornment() : startIcon}
              </Box>
            )}

            {/* Actual Input */}
            <input
              ref={ref}
              name={name}
              type={showPasswordToggle && showPassword ? 'text' : type}
              value={applyMask(internalValue)}
              onChange={handleChange}
              onFocus={(e) => {
                setIsFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                onBlur?.(e);
              }}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              aria-label={ariaLabel || label}
              aria-describedby={ariaDescribedby}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: size === 'small' ? '14px' : 
                         size === 'large' ? '18px' : '16px',
                padding: size === 'small' ? '4px 0' : 
                        size === 'large' ? '8px 0' : '6px 0',
                color: disabled ? '#999' : '#333'
              }}
              {...(register && name ? register(name, {
                required,
                pattern,
                minLength,
                maxLength,
                min,
                max,
                ...validationSchema
              }) : {})}
              {...rest}
            />

            {/* End Adornment */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Status Indicator */}
              <StatusIcon />

              {/* Clear Button */}
              {clearable && internalValue && !disabled && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setInternalValue('');
                    onClear?.();
                  }}
                  sx={{ p: 0.5 }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}

              {/* Password Toggle */}
              {showPasswordToggle && (
                <IconButton
                  size="small"
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ p: 0.5 }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )}

              {/* Search Button */}
              {onSearch && (
                <IconButton
                  size="small"
                  onClick={() => onSearch(internalValue)}
                  sx={{ p: 0.5 }}
                >
                  <Search />
                </IconButton>
              )}

              {/* Custom End Adornment */}
              {renderEndAdornment && renderEndAdornment()}
              {endIcon && endIcon}
            </Box>
          </Box>

          {/* Error Message */}
          {hasError && errors?.[name]?.message && (
            <Fade in>
              <Box
                sx={{
                  color: '#f44336',
                  fontSize: '12px',
                  mt: 0.5,
                  ml: 1
                }}
              >
                {errors[name].message}
              </Box>
            </Fade>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
});

SuperInput.displayName = 'SuperInput';

export default SuperInput;


