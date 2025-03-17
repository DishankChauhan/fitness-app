import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorView } from '@/components/ErrorView';
import { challengeService } from '@/services/challengeService';
import { Challenge, UserChallenge } from '@/types/challenge';
import { formatDate, formatDuration } from '@/utils/dateUtils';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [challenges, setChallenges] = useState<(Challenge | UserChallenge)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = async () => {
    try {
      setError(null);
      const data = await challengeService.getAllChallenges();
      setChallenges(data as unknown as (Challenge | UserChallenge)[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadChallenges();
  };

  const handleChallengePress = (challenge: Challenge | UserChallenge) => {
    router.push(`/challenge/${challenge.id}`);
  };

  const renderChallenge = ({ item, index }: { item: Challenge | UserChallenge; index: number }) => {
    const isUserChallenge = 'progress' in item;
    const daysRemaining = item.endDate ? Math.max(0, Math.ceil((new Date(item.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    return (
      <AnimatedCard
        entering={FadeInDown.delay(index * 100)}
        onPress={() => handleChallengePress(item)}
        style={styles.card}
      >
        <ThemedView style={styles.cardHeader}>
          <IconSymbol
            name={item.type === 'steps' ? 'figure.walk' : 'flame.fill'}
            size={24}
            color={colors.text}
          />
          <ThemedText type="subtitle" style={styles.title}>
            {item.title}
          </ThemedText>
        </ThemedView>

        <ThemedText style={styles.description} numberOfLines={2}>
          {item.description}
        </ThemedText>

        <ThemedView style={styles.stats}>
          <ThemedView style={styles.statRow}>
            <IconSymbol name="target" size={16} color={colors.text} />
            <ThemedText>{item.target} {item.type}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.statRow}>
            <IconSymbol name="dollarsign.circle" size={16} color={colors.text} />
            <ThemedText>{item.stake} tokens stake</ThemedText>
          </ThemedView>

          <ThemedView style={styles.statRow}>
            <IconSymbol name="hourglass" size={16} color={colors.text} />
            <ThemedText>{daysRemaining} days remaining</ThemedText>
          </ThemedView>
        </ThemedView>

        {isUserChallenge && (
          <ThemedView style={styles.progressContainer}>
            <ProgressBar progress={item.progress} height={8} />
            <ThemedText style={styles.progressText}>
              {Math.round(item.progress)}%
            </ThemedText>
          </ThemedView>
        )}
      </AnimatedCard>
    );
  };

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
        onRetry={loadChallenges}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
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
            <IconSymbol name="trophy" size={48} color={colors.textDim} />
            <ThemedText style={styles.emptyText}>
              No challenges available
            </ThemedText>
            <Button
              onPress={handleRefresh}
              variant="secondary"
              style={styles.refreshButton}
            >
              Refresh
            </Button>
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
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  description: {
    marginBottom: 16,
  },
  stats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
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
  refreshButton: {
    marginTop: 8,
  },
});
