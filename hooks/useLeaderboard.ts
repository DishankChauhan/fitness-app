import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank?: number;
}

export function useLeaderboard(challengeId: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLeaderboard() {
      try {
        setIsLoading(true);
        setError(null);

        const userChallengesRef = collection(db, 'userChallenges');
        const q = query(
          userChallengesRef,
          where('challengeId', '==', challengeId),
          orderBy('progress', 'desc')
        );

        const snapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = [];

        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          entries.push({
            userId: data.userId,
            displayName: data.displayName || 'Anonymous',
            score: data.progress || 0,
            rank: index + 1,
          });
        });

        if (isMounted) {
          setLeaderboard(entries);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (challengeId) {
      fetchLeaderboard();
    }

    return () => {
      isMounted = false;
    };
  }, [challengeId]);

  return {
    leaderboard,
    isLoading,
    error,
  };
} 