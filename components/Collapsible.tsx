import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export function Collapsible({ title, children, initiallyExpanded = false }: CollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const animatedStyle = useAnimatedStyle(() => ({
    height: isExpanded ? withTiming('auto') : withTiming(0),
    opacity: isExpanded ? withTiming(1) : withTiming(0),
  }));

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.header}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <IconSymbol
          name={isExpanded ? 'chevron.up' : 'chevron.down'}
          size={20}
          color={colors.icon}
        />
      </TouchableOpacity>
      <AnimatedThemedView style={[styles.content, animatedStyle]}>
        {children}
      </AnimatedThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
}); 