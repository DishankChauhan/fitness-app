import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayProgress, UserSettings } from '../types';

const SETTINGS_STORAGE_KEY = '@accountability_app_settings';
const PROGRESS_STORAGE_KEY = '@accountability_app_progress';

const DEFAULT_SETTINGS: UserSettings = {
  dailyTaskGoal: 3,
  streakCount: 0,
};

export function useProgress() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [todayProgress, setTodayProgress] = useState<DayProgress>({
    date: new Date(),
    tasksCompleted: 0,
    totalTasks: 0,
    streakMaintained: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings and progress
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedSettings, storedProgress] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
        AsyncStorage.getItem(PROGRESS_STORAGE_KEY),
      ]);

      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          lastCompletedDate: parsedSettings.lastCompletedDate ? new Date(parsedSettings.lastCompletedDate) : undefined,
        });
      }

      if (storedProgress) {
        const progress = JSON.parse(storedProgress);
        const today = new Date().toDateString();
        const progressDate = new Date(progress.date).toDateString();
        
        if (today === progressDate) {
          setTodayProgress({
            ...progress,
            date: new Date(progress.date),
          });
        }
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveProgress = async (progress: DayProgress) => {
    try {
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      setTodayProgress(progress);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const updateProgress = useCallback((completedTasks: number, totalTasks: number) => {
    const today = new Date();
    const lastCompleted = settings.lastCompletedDate;
    const isYesterday = lastCompleted && 
      new Date(lastCompleted.getTime() + 24 * 60 * 60 * 1000).toDateString() === today.toDateString();
    
    const streakMaintained = completedTasks >= settings.dailyTaskGoal;
    let newStreakCount = settings.streakCount;

    if (streakMaintained) {
      if (!lastCompleted || isYesterday) {
        newStreakCount += 1;
      }
    } else {
      newStreakCount = 0;
    }

    const newProgress: DayProgress = {
      date: today,
      tasksCompleted: completedTasks,
      totalTasks,
      streakMaintained,
    };

    const newSettings: UserSettings = {
      ...settings,
      streakCount: newStreakCount,
      lastCompletedDate: streakMaintained ? today : settings.lastCompletedDate,
    };

    saveProgress(newProgress);
    saveSettings(newSettings);
  }, [settings]);

  const updateDailyGoal = useCallback((goal: number) => {
    saveSettings({ ...settings, dailyTaskGoal: goal });
  }, [settings]);

  return {
    settings,
    todayProgress,
    isLoading,
    updateProgress,
    updateDailyGoal,
  };
} 