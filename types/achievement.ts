export type BadgeType = 
  | 'early_bird'
  | 'challenger'
  | 'consistent'
  | 'social'
  | 'overachiever'
  | 'elite'
  | 'mentor'
  | 'innovator';

export interface Achievement {
  id: BadgeType;
  earnedAt?: string;
  progress?: number;
}

export interface AchievementMetadata {
  id: BadgeType;
  title: string;
  description: string;
  icon: string;
  requiredScore: number;
} 