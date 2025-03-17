import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crashlytics } from '../config/firebase';
import { fitbitService } from './fitbitService';
import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './authService';

const HEALTH_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const HEALTH_DATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEYS = {
  LAST_SYNC: 'health_last_sync',
  CACHED_DATA: 'health_cached_data',
  PROVIDER: 'health_provider' // 'healthkit', 'fitbit', or 'healthconnect'
};

export interface HealthData {
  steps: number;
  activeMinutes: number;
  heartRate: number;
  sleepHours: number;
  timestamp: number;
}

class HealthService {
  private static instance: HealthService;
  private initialized: boolean = false;
  private provider: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly healthCollection = firestore().collection('health');
  private readonly CACHE_KEY = 'health_data_cache';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.loadProvider();
    this.startSyncInterval();
  }

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  private async loadProvider() {
    try {
      this.provider = await AsyncStorage.getItem(STORAGE_KEYS.PROVIDER);
    } catch (error) {
      console.error('Error loading health provider:', error);
      crashlytics.recordError(error as Error);
    }
  }

  private async saveProvider(provider: string) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
      this.provider = provider;
    } catch (error) {
      console.error('Error saving health provider:', error);
      crashlytics.recordError(error as Error);
    }
  }

  private startSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(async () => {
      try {
        const data = await this.getHealthData();
        if (data) {
          await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(data));
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
        }
      } catch (error) {
        console.error('Error in health sync interval:', error);
        crashlytics.recordError(error as Error);
      }
    }, HEALTH_SYNC_INTERVAL);
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.initialized) return true;

      // Check available providers
      if (Platform.OS === 'ios') {
        const isHealthKitAvailable = await NativeModules.HealthKitModule?.isAvailable();
        if (isHealthKitAvailable) {
          await this.saveProvider('healthkit');
          this.initialized = true;
          return true;
        }
      } else if (Platform.OS === 'android') {
        const isHealthConnectAvailable = await NativeModules.HealthConnect?.isAvailable();
        if (isHealthConnectAvailable) {
          await this.saveProvider('healthconnect');
          this.initialized = true;
          return true;
        }
      }

      // Try Fitbit as fallback
      const isFitbitAuthenticated = await fitbitService.isAuthenticated();
      if (isFitbitAuthenticated) {
        await this.saveProvider('fitbit');
        this.initialized = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing health service:', error);
      crashlytics.recordError(error as Error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.provider) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      switch (this.provider) {
        case 'healthkit':
          return await NativeModules.HealthKitModule?.requestPermissions() || false;
        case 'healthconnect':
          return await NativeModules.HealthConnect?.requestPermissions() || false;
        case 'fitbit':
          return await fitbitService.authorize();
        default:
          return false;
      }
    } catch (error) {
      console.error('Error requesting health permissions:', error);
      crashlytics.recordError(error as Error);
      return false;
    }
  }

  async getHealthData(): Promise<HealthData | null> {
    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_DATA);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < HEALTH_DATA_CACHE_TTL) {
          return parsed;
        }
      }

      if (!this.provider) {
        const initialized = await this.initialize();
        if (!initialized) return null;
      }

      const now = Date.now();
      const startTime = now - (24 * 60 * 60 * 1000); // Last 24 hours

      let data: HealthData | null = null;

      switch (this.provider) {
        case 'healthkit':
          const healthKitData = await NativeModules.HealthKitModule?.getHealthData(startTime, now);
          if (healthKitData) {
            data = {
              ...healthKitData,
              timestamp: now
            };
          }
          break;

        case 'healthconnect':
          const healthConnectData = await NativeModules.HealthConnect?.getHealthData(startTime, now);
          if (healthConnectData) {
            data = {
              ...healthConnectData,
              timestamp: now
            };
          }
          break;

        case 'fitbit':
          const startDate = new Date(startTime).toISOString().split('T')[0];
          const endDate = new Date(now).toISOString().split('T')[0];
          const fitbitData = await fitbitService.getHealthData(startDate, endDate);
          if (fitbitData) {
            data = {
              ...fitbitData,
              timestamp: now
            };
          }
          break;
      }

      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      console.error('Error getting health data:', error);
      crashlytics.recordError(error as Error);
      return null;
    }
  }

  async changeProvider(provider: 'healthkit' | 'healthconnect' | 'fitbit'): Promise<boolean> {
    try {
      let success = false;

      switch (provider) {
        case 'healthkit':
          if (Platform.OS !== 'ios') return false;
          success = await NativeModules.HealthKitModule?.isAvailable() || false;
          break;

        case 'healthconnect':
          if (Platform.OS !== 'android') return false;
          success = await NativeModules.HealthConnect?.isAvailable() || false;
          break;

        case 'fitbit':
          success = await fitbitService.authorize();
          break;
      }

      if (success) {
        await this.saveProvider(provider);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error changing health provider:', error);
      crashlytics.recordError(error as Error);
      return false;
    }
  }

  getProvider(): string | null {
    return this.provider;
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncHealthData(): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const docRef = this.healthCollection.doc(currentUser.id);
      const doc = await docRef.get();

      if (doc.exists) {
        const { lastSync } = doc.data() as { lastSync: string };
        const age = Date.now() - new Date(lastSync).getTime();
        if (age < HEALTH_SYNC_INTERVAL) {
          return; // Skip sync if too recent
        }
      }

      const healthData = await this.getHealthData();
      await docRef.set({
        data: healthData,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to sync health data:', error);
      throw error;
    }
  }
}

export const healthService = HealthService.getInstance();