import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ThemedTextInputProps extends TextInputProps {
  // Add any additional props here
}

export function ThemedTextInput(props: ThemedTextInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
          color: isDark ? Colors.dark.text : Colors.light.text,
          borderColor: isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
        },
        props.style,
      ]}
      placeholderTextColor={isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
}); 