import React from 'react';
import { StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface Participant {
  userId: string;
  displayName: string;
  progress?: number;
}

interface ParticipantListProps {
  participants: Participant[];
  showProgress?: boolean;
}

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export function ParticipantList({ participants, showProgress = false }: ParticipantListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderParticipant: ListRenderItem<Participant> = ({ item, index }) => (
    <AnimatedThemedView
      entering={FadeInRight.delay(index * 100)}
      style={styles.participantRow}
    >
      <ThemedView style={styles.participantInfo}>
        <IconSymbol name="person.circle" size={24} color={colors.text} />
        <ThemedText>{item.displayName}</ThemedText>
      </ThemedView>
      {showProgress && item.progress !== undefined && (
        <ThemedText style={styles.progress}>
          {Math.round(item.progress)}%
        </ThemedText>
      )}
    </AnimatedThemedView>
  );

  return (
    <FlatList
      data={participants}
      renderItem={renderParticipant}
      keyExtractor={item => item.userId}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <ThemedText style={styles.emptyText}>
          No participants yet
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progress: {
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 16,
  },
}); 