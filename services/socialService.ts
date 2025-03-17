import { db } from '../config/firebase';
import * as authService from './authService';
import type { UserProfile } from './authService';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
}

export async function followUser(userIdToFollow: string): Promise<void> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  const followingRef = doc(db, 'following', currentUser.id, 'users', userIdToFollow);
  await setDoc(followingRef, {
    followedAt: new Date(),
    userId: userIdToFollow
  });
}

export async function unfollowUser(userIdToUnfollow: string): Promise<void> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  const followingRef = doc(db, 'following', currentUser.id, 'users', userIdToUnfollow);
  await deleteDoc(followingRef);
}

export async function getFollowing(): Promise<UserProfile[]> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) return [];

  const followingRef = collection(db, 'following', currentUser.id, 'users');
  const followingSnapshot = await getDocs(followingRef);

  const userIds = followingSnapshot.docs.map(doc => doc.data().userId);
  
  if (userIds.length === 0) return [];

  const usersQuery = query(
    collection(db, 'users'),
    where('id', 'in', userIds)
  );
  const usersSnapshot = await getDocs(usersQuery);

  return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function getLeaderboard(challengeId?: string): Promise<LeaderboardEntry[]> {
  let leaderboardQuery;
  
  if (challengeId) {
    leaderboardQuery = query(
      collection(db, 'userChallenges'),
      where('id', '==', challengeId),
      orderBy('progress', 'desc'),
      limit(100)
    );
  } else {
    leaderboardQuery = query(
      collection(db, 'users'),
      orderBy('tokens', 'desc'),
      limit(100)
    );
  }

  const snapshot = await getDocs(leaderboardQuery);

  return snapshot.docs.map((doc, index) => {
    const data = doc.data();
    return {
      userId: data.userId || data.id,
      displayName: data.displayName || 'Anonymous',
      score: challengeId ? data.progress : data.tokens,
      rank: index + 1
    };
  });
} 