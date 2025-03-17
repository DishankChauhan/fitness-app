import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { ErrorView } from '@/components/ErrorView';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ParticipantList } from '@/components/ParticipantList';
import { challengeService } from '@/services/challengeService';
import { formatDate, formatDuration } from '@/utils/dateUtils';
import { Challenge, UserChallenge } from '@/types/challenge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/app/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [challenge, setChallenge] = useState<Challenge | UserChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [participants, setParticipants] = useState<Array<{ userId: string; displayName: string; progress?: number }>>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, [id]);

  useEffect(() => {
    if (challenge) {
      loadParticipants();
    }
  }, [challenge]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const challenges = await challengeService.getAllChallenges();
      const found = challenges.find(c => c.id === id);
      if (!found) {
        setError('Challenge not found');
        return;
      }
      setChallenge(found as unknown as Challenge | UserChallenge);
    } catch (err) {
      setError('Failed to load challenge');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!challenge) return;
    
    try {
      setLoadingParticipants(true);
      const participantData = await Promise.all(
        challenge.participants.map(async (userId) => {
          const userChallenge = await challengeService.getUserChallenge(challenge.id, userId);
          return {
            userId,
            displayName: userChallenge?.displayName || 'Anonymous',
            progress: userChallenge?.progress,
          };
        })
      );
      setParticipants(participantData);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError(null);
      await challengeService.joinChallenge(id as string);
      await loadChallenge();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      setLeaving(true);
      setError(null);
      await challengeService.leaveChallenge(id as string);
      await loadChallenge();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLeaving(false);
    }
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
        onRetry={loadChallenge}
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

  const isUserChallenge = 'progress' in challenge;
  const daysRemaining = challenge.endDate ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = challenge.status === 'active';
  const canJoin = isActive && !isUserChallenge && (user?.tokens ?? 0) >= challenge.stake;
  const canLeave = isActive && isUserChallenge;

  return (
    <ScrollView style={styles.scrollView}>
      <AnimatedThemedView 
        entering={FadeIn.duration(500)} 
        style={styles.container}
      >
        <AnimatedThemedView 
          entering={FadeInDown.duration(600).delay(100)} 
          style={styles.header}
        >
          <IconSymbol 
            name={challenge.type === 'steps' ? 'figure.walk' : 'flame.fill'} 
            size={32} 
            color={colors.text}
          />
          <ThemedText type="title" style={styles.title}>
            {challenge.title}
          </ThemedText>
        </AnimatedThemedView>
        <AnimatedCard 
          style={styles.descriptionCard}
        >
          <ThemedText type="subtitle">Description</ThemedText>
          <ThemedText style={styles.description}>{challenge.description}</ThemedText>
        </AnimatedCard>

        <AnimatedCard 
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.detailsCard}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>Challenge Details</ThemedText>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="target" size={20} color={colors.text} />
            <ThemedText>{challenge.target} {challenge.type}</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="dollarsign.circle" size={20} color={colors.text} />
            <ThemedText>{challenge.stake} tokens stake</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="trophy" size={20} color={colors.text} />
            <ThemedText>{challenge.prizePool} tokens prize pool</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="calendar" size={20} color={colors.text} />
            <ThemedView>
              <ThemedText>Starts: {formatDate(challenge.startDate)}</ThemedText>
              <ThemedText>Ends: {formatDate(challenge.endDate)}</ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="hourglass" size={20} color={colors.text} />
            <ThemedText>{daysRemaining} days remaining</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.detailRow}>
            <IconSymbol name="person.2" size={20} color={colors.text} />
            <ThemedText>{challenge.participants.length} participants</ThemedText>
          </ThemedView>
        </AnimatedCard>

        {isUserChallenge && (
          <AnimatedCard 
            entering={FadeInDown.duration(600).delay(400)}
            style={styles.progressCard}
          >
            <ThemedText type="subtitle">Your Progress</ThemedText>
            <ProgressBar 
              progress={challenge.progress} 
              color={colors.tint}
              height={12}
            />
            <ThemedText style={styles.progressText}>
              {Math.round(challenge.progress)}%
            </ThemedText>
          </AnimatedCard>
        )}

        <AnimatedCard 
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.participantsCard}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Participants
          </ThemedText>
          {loadingParticipants ? (
            <ActivityIndicator style={styles.participantsLoading} />
          ) : (
            <ParticipantList 
              participants={participants}
              showProgress={isUserChallenge}
            />
          )}
        </AnimatedCard>

        <AnimatedThemedView 
          entering={FadeInDown.duration(600).delay(500)}
          style={styles.actionContainer}
        >
          {canJoin && (
            <Button
              onPress={handleJoin}
              loading={joining}
              disabled={joining}
              style={styles.button}
            >
              Join Challenge
            </Button>
          )}
          {canLeave && (
            <Button
              onPress={handleLeave}
              loading={leaving}
              disabled={leaving}
              variant="secondary"
              style={styles.button}
            >
              Leave Challenge
            </Button>
          )}
        </AnimatedThemedView>
      </AnimatedThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    flex: 1,
  },
  descriptionCard: {
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    lineHeight: 24,
  },
  detailsCard: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  progressCard: {
    marginBottom: 16,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  actionContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
  button: {
    marginTop: 8,
  },
  participantsCard: {
    marginBottom: 16,
    maxHeight: 300,
  },
  participantsLoading: {
    marginVertical: 16,
  },
}); 