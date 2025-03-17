import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

// Map SF Symbols to valid Ionicons names
const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'sunrise.fill': 'sunny',
  'trophy.fill': 'trophy',
  'flame.fill': 'flame',
  'person.2.fill': 'people',
  'star.fill': 'star',
  'flag.fill': 'flag',
  'crown.fill': 'ribbon',
  'heart.fill': 'heart',
  'lightbulb.fill': 'bulb',
  'sparkles': 'sparkles'
};

export function Icon({ name, size = 24, color = '#000000' }: IconProps) {
  // Convert SF Symbol name to Ionicons name
  const ionIconName = iconMap[name] || 'help-circle';
  
  return (
    <Ionicons
      name={Platform.select({
        ios: `ios-${ionIconName}`,
        android: `md-${ionIconName}`,
        default: `ios-${ionIconName}`
      }) as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
    />
  );
} 