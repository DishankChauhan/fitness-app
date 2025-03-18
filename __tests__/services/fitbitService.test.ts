/// <reference types="jest" />
import { authorize } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fitbitService } from '../../services/fitbitService';
import firestore from '@react-native-firebase/firestore';
import * as authService from '../../services/authService';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';
import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-app-auth', () => ({
  authorize: jest.fn(),
  refresh: jest.fn()
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('../../services/authService');

jest.mock('@react-native-firebase/crashlytics', () => ({
  default: () => ({
    recordError: jest.fn(),
  }),
}));

describe('FitbitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('should authorize successfully', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenExpirationDate: '2025-03-17T18:35:01.262Z',
        tokenType: 'Bearer',
        scopes: ['activity', 'heartrate', 'sleep'],
      };

      (authorize as jest.Mock).mockResolvedValue(mockTokens);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await fitbitService.authorize();

      expect(result).toBe(true);
      expect(authorize).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'fitbit_tokens',
        JSON.stringify(mockTokens)
      );
    });

    it('should handle authorization failure', async () => {
      const error = new Error('Authorization failed');
      (authorize as jest.Mock).mockRejectedValue(error);

      const result = await fitbitService.authorize();

      expect(result).toBe(false);
      expect(crashlytics().recordError).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshTokensIfNeeded', () => {
    it('should not refresh if tokens are valid', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenExpirationDate: '2025-03-17T18:35:01.262Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockTokens));

      await fitbitService.refreshTokensIfNeeded();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('fitbit_tokens');
      expect(authorize).not.toHaveBeenCalled();
    });

    it('should refresh tokens if expired', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenExpirationDate: '2020-01-01T00:00:00.000Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockTokens));
      (authorize as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpirationDate: '2025-03-17T18:35:01.262Z',
      });

      await fitbitService.refreshTokensIfNeeded();

      expect(authorize).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'fitbit_tokens',
        expect.any(String)
      );
    });

    it('should handle refresh failure', async () => {
      const error = new Error('Refresh failed');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

      const result = await fitbitService.refreshTokensIfNeeded();

      expect(result).toBe(false);
      expect(crashlytics().recordError).toHaveBeenCalledWith(error);
    });
  });

  describe('getHealthData', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenExpirationDate: '2025-03-17T18:35:01.262Z',
      }));
    });

    it('should fetch health data successfully', async () => {
      const mockResponse = {
        steps: 1000,
        heartRate: 75,
        sleep: 8,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fitbitService.getHealthData('2024-03-17', '2024-03-17');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(fitbitService.getHealthData('2024-03-17', '2024-03-17')).rejects.toThrow('Fitbit API error: Unauthorized');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });
}); 