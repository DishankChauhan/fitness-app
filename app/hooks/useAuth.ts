import { useState, useEffect } from 'react';
import * as authService from '@/services/authService';
import type { UserProfile } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const user = await authService.signIn(email, password);
      setUser(user);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const user = await authService.signUp(email, password, displayName);
      setUser(user);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
      setUser(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
} 