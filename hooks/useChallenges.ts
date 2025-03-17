import { useState, useEffect, useCallback } from 'react';
import { Challenge, UserChallenge } from '../types/challenge';
import { challengeService } from '../services/challengeService';

interface ChallengesState {
  active: UserChallenge[];
  available: Challenge[];
  completed: UserChallenge[];
  isLoading: boolean;
  error: string | null;
}

export function useChallenges() {
  const [state, setState] = useState<ChallengesState>({
    active: [],
    available: [],
    completed: [],
    isLoading: true,
    error: null
  });

  const fetchChallenges = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const challenges = await challengeService.getAllChallenges();
      setState(prev => ({ ...prev, ...challenges, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch challenges'
      }));
    }
  }, []);

  const joinChallenge = useCallback(async (challengeId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await challengeService.joinChallenge(challengeId);
      await fetchChallenges();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to join challenge'
      }));
    }
  }, [fetchChallenges]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await challengeService.leaveChallenge(challengeId);
      await fetchChallenges();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to leave challenge'
      }));
    }
  }, [fetchChallenges]);

  useEffect(() => {
    fetchChallenges();
    
    // Check for challenge completion every minute
    const interval = setInterval(async () => {
      await challengeService.checkChallengeCompletion();
      await fetchChallenges();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchChallenges]);

  return {
    ...state,
    refreshChallenges: fetchChallenges,
    joinChallenge,
    leaveChallenge
  };
} 