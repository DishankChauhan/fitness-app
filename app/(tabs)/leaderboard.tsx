import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { ErrorView } from '@/components/ErrorView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { socialService } from '@/services/socialService';
import { achievementService } from '@/services/achievementService';
import type { Achievement } from '@/types/achievement';
/// <reference path="../../types/sf-symbols.d.ts" />

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL?: string;
  stats: {
    completedChallenges: number;
    totalTokens: number;
    successRate: number;
  };
  badges?: Achievement[];
}

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  const loadLeaderboard = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Get basic leaderboard data from the socialService
      const leaderboardData = await socialService.getLeaderboard();
      
      // Enhance the leaderboard data with badges from achievement service
      const enhancedData = await Promise.all(
        leaderboardData.map(async (entry) => {
          const badges = await achievementService.getUserAchievements(entry.id);
          return {
            ...entry,
            badges,
          };
        })
      );
      
      setLeaderboard(enhancedData as LeaderboardEntry[]);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getBadgeIcon = (badge: Achievement): string => {
    switch (badge.id) {
      case 'early_bird':
        return 'sun.max.fill';
      case 'challenger':
        return 'trophy.fill';
      case 'consistent':
        return 'checkmark.seal.fill';
      case 'social':
        return 'person.2.fill';
      case 'overachiever':
        return 'star.fill';
      case 'elite':
        return 'crown.fill';
      case 'mentor':
        return 'person.3.fill';
      case 'innovator':
        return 'lightbulb.fill';
      default:
        return 'star.fill';
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.id === user?.id;
    const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.text;

    return (
      <AnimatedThemedView
        entering={FadeInDown.delay(index * 100)}
        style={[
          styles.leaderboardItem,
          isCurrentUser && { backgroundColor: colors.tint + '20' },
        ]}
      >
        <ThemedView style={styles.rankContainer}>
          <ThemedText style={[styles.rank, { color: rankColor }]}>
            #{index + 1}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.userInfo}>
          <ThemedText type="defaultSemiBold">
            {item.displayName}
          </ThemedText>
          <ThemedView style={styles.badgeContainer}>
            {item.badges?.map((badge, badgeIndex) => (
              <IconSymbol
                key={badgeIndex}
                name={getBadgeIcon(badge) as IconSymbolName}
                size={16}
                color={colors.tint}
              />
            ))}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.stats}>
          <ThemedText type="defaultSemiBold" style={styles.score}>
            {item.stats.totalTokens}
          </ThemedText>
          <ThemedText style={styles.challenges}>
            {item.stats.completedChallenges} completed
          </ThemedText>
        </ThemedView>
      </AnimatedThemedView>
    );
  };

  const PeriodSelector = () => (
    <ThemedView style={styles.periodSelector}>
      <TouchableOpacity
        onPress={() => setSelectedPeriod('week')}
        style={[
          styles.periodButton,
          selectedPeriod === 'week' && { backgroundColor: colors.tint + '20' },
        ]}
      >
        <ThemedText style={selectedPeriod === 'week' && { color: colors.tint }}>
          Week
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSelectedPeriod('month')}
        style={[
          styles.periodButton,
          selectedPeriod === 'month' && { backgroundColor: colors.tint + '20' },
        ]}
      >
        <ThemedText style={selectedPeriod === 'month' && { color: colors.tint }}>
          Month
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSelectedPeriod('all')}
        style={[
          styles.periodButton,
          selectedPeriod === 'all' && { backgroundColor: colors.tint + '20' },
        ]}
      >
        <ThemedText style={selectedPeriod === 'all' && { color: colors.tint }}>
          All Time
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={loadLeaderboard}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <PeriodSelector />
      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="trophy.fill" size={48} color={colors.textDim} />
            <ThemedText style={styles.emptyText}>
              No leaderboard data available
            </ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  stats: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
  },
  challenges: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
}); 