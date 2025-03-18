import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { useChallenges } from '../../hooks/useChallenges';
import { Challenge, UserChallenge } from '../../types/challenge';
import { ErrorView } from '../../components/ErrorView';
import { formatDate } from '../../utils/dateUtils';

export default function ChallengesScreen() {
  const { 
    active, 
    available, 
    completed,
    isLoading,
    error,
    refreshChallenges,
  } = useChallenges();

  const router = useRouter();

  const handleChallengePress = useCallback((challenge: Challenge | UserChallenge) => {
    router.push({
      pathname: `/challenge/[id]`,
      params: { id: challenge.id, type: 'progress' in challenge ? 'user' : 'available' }
    });
  }, [router]);

  const renderChallengeProgress = (progress: number) => (
    <>
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
      <ThemedText style={styles.progressText}>
        {Math.round(progress)}% Complete
      </ThemedText>
    </>
  );

  const renderChallenge = (challenge: Challenge | UserChallenge, type: 'active' | 'available' | 'completed') => {
    const isUserChallenge = 'progress' in challenge;
    const progress = isUserChallenge ? challenge.progress : 0;
    const isCompleted = type === 'completed';

    return (
      <TouchableOpacity
        key={challenge.id}
        style={[
          styles.challengeCard,
          isCompleted && styles.completedCard
        ]}
        onPress={() => handleChallengePress(challenge)}
      >
        <View style={styles.challengeHeader}>
          <View style={styles.titleContainer}>
            <ThemedText type="title">{isUserChallenge ? (challenge as UserChallenge).displayName : (challenge as Challenge).title}</ThemedText>
            {isCompleted && progress >= 100 && (
              <Ionicons name="trophy" size={20} color={Colors.light.success} style={styles.trophyIcon} />
            )}
          </View>
          {type === 'available' ? (
            <ThemedText style={styles.stakeText}>Stake: {challenge.stake} tokens</ThemedText>
          ) : (
            <ThemedText style={styles.prizeText}>Prize: {isUserChallenge ? (challenge as UserChallenge).stake : (challenge as Challenge).prizePool} tokens</ThemedText>
          )}
        </View>

        <ThemedText style={styles.description}>{isUserChallenge ? (challenge as UserChallenge).displayName : (challenge as Challenge).description}</ThemedText>

        {isUserChallenge && renderChallengeProgress(progress)}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.statText}>
              {isUserChallenge ? '1' : `${(challenge as Challenge).participants.length}`} participants
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.statText}>
              {isCompleted ? 'Ended' : `Ends ${formatDate(isUserChallenge ? (challenge as UserChallenge).endDate.toDate().toISOString() : challenge.endDate)}`}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons 
              name={type === 'available' ? 'wallet-outline' : 'trophy-outline'} 
              size={20} 
              color={Colors.light.tint} 
            />
            <ThemedText style={styles.statText}>
              {type === 'available' ? `${challenge.stake} tokens` : `${isUserChallenge ? (challenge as UserChallenge).stake : (challenge as Challenge).prizePool} tokens`}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <ErrorView 
        error={error} 
        onRetry={refreshChallenges}
      />
    );
  }

  const hasNoChallenges = active.length === 0 && available.length === 0 && completed.length === 0;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshChallenges} />
      }
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Challenges</ThemedText>
      </ThemedView>

      {isLoading && hasNoChallenges ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <>
          {active.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">Active Challenges</ThemedText>
              {active.map(challenge => renderChallenge(challenge, 'active'))}
            </ThemedView>
          )}

          {available.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">Available Challenges</ThemedText>
              {available.map(challenge => renderChallenge(challenge, 'available'))}
            </ThemedView>
          )}

          {completed.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">Completed Challenges</ThemedText>
              {completed.map(challenge => renderChallenge(challenge, 'completed'))}
            </ThemedView>
          )}

          {hasNoChallenges && !isLoading && (
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color={Colors.light.text} />
              <ThemedText style={styles.emptyText}>No challenges available at the moment.</ThemedText>
              <ThemedText style={styles.emptySubtext}>Check back later for new challenges!</ThemedText>
            </ThemedView>
          )}
        </>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  section: {
    padding: 16,
    gap: 12,
  },
  challengeCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.8,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trophyIcon: {
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textDim,
  },
  stakeText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  prizeText: {
    color: Colors.light.success,
    fontWeight: '600',
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
    fontSize: 12,
    color: Colors.light.textDim,
    textAlign: 'right',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.light.textDim,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.light.text,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.light.textDim,
  },
}); 