/// <reference types="jest" />
import { Platform } from 'react-native';
import '@testing-library/jest-native/extend-expect';
import { healthService } from '../../services/healthService';
import RNHealth from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crashlytics from '@react-native-firebase/crashlytics';
import firestore from '@react-native-firebase/firestore';
import * as authService from '../../services/authService';

describe('HealthService', () => {
  const mockHealthData = {
    steps: 1000,
    heartRate: 75,
    distance: 2000,
    calories: 500,
    sleep: 8,
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform.select as jest.Mock).mockReturnValue('ios');
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('initialize', () => {
    it('should initialize health service successfully', async () => {
      const result = await healthService.initialize();
      expect(result).toBe(true);
      expect(RNHealth.initHealthKit).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });
    it('should handle initialization failure gracefully', async () => {
      (RNHealth.initHealthKit as jest.Mock).mockImplementation((options, callback) => {
        callback(new Error('Failed to initialize'), false);
      });

      const result = await healthService.initialize();

      expect(result).toBe(false);
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('requestPermissions', () => {
    it('should request permissions successfully', async () => {
      const result = await healthService.requestPermissions();
      expect(result).toBe(true);
      expect(RNHealth.initHealthKit).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });
    it('should handle permission denial', async () => {
      (RNHealth.initHealthKit as jest.Mock).mockImplementation((options, callback) => {
        callback(new Error('Permission denied'), false);
      });

      const result = await healthService.requestPermissions();

      expect(result).toBe(false);
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('getHealthData', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('should fetch new data if cache is missing', async () => {
      const result = await healthService.getHealthData();
      expect(result).toEqual(mockHealthData);
      expect(RNHealth.getStepCount).toHaveBeenCalled();
      expect(RNHealth.getHeartRateSamples).toHaveBeenCalled();
      expect(RNHealth.getDistanceCycling).toHaveBeenCalled();
      expect(RNHealth.getActiveEnergyBurned).toHaveBeenCalled();
      expect(RNHealth.getSleepSamples).toHaveBeenCalled();
    });

    it('should return cached health data if valid', async () => {
      const cachedData = {
        data: mockHealthData,
        timestamp: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await healthService.getHealthData();
      expect(result).toEqual(mockHealthData);
      expect(RNHealth.getStepCount).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching health data', async () => {
      (RNHealth.getStepCount as jest.Mock).mockImplementation((options, callback) => {
        callback(new Error('Failed to fetch data'), null);
      });

      await expect(healthService.getHealthData()).rejects.toThrow('Failed to fetch data');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('syncHealthData', () => {
    it('should sync health data successfully', async () => {
      const docRef = {
        set: jest.fn().mockResolvedValue(undefined),
      };
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(docRef),
      });

      await healthService.syncHealthData();

      expect(docRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockHealthData,
          lastSynced: expect.any(String),
        })
      );
    });

    it('should not sync if last sync was recent', async () => {
      const recentSync = new Date(Date.now() - 1000 * 60 * 10).toISOString(); // 10 minutes ago
      const docRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            lastSynced: recentSync,
          }),
        }),
      };
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(docRef),
      });

      await healthService.syncHealthData();
      expect(docRef.get).toHaveBeenCalled();
      expect(RNHealth.getStepCount).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const error = new Error('Failed to sync health data');
      (firestore().collection as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(healthService.syncHealthData()).rejects.toThrow(error);
      expect(crashlytics().recordError).toHaveBeenCalledWith(error);
    });
  });
}); 