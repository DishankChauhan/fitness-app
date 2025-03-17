import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Button } from './Button';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';

export interface ErrorViewProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorView({ error, onRetry, showRetry = true, style }: ErrorViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.container, style as ViewStyle]}>
      <IconSymbol name="exclamationmark.triangle" size={32} color={colors.error} />
      <ThemedText style={[styles.text, { color: colors.error }]}>
        {error}
      </ThemedText>
      {showRetry && onRetry && (
        <Button
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        >
          Try Again
        </Button>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  text: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
}); 