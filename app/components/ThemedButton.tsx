import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  type?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ThemedButton({
  title,
  onPress,
  type = 'primary',
  style,
  textStyle,
}: ThemedButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const buttonStyles = [
    styles.button,
    type === 'primary'
      ? {
          backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
        }
      : {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDark ? Colors.dark.tint : Colors.light.tint,
        },
    style,
  ];

  const textStyles = [
    styles.text,
    type === 'primary'
      ? {
          color: isDark ? Colors.dark.background : Colors.light.background,
        }
      : {
          color: isDark ? Colors.dark.tint : Colors.light.tint,
        },
    textStyle,
  ];

  return (
    <TouchableOpacity style={buttonStyles} onPress={onPress}>
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 