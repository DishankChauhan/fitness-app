import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { ThemedText } from './ThemedText';

export interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ 
  children, 
  onPress, 
  variant = 'primary', 
  style,
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        (loading || disabled) && styles.disabledButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : Colors.light.tint} />
      ) : (
        <ThemedText style={[
          styles.text,
          isPrimary ? styles.primaryText : styles.secondaryText,
          disabled && styles.disabledText,
        ]}>
          {children}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: Colors.light.tint,
  },
  disabledText: {
    color: Colors.light.textDim,
  },
}); 