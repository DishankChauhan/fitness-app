import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { IconSymbol, type SFSymbols6_0 } from '@/components/ui/IconSymbol';
import { ErrorView } from '@/components/ErrorView';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import { Challenge } from '@/types/challenge';
import { challengeService } from '@/services/challengeService';
import * as walletService from '@/services/walletService';
import * as authService from '@/services/authService';
import { BadgeType, Achievement, AchievementMetadata } from '@/types/achievement';
import Animated, { FadeInDown } from 'react-native-reanimated';
import auth from '@react-native-firebase/auth';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

interface UserStats {
  totalChallenges: number;
  completedChallenges: number;
  activeChallenges: number;
  totalTokens: number;
  successRate: number;
  achievements: Achievement[];
}

// In a real app, these would come from the database
const ACHIEVEMENTS: AchievementMetadata[] = [
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete 5 morning challenges',
    icon: 'sun.max.fill' as SFSymbols6_0,
    requiredScore: 5
  },
  {
    id: 'challenger',
    title: 'Challenger',
    description: 'Join 10 challenges',
    icon: 'trophy.fill' as SFSymbols6_0,
    requiredScore: 10
  },
  {
    id: 'consistent',
    title: 'Consistent',
    description: 'Maintain streak for 30 days',
    icon: 'checkmark.seal.fill' as SFSymbols6_0,
    requiredScore: 30
  },
  {
    id: 'social',
    title: 'Social',
    description: 'Complete 5 group challenges',
    icon: 'person.2.fill' as SFSymbols6_0,
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
  const firebaseUser = auth().currentUser;

  const [stats, setStats] = useState<UserStats>({
    totalChallenges: 0,
    completedChallenges: 0,
    activeChallenges: 0,
    totalTokens: 0,
    successRate: 0,
    achievements: [],
  });
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
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
      const userChallenges = await challengeService.getUserChallenges();
      
      // Get wallet stats
      const walletStats = await walletService.getWalletStats(userProfile.id);
      
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
      
      // Get recent challenges
      setRecentChallenges(userChallenges.slice(0, 3));
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
    challenges: Challenge[]
  ): Achievement[] => {
    return ACHIEVEMENTS.map(achievement => {
      let unlocked = false;
      let progress = 0;
      
      switch (achievement.id) {
        case 'early_bird': {
          const morningChallenges = challenges.filter(c => {
            const startHour = new Date(c.startDate).getHours();
            return startHour >= 5 && startHour <= 9;
          }).length;
          progress = (morningChallenges / achievement.requiredScore) * 100;
          unlocked = morningChallenges >= achievement.requiredScore;
          break;
        }
        case 'challenger': {
          progress = (challenges.length / achievement.requiredScore) * 100;
          unlocked = challenges.length >= achievement.requiredScore;
          break;
        }
        case 'consistent': {
          const streak = userProfile.stats?.longestStreak || 0;
          progress = (streak / achievement.requiredScore) * 100;
          unlocked = streak >= achievement.requiredScore;
          break;
        }
        case 'social': {
          const groupChallenges = challenges.filter(c => c.type === 'activeMinutes').length;
          progress = (groupChallenges / achievement.requiredScore) * 100;
          unlocked = groupChallenges >= achievement.requiredScore;
          break;
        }
      }
      
      return {
        id: achievement.id,
        earnedAt: unlocked ? new Date().toISOString() : undefined,
        progress: Math.min(progress, 100)
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
          source={{ uri: firebaseUser?.photoURL || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <ThemedText type="title">{firebaseUser?.displayName || 'Anonymous'}</ThemedText>
        <ThemedText style={styles.email}>{firebaseUser?.email}</ThemedText>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold">{stats.totalTokens}</ThemedText>
            <ThemedText>Tokens</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold">{stats.completedChallenges}</ThemedText>
            <ThemedText>Completed</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold">{Math.round(stats.successRate)}%</ThemedText>
            <ThemedText>Success Rate</ThemedText>
          </View>
        </View>
        
        <Button onPress={handleSignOut}>Sign Out</Button>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.section}
      >
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Achievements
        </ThemedText>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map((metadata) => {
            const achievement = stats.achievements.find(a => a.id === metadata.id);
            return (
              <TouchableOpacity
                key={metadata.id}
                style={[
                  styles.achievementCard,
                  { backgroundColor: colors.background }
                ]}
              >
                <IconSymbol
                  name={metadata.icon as SFSymbols6_0}
                  size={32}
                  color={achievement?.earnedAt ? colors.tint : colors.textDim}
                />
                <ThemedText type="defaultSemiBold" style={styles.achievementTitle}>
                  {metadata.title}
                </ThemedText>
                <ThemedText style={styles.achievementDescription}>
                  {metadata.description}
                </ThemedText>
                <ProgressBar
                  progress={achievement?.progress || 0}
                  height={4}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </AnimatedThemedView>

      <AnimatedThemedView
        entering={FadeInDown.delay(200).duration(500)}
        style={styles.section}
      >
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent Challenges
        </ThemedText>
        <View style={styles.challengesList}>
          {recentChallenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeCard,
                { backgroundColor: colors.background }
              ]}
              onPress={() => router.push(`/challenge/${challenge.id}`)}
            >
              <ThemedText type="defaultSemiBold" style={styles.challengeTitle}>
                {challenge.title}
              </ThemedText>
              <ThemedText style={styles.challengeDescription}>
                {challenge.description}
              </ThemedText>
              <View style={styles.challengeFooter}>
                <ThemedText style={styles.challengeType}>
                  {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
                </ThemedText>
                <ThemedText style={styles.challengeDate}>
                  {new Date(challenge.startDate).toLocaleDateString()}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  email: {
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  signOutButton: {
    marginTop: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  achievementTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  challengesList: {
    gap: 12,
  },
  challengeCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  challengeTitle: {
    fontSize: 16,
  },
  challengeDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  challengeType: {
    fontSize: 12,
    opacity: 0.7,
  },
  challengeDate: {
    fontSize: 12,
    opacity: 0.7,
  },
}); 