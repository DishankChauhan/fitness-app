import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import { Colors } from '../../../constants/Colors';
import { useChallenges } from '../../../hooks/useChallenges';
import { Button } from '../../../components/Button';
import { ErrorView } from '../../../components/ErrorView';
import { formatDate, getDaysRemaining, isDateInPast } from '../../../utils/dateUtils';
import { useLeaderboard } from '../../../hooks/useLeaderboard';
import { Challenge, UserChallenge } from '../../../types/challenge';

export default function ChallengeScreen() {
  const params = useLocalSearchParams<{ id: string; type: 'user' | 'available' }>();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { active, available, completed, joinChallenge, leaveChallenge, error: challengeError } = useChallenges();
  const { leaderboard, isLoading: isLoadingLeaderboard, error: leaderboardError } = useLeaderboard(params.id);

  // Find the challenge in any of the lists
  const challenge = [...active, ...available, ...completed].find(c => c.id === params.id) as Challenge | UserChallenge | undefined;
  const isUserChallenge = params.type === 'user';
  const isCompleted = completed.some(c => c.id === params.id);

  const handleAction = useCallback(async () => {
    if (!challenge) return;

    try {
      setIsProcessing(true);
      if (isUserChallenge) {
        await leaveChallenge(challenge.id);
        router.back();
      } else {
        await joinChallenge(challenge.id);
        router.back();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to process your request'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [challenge, isUserChallenge, joinChallenge, leaveChallenge, router]);

  const getMetricDisplay = () => {
    if (!challenge) return '';

    switch (challenge.type) {
      case 'steps':
        return `${challenge.target.toLocaleString()} Steps`;
      case 'activeMinutes':
        return `${challenge.target} Active Minutes`;
      default:
        return `${challenge.target}`;
    }
  };

  if (challengeError) {
    return (
      <ErrorView 
        error={challengeError} 
      />
    );
  }

  if (!challenge) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Challenge not found</ThemedText>
      </ThemedView>
    );
  }

  const progress = isUserChallenge ? (challenge as UserChallenge).progress : 0;
  const daysRemaining = getDaysRemaining(challenge.endDate);
  const hasEnded = isDateInPast(challenge.endDate);

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{challenge.title}</ThemedText>
        <View style={styles.statusContainer}>
          {hasEnded ? (
            <View style={[styles.badge, styles.completedBadge]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
              <ThemedText style={styles.badgeText}>Completed</ThemedText>
            </View>
          ) : (
            <View style={[styles.badge, styles.activeBadge]}>
              <Ionicons name="time" size={16} color={Colors.light.tint} />
              <ThemedText style={styles.badgeText}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.description}>{challenge.description}</ThemedText>

        <View style={styles.targetContainer}>
          <ThemedText type="subtitle">Target</ThemedText>
          <ThemedText style={styles.target}>{getMetricDisplay()}</ThemedText>
        </View>

        {isUserChallenge && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <ThemedText type="subtitle">Your Progress</ThemedText>
              <ThemedText style={[
                styles.progressText,
                progress >= 100 ? styles.completedText : {}
              ]}>
                {Math.round(progress)}%
              </ThemedText>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: progress >= 100 ? Colors.light.success : Colors.light.tint
                  }
                ]} 
              />
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={24} color={Colors.light.tint} />
            <ThemedText style={styles.statLabel}>Participants</ThemedText>
            <ThemedText style={styles.statValue}>{challenge.participants.length}</ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="trophy-outline" size={24} color={Colors.light.tint} />
            <ThemedText style={styles.statLabel}>Prize Pool</ThemedText>
            <ThemedText style={styles.statValue}>{challenge.prizePool} tokens</ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="wallet-outline" size={24} color={Colors.light.tint} />
            <ThemedText style={styles.statLabel}>Stake</ThemedText>
            <ThemedText style={styles.statValue}>{challenge.stake} tokens</ThemedText>
          </View>
        </View>

        {!isCompleted && !hasEnded && (
          <Button
            onPress={handleAction}
            style={styles.actionButton}
            variant={isUserChallenge ? "secondary" : "primary"}
            loading={isProcessing}
          >
            {isUserChallenge ? 'Leave Challenge' : 'Join Challenge'}
          </Button>
        )}
      </ThemedView>

      {isUserChallenge && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Leaderboard</ThemedText>
          {isLoadingLeaderboard ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
            </View>
          ) : leaderboardError ? (
            <ThemedText style={styles.errorText}>{leaderboardError}</ThemedText>
          ) : (
            leaderboard.map((entry, index) => (
              <View key={entry.userId} style={styles.leaderboardItem}>
                <View style={styles.rankContainer}>
                  {index < 3 && (
                    <Ionicons 
                      name="trophy" 
                      size={20} 
                      color={
                        index === 0 ? '#FFD700' : 
                        index === 1 ? '#C0C0C0' : 
                        '#CD7F32'
                      } 
                    />
                  )}
                  <ThemedText style={styles.rank}>#{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.userName}>{entry.displayName}</ThemedText>
                <ThemedText style={[
                  styles.userProgress,
                  entry.score >= 100 ? styles.completedText : {}
                ]}>
                  {Math.round(entry.score)}%
                </ThemedText>
              </View>
            ))
          )}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: Colors.light.tint + '20',
  },
  completedBadge: {
    backgroundColor: Colors.light.success + '20',
  },
  badgeText: {
    fontSize: 12,
    color: Colors.light.textDim,
  },
  section: {
    padding: 16,
    gap: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textDim,
  },
  targetContainer: {
    gap: 8,
  },
  target: {
    fontSize: 24,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    color: Colors.light.success,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textDim,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 8,
  },
  loadingContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.error,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    gap: 4,
  },
  rank: {
    fontSize: 16,
    fontWeight: '600',
    width: 32,
  },
  userName: {
    flex: 1,
    fontSize: 16,
  },
  userProgress: {
    fontSize: 16,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
}); 