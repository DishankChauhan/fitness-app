import React from 'react';
import { Text, TextStyle, TextProps } from 'react-native';
import { useColorScheme } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'default' | 'title' | 'subtitle' | 'caption';
  style?: TextStyle;
}

export function ThemedText({ type = 'default', style, ...props }: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const baseStyle: TextStyle = {
    color: isDark ? '#FFFFFF' : '#000000',
    fontSize: type === 'title' ? 20 : 
             type === 'subtitle' ? 16 : 
             type === 'caption' ? 12 : 14,
    fontWeight: type === 'title' ? '600' : 
                type === 'subtitle' ? '500' : 
                'normal'
  };

  return (
    <Text style={[baseStyle, style]} {...props} />
  );
} 