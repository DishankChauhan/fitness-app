import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ErrorView } from '@/components/ErrorView';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import { Challenge, UserChallenge } from '@/types/challenge';
import { challengeService } from '@/services/challengeService';
import * as walletService from '@/services/walletService';
import * as authService from '@/services/authService';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

interface UserStats {
  totalChallenges: number;
  completedChallenges: number;
  activeChallenges: number;
  totalTokens: number;
  successRate: number;
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
  }[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredScore: number;
}

// In a real app, these would come from the database
const ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    title: 'Early Bird',
    description: 'Complete 5 morning challenges',
    icon: 'sun.max.fill',
    requiredScore: 5
  },
  {
    id: '2',
    title: 'Challenger',
    description: 'Join 10 challenges',
    icon: 'trophy.fill',
    requiredScore: 10
  },
  {
    id: '3',
    title: 'Consistent',
    description: 'Maintain streak for 30 days',
    icon: 'checkmark.seal.fill',
    requiredScore: 30
  },
  {
    id: '4',
    title: 'Social',
    description: 'Complete 5 group challenges',
    icon: 'person.2.fill',
    requiredScore: 5
  }
];

// Define a local type that matches the service response
interface ServiceUserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  status: string;
  progress: number;
  startDate: string;
  endDate?: string;
  lastCheckIn?: string;
  isGroupChallenge?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut } = useAuth();

  const [stats, setStats] = useState<UserStats>({
    totalChallenges: 0,
    completedChallenges: 0,
    activeChallenges: 0,
    totalTokens: 0,
    successRate: 0,
    achievements: [],
  });
  const [recentChallenges, setRecentChallenges] = useState<(Challenge | UserChallenge)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Get user profile from auth service
      const userProfile = await authService.getCurrentUser();
      if (!userProfile) throw new Error('User not found');
      
      // Get user challenges
      const userChallenges = await challengeService.getUserChallenges() as unknown as ServiceUserChallenge[];
      
      // Get wallet stats
      const walletStats = await walletService.getWalletStats();
      
      // Calculate stats
      const completedChallenges = userChallenges.filter(c => c.status === 'completed').length;
      const activeChallenges = userChallenges.filter(c => c.status === 'active').length;
      const totalChallenges = userChallenges.length;
      const successRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;
      
      // Calculate unlocked achievements
      const unlockedAchievements = calculateUnlockedAchievements(userProfile, userChallenges);
      
      setStats({
        totalChallenges,
        completedChallenges,
        activeChallenges,
        totalTokens: walletStats.availableBalance,
        successRate,
        achievements: unlockedAchievements,
      });
      
      // Get recent challenges - cast to the expected type for the state
      setRecentChallenges(userChallenges.slice(0, 3) as unknown as (Challenge | UserChallenge)[]);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateUnlockedAchievements = (
    userProfile: authService.UserProfile, 
    challenges: ServiceUserChallenge[]
  ) => {
    return ACHIEVEMENTS.map(achievement => {
      let unlocked = false;
      let unlockedAt: string | undefined = undefined;
      
      // This is simplified logic - in a real app, you'd have more sophisticated criteria
      switch (achievement.id) {
        case '1': // Early Bird
          const morningChallenges = challenges.filter(c => {
            const startHour = new Date(c.startDate).getHours();
            return startHour >= 5 && startHour <= 9;
          }).length;
          unlocked = morningChallenges >= achievement.requiredScore;
          break;
        case '2': // Challenger
          unlocked = challenges.length >= achievement.requiredScore;
          break;
        case '3': // Consistent
          // This would require streak data in a real app
          unlocked = (userProfile.stats?.longestStreak || 0) >= achievement.requiredScore;
          break;
        case '4': // Social
          const groupChallenges = challenges.filter(c => c.isGroupChallenge === true).length;
          unlocked = groupChallenges >= achievement.requiredScore;
          break;
      }
      
      if (unlocked) {
        // In a real app, this would be the actual date the achievement was unlocked
        unlockedAt = new Date().toISOString();
      }
      
      return {
        ...achievement,
        unlockedAt
      };
    });
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      setError((err as Error).message);
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
        onRetry={loadUserData}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.text}
        />
      }
    >
      <AnimatedThemedView
        entering={FadeInDown.duration(500)}
        style={styles.header}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <ThemedText type="title">
          {user?.displayName || 'Anonymous'}
        </ThemedText>
        <ThemedText style={styles.email}>
          {user?.email}
        </ThemedText>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.duration(500).delay(100)}
        style={styles.statsContainer}
      >
        <ThemedView style={styles.statRow}>
          <ThemedView style={styles.stat}>
            <IconSymbol name="trophy.fill" size={24} color={colors.tint} />
            <ThemedText type="defaultSemiBold">
              {stats.completedChallenges}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Completed
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.stat}>
            <IconSymbol name="flame.fill" size={24} color={colors.tint} />
            <ThemedText type="defaultSemiBold">
              {stats.activeChallenges}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Active
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.stat}>
            <IconSymbol name="dollarsign.circle" size={24} color={colors.tint} />
            <ThemedText type="defaultSemiBold">
              {stats.totalTokens}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Tokens
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.successRate}>
          <ThemedView style={styles.successHeader}>
            <ThemedText type="defaultSemiBold">Success Rate</ThemedText>
            <ThemedText>{stats.successRate}%</ThemedText>
          </ThemedView>
          <ProgressBar progress={stats.successRate} height={8} />
        </ThemedView>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.duration(500).delay(200)}
        style={styles.section}
      >
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Achievements
        </ThemedText>
        <ThemedView style={styles.achievements}>
          {stats.achievements.map((achievement, index) => (
            <ThemedView
              key={achievement.id}
              style={[
                styles.achievement,
                !achievement.unlockedAt ? styles.achievementLocked : {},
              ]}
            >
              <IconSymbol
                name={achievement.icon as any}
                color={achievement.unlockedAt ? colors.tint : colors.textDim}
              />
              <ThemedText type="defaultSemiBold" style={styles.achievementTitle}>
                {achievement.title}
              </ThemedText>
              <ThemedText style={styles.achievementDesc}>
                {achievement.description}
              </ThemedText>
              {achievement.unlockedAt && (
                <ThemedText style={styles.achievementDate}>
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </ThemedText>
              )}
            </ThemedView>
          ))}
        </ThemedView>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.duration(500).delay(300)}
        style={styles.section}
      >
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent Challenges
        </ThemedText>
        <ThemedView style={styles.recentChallenges}>
          {recentChallenges.map((challenge, index) => (
            <TouchableOpacity
              key={challenge.id}
              onPress={() => router.push(`/challenge/${challenge.id}`)}
            >
              <ThemedView style={styles.challengeItem}>
                <IconSymbol
                  name={challenge.type === 'steps' ? 'figure.walk' : 'flame.fill'}
                  size={24}
                  color={colors.text}
                />
                <ThemedView style={styles.challengeInfo}>
                  <ThemedText type="defaultSemiBold">
                    {challenge.title}
                  </ThemedText>
                  {'progress' in challenge && (
                    <ProgressBar progress={challenge.progress} height={4} />
                  )}
                </ThemedView>
              </ThemedView>
            </TouchableOpacity>
          ))}
        </ThemedView>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.duration(500).delay(400)}
        style={styles.footer}
      >
        <Button
          onPress={handleSignOut}
          variant="secondary"
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </AnimatedThemedView>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  email: {
    opacity: 0.7,
  },
  statsContainer: {
    padding: 16,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  successRate: {
    gap: 8,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  achievements: {
    gap: 12,
  },
  achievement: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementTitle: {
    marginTop: 4,
  },
  achievementDesc: {
    fontSize: 14,
    opacity: 0.7,
  },
  achievementDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  recentChallenges: {
    gap: 8,
  },
  challengeItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  challengeInfo: {
    flex: 1,
    gap: 8,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  signOutButton: {
    width: '100%',
  },
}); 