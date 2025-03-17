import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AchievementPopupProps {
  title: string;
  description: string;
  icon: IconSymbolName;
  onHide: () => void;
}

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export function AchievementPopup({ title, description, icon, onHide }: AchievementPopupProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Show animation
    translateY.value = withSpring(20, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withSpring(1);

    // Hide after delay
    const hideAfterDelay = () => {
      translateY.value = withSpring(-100);
      opacity.value = withTiming(0, { duration: 300 }, finished => {
        if (finished) {
          runOnJS(onHide)();
        }
      });
    };

    const timer = setTimeout(() => {
      hideAfterDelay();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedThemedView style={[styles.container, animatedStyle]}>
      <ThemedView style={styles.iconContainer}>
        <IconSymbol name={icon} size={32} color={colors.tint} />
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.description}>
          {description}
        </ThemedText>
      </ThemedView>
    </AnimatedThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: width - 32,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
  },
}); 