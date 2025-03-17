export type ChallengeType = 'steps' | 'activeMinutes' | 'sleep';

export type ChallengeVisibility = 'public' | 'private' | 'invite_only';

export interface ChallengeGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
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
  status: 'active' | 'completed' | 'cancelled';
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

export interface UserChallenge extends Challenge {
  progress: number;
  userId: string;
  displayName: string;
  rank?: number;
  isCompleted?: boolean;
}

export interface ChallengeFilters {
  type?: ChallengeType;
  status?: Challenge['status'];
  startDate?: string;
  endDate?: string;
} 