import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../app/hooks/useColorScheme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { challengeService } from '../services/challengeService';
import * as authService from '../services/authService';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export interface LeaderboardParticipant {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  progress: number;
  rank?: number;
  isCurrentUser?: boolean;
  score?: number;
}

interface LeaderboardProps {
  challengeId?: string;
  title?: string;
  limit?: number;
  showFilters?: boolean;
  onParticipantPress?: (participant: LeaderboardParticipant) => void;
  timeFrame?: 'daily' | 'weekly' | 'monthly' | 'all';
}

export function Leaderboard({
  challengeId,
  title = 'Leaderboard',
  limit = 10,
  showFilters = true,
  onParticipantPress,
  timeFrame: initialTimeFrame = 'weekly',
}: LeaderboardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<LeaderboardParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly' | 'all'>(initialTimeFrame);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    loadCurrentUser();
  }, [challengeId, timeFrame]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user.id);
      }
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let leaderboardData: LeaderboardParticipant[] = [];
      
      if (challengeId) {
        // Load participants for a specific challenge
        const challenge = await challengeService.getChallenge(challengeId);
        if (challenge) {
          // Get all participants for this challenge
          const participantsPromises = challenge.participants.map(async (userId) => {
            const userChallenge = await challengeService.getUserChallenge(challengeId, userId);
            if (userChallenge) {
              return {
                id: `${challengeId}-${userId}`,
                userId,
                displayName: userChallenge.displayName || 'Anonymous',
                progress: userChallenge.progress || 0,
                score: userChallenge.progress || 0,
              };
            }
            return null;
          });
          
          const participantsResults = await Promise.all(participantsPromises);
          leaderboardData = participantsResults.filter(Boolean) as LeaderboardParticipant[];
        }
      } else {
        // Load global leaderboard
        // This would typically come from a dedicated leaderboard API
        // For now, we'll use mock data
        leaderboardData = [
          { id: '1', userId: '1', displayName: 'Runner1', progress: 95, score: 9500 },
          { id: '2', userId: '2', displayName: 'StepMaster', progress: 87, score: 8700 },
          { id: '3', userId: '3', displayName: 'FitnessFan', progress: 82, score: 8200 },
          { id: '4', userId: '4', displayName: 'HealthyHabit', progress: 76, score: 7600 },
          { id: '5', userId: '5', displayName: 'WalkingPro', progress: 71, score: 7100 },
          { id: '6', userId: '6', displayName: 'JoggerJoe', progress: 68, score: 6800 },
          { id: '7', userId: '7', displayName: 'ActiveAlex', progress: 65, score: 6500 },
          { id: '8', userId: '8', displayName: 'EnergeticEmma', progress: 62, score: 6200 },
          { id: '9', userId: '9', displayName: 'MotivatedMax', progress: 58, score: 5800 },
          { id: '10', userId: '10', displayName: 'DeterminedDan', progress: 54, score: 5400 },
        ];
      }
      
      // Sort by progress (or score) and assign ranks
      leaderboardData.sort((a, b) => (b.score || b.progress) - (a.score || a.progress));
      
      // Assign ranks and mark current user
      leaderboardData = leaderboardData.map((participant, index) => ({
        ...participant,
        rank: index + 1,
        isCurrentUser: participant.userId === currentUser,
      }));
      
      // Limit the number of participants if specified
      if (limit) {
        leaderboardData = leaderboardData.slice(0, limit);
      }
      
      setParticipants(leaderboardData);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantPress = (participant: LeaderboardParticipant) => {
    if (onParticipantPress) {
      onParticipantPress(participant);
    } else if (challengeId) {
      // Navigate to participant profile
      router.push(`/profile/${participant.userId}`);
    }
  };

  const renderTimeFrameFilters = () => {
    if (!showFilters) return null;
    
    const filters = [
      { key: 'daily', label: 'Today' },
      { key: 'weekly', label: 'This Week' },
      { key: 'monthly', label: 'This Month' },
      { key: 'all', label: 'All Time' },
    ];
    
    return (
      <ThemedView style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => setTimeFrame(filter.key as any)}
            style={[
              styles.filterButton,
              timeFrame === filter.key && { backgroundColor: colors.tint + '33' },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                timeFrame === filter.key && { color: colors.tint },
              ]}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>
    );
  };

  const renderParticipantItem = ({ item, index }: { item: LeaderboardParticipant; index: number }) => {
    // Apply animation with staggered delay based on position
    return (
      <AnimatedThemedView
        entering={FadeInDown.duration(400).delay(index * 100)}
        style={[
          styles.participantItem,
          item.isCurrentUser && { backgroundColor: colors.tint + '15' },
        ]}
      >
        <TouchableOpacity
          style={styles.participantContent}
          onPress={() => handleParticipantPress(item)}
        >
          <ThemedView style={styles.rankContainer}>
            {item.rank === 1 && (
              <IconSymbol name="trophy.fill" size={16} color="#FFD700" />
            )}
            {item.rank === 2 && (
              <IconSymbol name="trophy.fill" size={16} color="#C0C0C0" />
            )}
            {item.rank === 3 && (
              <IconSymbol name="trophy.fill" size={16} color="#CD7F32" />
            )}
            {item.rank && item.rank > 3 && (
              <ThemedText style={styles.rankText}>{item.rank}</ThemedText>
            )}
          </ThemedView>
          
          <ThemedView style={styles.participantInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.participantName}>
              {item.displayName}
              {item.isCurrentUser && (
                <ThemedText style={styles.currentUserIndicator}> (You)</ThemedText>
              )}
            </ThemedText>
            
            <ThemedView style={styles.progressContainer}>
              <ProgressBar
                progress={item.progress}
                height={4}
                color={item.isCurrentUser ? colors.tint : undefined}
              />
              <ThemedText style={styles.scoreText}>
                {item.score || Math.round(item.progress * 100)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          
          <IconSymbol name="chevron.right" size={16} color={colors.textDim} />
        </TouchableOpacity>
      </AnimatedThemedView>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>{error}</ThemedText>
        <TouchableOpacity onPress={loadLeaderboard} style={styles.retryButton}>
          <ThemedText style={{ color: colors.tint }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {participants.length > 0 && (
          <ThemedView style={styles.participantCount}>
            <ThemedText style={styles.participantCountText}>
              {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      
      {renderTimeFrameFilters()}
      
      {participants.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <IconSymbol name="person.3" size={40} color={colors.textDim} />
          <ThemedText style={styles.emptyText}>No participants yet</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={participants}
          renderItem={renderParticipantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
  },
  participantItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  participantContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
    marginRight: 8,
  },
  participantName: {
    marginBottom: 4,
  },
  currentUserIndicator: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreText: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 16,
  },
  participantCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  participantCountText: {
    fontSize: 12,
  },
}); 