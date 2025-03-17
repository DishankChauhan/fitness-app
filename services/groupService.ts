import firestore from '@react-native-firebase/firestore';
import { ChallengeGroup, ChallengeInvite, ChallengeComment, Challenge, ChallengeVisibility } from '../types/challenge';
import { crashlytics } from '../config/firebase';
import * as authService from './authService';

class GroupService {
  private static instance: GroupService;

  private constructor() {}

  static getInstance(): GroupService {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService();
    }
    return GroupService.instance;
  }

  // Group Management
  async createGroup(name: string, description: string, visibility: ChallengeVisibility): Promise<ChallengeGroup> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const groupData: Omit<ChallengeGroup, 'id'> = {
        name,
        description,
        createdBy: user.id,
        members: [user.id],
        admins: [user.id],
        visibility,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const groupRef = await firestore().collection('groups').add(groupData);
      return { id: groupRef.id, ...groupData };
    } catch (error) {
      console.error('Error creating group:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  async getGroup(groupId: string): Promise<ChallengeGroup | null> {
    try {
      const groupDoc = await firestore().collection('groups').doc(groupId).get();
      if (!groupDoc.exists) return null;
      return { id: groupDoc.id, ...groupDoc.data() } as ChallengeGroup;
    } catch (error) {
      console.error('Error getting group:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  async updateGroup(groupId: string, updates: Partial<ChallengeGroup>): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const group = await this.getGroup(groupId);
      if (!group) throw new Error('Group not found');
      if (!group.admins.includes(user.id)) throw new Error('Not authorized');

      await firestore().collection('groups').doc(groupId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating group:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  // Membership Management
  async inviteToGroup(groupId: string, userId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const group = await this.getGroup(groupId);
      if (!group) throw new Error('Group not found');
      if (!group.admins.includes(user.id)) throw new Error('Not authorized');

      const invite: Omit<ChallengeInvite, 'id'> = {
        challengeId: '',
        groupId,
        invitedBy: user.id,
        invitedUser: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      await firestore().collection('invites').add(invite);
    } catch (error) {
      console.error('Error inviting to group:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  async respondToInvite(inviteId: string, accept: boolean): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const inviteRef = firestore().collection('invites').doc(inviteId);
      const invite = (await inviteRef.get()).data() as ChallengeInvite;

      if (!invite || invite.invitedUser !== user.id) throw new Error('Invalid invite');
      if (new Date(invite.expiresAt) < new Date()) throw new Error('Invite expired');

      await firestore().runTransaction(async transaction => {
        if (accept && invite.groupId) {
          const groupRef = firestore().collection('groups').doc(invite.groupId);
          const group = (await transaction.get(groupRef)).data() as ChallengeGroup;
          
          transaction.update(groupRef, {
            members: [...group.members, user.id],
            updatedAt: new Date().toISOString()
          });
        }

        transaction.update(inviteRef, {
          status: accept ? 'accepted' : 'declined',
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Error responding to invite:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  // Social Interactions
  async addComment(challengeId: string, content: string, parentId?: string): Promise<ChallengeComment> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const comment: Omit<ChallengeComment, 'id'> = {
        challengeId,
        userId: user.id,
        content,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likes: []
      };

      const commentRef = await firestore().collection('comments').add(comment);
      return { id: commentRef.id, ...comment };
    } catch (error) {
      console.error('Error adding comment:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  async toggleLike(commentId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const commentRef = firestore().collection('comments').doc(commentId);
      const comment = (await commentRef.get()).data() as ChallengeComment;

      const likes = comment.likes.includes(user.id)
        ? comment.likes.filter(id => id !== user.id)
        : [...comment.likes, user.id];

      await commentRef.update({ likes });
    } catch (error) {
      console.error('Error toggling like:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  // Group Challenges
  async createGroupChallenge(groupId: string, challenge: Omit<Challenge, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'status' | 'prizePool' | 'participants'>): Promise<Challenge> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const group = await this.getGroup(groupId);
      if (!group) throw new Error('Group not found');
      if (!group.members.includes(user.id)) throw new Error('Not a group member');

      const challengeData: Omit<Challenge, 'id'> = {
        ...challenge,
        groupId,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        prizePool: challenge.stake,
        participants: [user.id]
      };

      const challengeRef = await firestore().collection('challenges').add(challengeData);
      return { id: challengeRef.id, ...challengeData };
    } catch (error) {
      console.error('Error creating group challenge:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }

  async getGroupChallenges(groupId: string): Promise<Challenge[]> {
    try {
      const challengesSnapshot = await firestore()
        .collection('challenges')
        .where('groupId', '==', groupId)
        .orderBy('createdAt', 'desc')
        .get();

      return challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];
    } catch (error) {
      console.error('Error getting group challenges:', error);
      crashlytics.recordError(error as Error);
      throw error;
    }
  }
}

export const groupService = GroupService.getInstance(); 