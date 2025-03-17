import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { Icon } from './Icon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export type BadgeType = 
  | 'early_bird'    // First to join challenges
  | 'challenger'    // Completed 5 challenges
  | 'consistent'    // Maintained streak for 7 days
  | 'social'        // Active in community
  | 'overachiever'  // Exceeded challenge goals
  | 'pioneer'       // Early app adopter
  | 'elite'         // Top 10% in challenges
  | 'mentor'        // Helped others
  | 'innovator'     // Created popular challenges
  | 'legend';       // All achievements unlocked

interface BadgeProps {
  type: BadgeType;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: ViewStyle;
  isNew?: boolean;
}

const BADGE_CONFIGS = {
  early_bird: {
    icon: 'sunrise.fill',
    color: '#FFB347',
    label: 'Early Bird'
  },
  challenger: {
    icon: 'trophy.fill',
    color: '#FFD700',
    label: 'Challenger'
  },
  consistent: {
    icon: 'flame.fill',
    color: '#FF4500',
    label: 'Consistent'
  },
  social: {
    icon: 'person.2.fill',
    color: '#4169E1',
    label: 'Social'
  },
  overachiever: {
    icon: 'star.fill',
    color: '#9370DB',
    label: 'Overachiever'
  },
  pioneer: {
    icon: 'flag.fill',
    color: '#32CD32',
    label: 'Pioneer'
  },
  elite: {
    icon: 'crown.fill',
    color: '#FFD700',
    label: 'Elite'
  },
  mentor: {
    icon: 'heart.fill',
    color: '#FF69B4',
    label: 'Mentor'
  },
  innovator: {
    icon: 'lightbulb.fill',
    color: '#00CED1',
    label: 'Innovator'
  },
  legend: {
    icon: 'sparkles',
    color: '#FF1493',
    label: 'Legend'
  }
};

export function Badge({ type, size = 'medium', showLabel = true, style, isNew = false }: BadgeProps) {
  const config = BADGE_CONFIGS[type];
  const dimensions = {
    small: 24,
    medium: 32,
    large: 48
  }[size];

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        entering={isNew ? FadeIn : undefined}
        exiting={FadeOut}
        style={[
          styles.badge,
          {
            backgroundColor: config.color,
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2
          }
        ]}
      >
        <Icon
          name={config.icon}
          size={dimensions * 0.6}
          color="#FFFFFF"
        />
        {isNew && (
          <View style={styles.newIndicator} />
        )}
      </Animated.View>
      {showLabel && (
        <ThemedText style={styles.label}>
          {config.label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  label: {
    fontSize: 12,
    textAlign: 'center'
  },
  newIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000'
  }
}); 