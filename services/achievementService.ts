import { BadgeType } from '@/components/ui/Badge';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';

interface Achievement {
  id: BadgeType;
  earnedAt: string;
  progress?: number;
}

interface UserData extends FirebaseFirestoreTypes.DocumentData {
  achievements?: Achievement[];
  stats?: {
    firstJoins: number;
    challengesCompleted: number;
    longestStreak: number;
    socialInteractions: number;
    goalsExceeded: number;
    topPerformer: boolean;
    helpfulResponses: number;
    popularChallenges: number;
  };
}

class AchievementService {
  private static instance: AchievementService;
  private readonly achievementsCollection = 'achievements';

  private constructor() {}

  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const doc = await firestore().collection('users').doc(userId).get();
      const userData = doc.data() as UserData;
      return userData?.achievements || [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  async awardAchievement(userId: string, achievementId: BadgeType) {
    try {
      const userRef = firestore().collection('users').doc(userId);
      const doc = await userRef.get();
      const userData = doc.data() as UserData;
      const existingAchievements = userData?.achievements || [];

      // Check if achievement already exists
      if (existingAchievements.some((a: Achievement) => a.id === achievementId)) {
        return;
      }

      const newAchievement: Achievement = {
        id: achievementId,
        earnedAt: new Date().toISOString()
      };

      await userRef.update({
        achievements: [...existingAchievements, newAchievement]
      });

      return newAchievement;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      throw error;
    }
  }

  async updateAchievementProgress(userId: string, achievementId: BadgeType, progress: number) {
    try {
      const userRef = firestore().collection('users').doc(userId);
      const doc = await userRef.get();
      const userData = doc.data() as UserData;
      const achievements = userData?.achievements || [];

      const achievementIndex = achievements.findIndex((a: Achievement) => a.id === achievementId);
      if (achievementIndex === -1) {
        achievements.push({
          id: achievementId,
          earnedAt: new Date().toISOString(),
          progress
        });
      } else {
        achievements[achievementIndex].progress = progress;
      }

      await userRef.update({ achievements });
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      throw error;
    }
  }

  async checkAndAwardAchievements(userId: string) {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const achievements = await this.getUserAchievements(userId);
      interface UserStats {
        firstJoins?: number;
        challengesCompleted?: number;
        longestStreak?: number;
        socialInteractions?: number;
        goalsExceeded?: number;
        topPerformer?: boolean;
        helpfulResponses?: number;
        popularChallenges?: number;
      }
      const stats: UserStats = user.stats || {};
      // Early Bird - First to join challenges
      if ((stats.firstJoins ?? 0) >= 3 && !this.hasAchievement(achievements, 'early_bird')) {
        await this.awardAchievement(userId, 'early_bird');
      }
      // Challenger - Completed 5 challenges
      if ((stats.challengesCompleted ?? 0) >= 5 && !this.hasAchievement(achievements, 'challenger')) {
        await this.awardAchievement(userId, 'challenger');
      }
      // Consistent - Maintained streak for 7 days
      if ((stats.longestStreak ?? 0) >= 7 && !this.hasAchievement(achievements, 'consistent')) {
        await this.awardAchievement(userId, 'consistent');
      }
      // Social - Active in community
      if ((stats.socialInteractions ?? 0) >= 20 && !this.hasAchievement(achievements, 'social')) {
        await this.awardAchievement(userId, 'social');
      }
      // Overachiever - Exceeded challenge goals
      if ((stats.goalsExceeded ?? 0) >= 10 && !this.hasAchievement(achievements, 'overachiever')) {
        await this.awardAchievement(userId, 'overachiever');
      }

      // Elite - Top 10% in challenges
      if (stats.topPerformer && !this.hasAchievement(achievements, 'elite')) {
        await this.awardAchievement(userId, 'elite');
      }
      // Mentor - Helped others
      if ((stats.helpfulResponses ?? 0) >= 15 && !this.hasAchievement(achievements, 'mentor')) {
        await this.awardAchievement(userId, 'mentor');
      }
      // Innovator - Created popular challenges
      if ((stats.popularChallenges ?? 0) >= 3 && !this.hasAchievement(achievements, 'innovator')) {
        await this.awardAchievement(userId, 'innovator');
      }

      // Legend - All achievements unlocked
      const hasAllOtherAchievements = ['early_bird', 'challenger', 'consistent', 'social', 
        'overachiever', 'pioneer', 'elite', 'mentor', 'innovator']
        .every(id => this.hasAchievement(achievements, id as BadgeType));

      if (hasAllOtherAchievements && !this.hasAchievement(achievements, 'legend')) {
        await this.awardAchievement(userId, 'legend');
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  private hasAchievement(achievements: Achievement[], id: BadgeType): boolean {
    return achievements.some((a: Achievement) => a.id === id);
  }
}

export const achievementService = AchievementService.getInstance(); 