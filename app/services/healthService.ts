import { HealthData } from '../types/health';
import { Pedometer } from 'expo-sensors';

class HealthService {
  async initialize(): Promise<boolean> {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      return isAvailable;
    } catch (error) {
      console.error('Failed to initialize pedometer:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await Pedometer.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('Failed to request pedometer permissions:', error);
      throw error;
    }
  }

  async getHealthData(): Promise<HealthData> {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const { steps } = await Pedometer.getStepCountAsync(start, end);
      
      return {
        steps,
        activeMinutes: 0, // Not available with basic pedometer
        calories: 0 // Not available with basic pedometer
      };
    } catch (error) {
      console.error('Failed to fetch pedometer data:', error);
      throw error;
    }
  }
}

export const healthService = new HealthService(); 