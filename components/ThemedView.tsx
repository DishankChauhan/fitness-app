import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export interface ThemedViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function ThemedView({ children, style }: ThemedViewProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
});
