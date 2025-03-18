import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type ChallengeType = 'steps' | 'activeMinutes' | 'heartRate' | 'sleepHours';

export type ChallengeVisibility = 'public' | 'private' | 'invite_only';

export type ChallengeStatus = 'active' | 'completed' | 'cancelled';

export type ChallengeCategory = 'fitness' | 'wellness' | 'productivity' | 'social' | 'custom';

export interface ChallengeGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  participants: string[];
  maxParticipants: number;
  challengeId: string;
  admins: string[];
  visibility: ChallengeVisibility;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  startDate: string;
  endDate: string;
  target: number;
  stake: number;
  prizePool: number;
  participants: string[];
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
  groupId?: string; // Reference to ChallengeGroup if it's a group challenge
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rules?: {
    minParticipants?: number;
    maxParticipants?: number;
    allowLateJoin?: boolean;
    requireVerification?: boolean;
  };
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  groupId?: string;
  invitedBy: string;
  invitedUser: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
}

export interface ChallengeComment {
  id: string;
  challengeId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  parentId?: string; // For nested comments
}

export interface ChallengeMilestone {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  target: number;
  reward?: number;
  achievedBy: string[];
  createdAt: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  progress: number;
}

export interface UserChallenge {
  id: string;
  userId: string;
  type: ChallengeType;
  goal: number;
  progress: number;
  displayName: string;
  status: ChallengeStatus;
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  lastCheckIn: FirebaseFirestoreTypes.Timestamp | null;
  stake: number;
  groupId?: string;
  isGroupChallenge?: boolean;
  rank?: number;
  isCompleted?: boolean;
}

export interface ChallengeFilters {
  type?: ChallengeType;
  status?: Challenge['status'];
  startDate?: string;
  endDate?: string;
} 