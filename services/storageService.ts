import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityData, ACTIVITY_THRESHOLDS } from '../types/health';

const KEYS = {
  DAILY_STEPS: 'dailySteps',
  ACTIVITY_DATA: 'activityData',
  LAST_RESET_DATE: 'lastResetDate',
};

interface DailySteps {
  count: number;
  date: string;
}

interface DailyActivity {
  date: string;
  data: ActivityData[];
  activeMinutes: number;
  calories: number;
}

class StorageService {
  async getDailySteps(): Promise<DailySteps> {
    try {
      const data = await AsyncStorage.getItem(KEYS.DAILY_STEPS);
      return data ? JSON.parse(data) : { count: 0, date: new Date().toDateString() };
    } catch (error) {
      console.error('Failed to get daily steps:', error);
      return { count: 0, date: new Date().toDateString() };
    }
  }

  async getActivityData(): Promise<DailyActivity> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVITY_DATA);
      const today = new Date().toDateString();
      return data ? JSON.parse(data) : { 
        date: today,
        data: [],
        activeMinutes: 0,
        calories: 0
      };
    } catch (error) {
      console.error('Failed to get activity data:', error);
      return {
        date: new Date().toDateString(),
        data: [],
        activeMinutes: 0,
        calories: 0
      };
    }
  }

  async updateActivityData(newSteps: number): Promise<DailyActivity> {
    try {
      const activityData = await this.getActivityData();
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Get steps in the last minute
      const recentActivity = activityData.data.filter(a => a.timestamp > oneMinuteAgo);
      const stepsLastMinute = recentActivity.reduce((sum, a) => sum + a.steps, 0);

      // Determine if this minute was active
      const isActive = stepsLastMinute >= ACTIVITY_THRESHOLDS.STEPS_PER_MINUTE_ACTIVE;

      // Calculate calories for these steps
      const baseCalories = newSteps * ACTIVITY_THRESHOLDS.CALORIES_PER_STEP;
      const caloriesForMinute = isActive 
        ? baseCalories * ACTIVITY_THRESHOLDS.ACTIVE_CALORIES_MULTIPLIER 
        : baseCalories;

      // Update activity data
      const updatedData: DailyActivity = {
        date: new Date().toDateString(),
        data: [
          ...activityData.data.filter(a => a.timestamp > oneMinuteAgo),
          { timestamp: now, steps: newSteps, isActive }
        ],
        activeMinutes: isActive ? activityData.activeMinutes + 1 : activityData.activeMinutes,
        calories: activityData.calories + caloriesForMinute
      };

      await AsyncStorage.setItem(KEYS.ACTIVITY_DATA, JSON.stringify(updatedData));
      return updatedData;
    } catch (error) {
      console.error('Failed to update activity data:', error);
      throw error;
    }
  }

  async saveDailySteps(steps: number): Promise<void> {
    try {
      const data: DailySteps = {
        count: steps,
        date: new Date().toDateString()
      };
      await AsyncStorage.setItem(KEYS.DAILY_STEPS, JSON.stringify(data));
      await this.updateActivityData(steps);
    } catch (error) {
      console.error('Failed to save daily steps:', error);
    }
  }

  async resetIfNewDay(): Promise<void> {
    try {
      const { date } = await this.getDailySteps();
      const today = new Date().toDateString();
      if (date !== today) {
        await AsyncStorage.multiSet([
          [KEYS.DAILY_STEPS, JSON.stringify({ count: 0, date: today })],
          [KEYS.ACTIVITY_DATA, JSON.stringify({ 
            date: today,
            data: [],
            activeMinutes: 0,
            calories: 0
          })]
        ]);
      }
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  }
}

export const storageService = new StorageService(); 