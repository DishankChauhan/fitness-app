import React from 'react';
import { StyleSheet, TextInput as RNTextInput, TextInputProps, View, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';

interface ThemedTextInputProps extends Omit<TextInputProps, 'style'> {
  error?: string;
  style?: StyleProp<ViewStyle>;
}

export function TextInput({ style, error, ...props }: ThemedTextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, style]}>
      <RNTextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
        placeholderTextColor={colors.textDim}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
}); 