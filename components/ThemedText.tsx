import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';

export interface ThemedTextProps {
  children: React.ReactNode;
  type?: 'default' | 'defaultSemiBold' | 'subtitle' | 'title';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function ThemedText({ children, type = 'default', style, numberOfLines }: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getTypeStyle = (): TextStyle => {
    switch (type) {
      case 'title':
        return {
          fontSize: 24,
          fontWeight: '600',
        };
      case 'subtitle':
        return {
          fontSize: 18,
          fontWeight: '600',
        };
      case 'defaultSemiBold':
        return {
          fontSize: 16,
          fontWeight: '600',
        };
      default:
        return {
          fontSize: 16,
          fontWeight: '400',
        };
    }
  };

  return (
    <Text
      style={[
        getTypeStyle(),
        { color: colors.text },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
