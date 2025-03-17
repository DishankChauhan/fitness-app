export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  tokens: number;
  challenges: string[];
  achievements: string[];
  stats: {
    completedChallenges: number;
    totalSteps: number;
    activeDays: number;
    streak: number;
  };
}

export interface UserSettings {
  userId: string;
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string;
    challengeUpdates: boolean;
    achievementAlerts: boolean;
  };
  privacy: {
    showProgress: boolean;
    showActivity: boolean;
    publicProfile: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  healthIntegration: {
    provider: 'healthkit' | 'healthconnect' | 'fitbit' | null;
    lastSync: string | null;
    syncInterval: number;
  };
}

export interface UserStats {
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