import { auth, db } from '../config/firebase';
import * as authService from './authService';
import type { UserProfile } from '../types/user';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL?: string;
  stats: {
    completedChallenges: number;
    totalTokens: number;
    successRate: number;
  };
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Date;
}

class SocialService {
  private async ensureAuthenticated(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }
    return user.uid;
  }

  async getLeaderboard(limitCount: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const usersRef = collection(db, 'users');
      const leaderboardQuery = query(
        usersRef,
        orderBy('stats.totalTokens', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(leaderboardQuery);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        stats: {
          completedChallenges: doc.data().stats.completedChallenges,
          totalTokens: doc.data().stats.totalTokens,
          successRate: doc.data().stats.successRate,
        },
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getFriends(): Promise<UserProfile[]> {
    const userId = await this.ensureAuthenticated();

    try {
      const friendshipsRef = collection(db, 'friendships');
      const friendshipsQuery = query(
        friendshipsRef,
        where('userId', '==', userId)
      );

      const friendshipsSnapshot = await getDocs(friendshipsQuery);
      const friendIds = friendshipsSnapshot.docs.map(doc => doc.data().friendId);

      if (friendIds.length === 0) {
        return [];
      }

      const usersRef = collection(db, 'users');
      const friendsQuery = query(
        usersRef,
        where('id', 'in', friendIds)
      );

      const friendsSnapshot = await getDocs(friendsQuery);
      return friendsSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      } as UserProfile));
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  async sendFriendRequest(targetUserId: string): Promise<{ success: boolean; requestId: string }> {
    const userId = await this.ensureAuthenticated();

    try {
      const targetUserRef = doc(db, 'users', targetUserId);
      const targetUserDoc = await getDoc(targetUserRef);
      if (!targetUserDoc.exists()) {
        throw new Error('User not found');
      }

      const requestsRef = collection(db, 'friendRequests');
      const existingRequestQuery = query(
        requestsRef,
        where('senderId', '==', userId),
        where('receiverId', '==', targetUserId),
        where('status', '==', 'pending')
      );

      const existingRequest = await getDocs(existingRequestQuery);
      if (!existingRequest.empty) {
        throw new Error('Friend request already sent');
      }

      const request: Omit<FriendRequest, 'id'> = {
        senderId: userId,
        receiverId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      const requestRef = await addDoc(requestsRef, request);

      return {
        success: true,
        requestId: requestRef.id,
      };
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: string): Promise<{ success: boolean; friendshipId: string }> {
    const userId = await this.ensureAuthenticated();

    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const request = requestDoc.data() as FriendRequest;

      if (request.receiverId !== userId) {
        throw new Error('Not authorized to accept this request');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      await updateDoc(requestRef, { status: 'accepted' });

      const friendshipsRef = collection(db, 'friendships');
      const friendship1: Omit<Friendship, 'id'> = {
        userId: request.senderId,
        friendId: request.receiverId,
        createdAt: new Date(),
      };

      const friendship2: Omit<Friendship, 'id'> = {
        userId: request.receiverId,
        friendId: request.senderId,
        createdAt: new Date(),
      };

      const [friendshipRef] = await Promise.all([
        addDoc(friendshipsRef, friendship1),
        addDoc(friendshipsRef, friendship2),
      ]);

      return {
        success: true,
        friendshipId: friendshipRef.id,
      };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    const userId = await this.ensureAuthenticated();

    try {
      const requestsRef = collection(db, 'friendRequests');
      const requestsQuery = query(
        requestsRef,
        where('receiverId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      } as FriendRequest));
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      throw error;
    }
  }

  async unfriend(friendId: string): Promise<{ success: boolean }> {
    const userId = await this.ensureAuthenticated();

    try {
      const friendshipsRef = collection(db, 'friendships');
      const friendshipsQuery = query(
        friendshipsRef,
        where('userId', 'in', [userId, friendId]),
        where('friendId', 'in', [userId, friendId])
      );

      const friendshipsSnapshot = await getDocs(friendshipsQuery);
      const batch = writeBatch(db);
      
      friendshipsSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error unfriending user:', error);
      throw error;
    }
  }

  async followUser(userIdToFollow: string): Promise<void> {
    const userId = await this.ensureAuthenticated();

    const followingRef = doc(db, 'following', userId, 'users', userIdToFollow);
    await setDoc(followingRef, {
      followedAt: new Date(),
      userId: userIdToFollow
    });
  }

  async unfollowUser(userIdToUnfollow: string): Promise<void> {
    const userId = await this.ensureAuthenticated();

    const followingRef = doc(db, 'following', userId, 'users', userIdToUnfollow);
    await deleteDoc(followingRef);
  }

  async getFollowing(): Promise<UserProfile[]> {
    const userId = await this.ensureAuthenticated();

    const followingRef = collection(db, 'following', userId, 'users');
    const followingSnapshot = await getDocs(followingRef);

    const userIds = followingSnapshot.docs.map(doc => doc.data().userId);
    
    if (userIds.length === 0) return [];

    const usersQuery = query(
      collection(db, 'users'),
      where('id', 'in', userIds)
    );
    const usersSnapshot = await getDocs(usersQuery);

    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as UserProfile));
  }
}

export const socialService = new SocialService(); 
