import React from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  AnimateProps,
} from 'react-native-reanimated';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  entering?: AnimateProps<ViewStyle>['entering'];
}

export function AnimatedCard({ children, onPress, style, disabled, entering }: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const animatedStyle = useAnimatedStyle(() => {
    const elevation = interpolate(scale.value, [1, 0.95], [5, 2]);
    
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: interpolate(scale.value, [1, 0.95], [0.2, 0.1]),
      elevation,
    };
  });

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        entering={entering}
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 8,
    marginHorizontal: 16,
  },
}); 