import { authorize } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crashlytics } from '../config/firebase';

const FITBIT_CLIENT_ID = 'YOUR_FITBIT_CLIENT_ID';
const FITBIT_CLIENT_SECRET = 'YOUR_FITBIT_CLIENT_SECRET';

const config = {
  clientId: FITBIT_CLIENT_ID,
  clientSecret: FITBIT_CLIENT_SECRET,
  redirectUrl: 'accountabilityapp://oauth/fitbit',
  scopes: ['activity', 'heartrate', 'sleep'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://www.fitbit.com/oauth2/authorize',
    tokenEndpoint: 'https://api.fitbit.com/oauth2/token',
    revocationEndpoint: 'https://api.fitbit.com/oauth2/revoke'
  }
};

interface FitbitTokens {
  accessToken: string;
  refreshToken: string;
  expirationDate: string;
}

interface FitbitHealthData {
  calories: number;
  steps: number;
  activeMinutes: number;
  heartRate: number;
  sleepHours: number;
}

class FitbitService {
  private static instance: FitbitService;
  private tokens: FitbitTokens | null = null;

  private constructor() {
    this.loadTokens();
  }

  static getInstance(): FitbitService {
    if (!FitbitService.instance) {
      FitbitService.instance = new FitbitService();
    }
    return FitbitService.instance;
  }

  private async loadTokens() {
    try {
      const tokensStr = await AsyncStorage.getItem('fitbit_tokens');
      if (tokensStr) {
        this.tokens = JSON.parse(tokensStr);
      }
    } catch (error) {
      console.error('Error loading Fitbit tokens:', error);
      if (crashlytics) {
        crashlytics.recordError(error as Error);
      }
    }
  }

  private async saveTokens(tokens: FitbitTokens) {
    try {
      await AsyncStorage.setItem('fitbit_tokens', JSON.stringify(tokens));
      this.tokens = tokens;
    } catch (error) {
      console.error('Error saving Fitbit tokens:', error);
      if (crashlytics) {
        crashlytics.recordError(error as Error);
      }
    }
  }

  async authorize(): Promise<boolean> {
    try {
      const result = await authorize(config);
      await this.saveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expirationDate: result.accessTokenExpirationDate
      });
      return true;
    } catch (error) {
      console.error('Fitbit authorization error:', error);
      if (crashlytics) {
        crashlytics.recordError(error as Error);
      }
      return false;
    }
  }

  async refreshTokensIfNeeded(): Promise<boolean> {
    if (!this.tokens) return false;

    const expirationDate = new Date(this.tokens.expirationDate);
    if (expirationDate > new Date()) return true;

    try {
      const result = await authorize({
        ...config,
        dangerouslyAllowInsecureHttpRequests: true,
        additionalParameters: {
          refresh_token: this.tokens.refreshToken
        }
      });

      await this.saveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expirationDate: result.accessTokenExpirationDate
      });
      return true;
    } catch (error) {
      console.error('Fitbit token refresh error:', error);
      if (crashlytics) {
        crashlytics.recordError(error as Error);
      }
      return false;
    }
  }

  private async fetchFitbitData(endpoint: string): Promise<any> {
    if (!this.tokens || !(await this.refreshTokensIfNeeded())) {
      throw new Error('Not authenticated with Fitbit');
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Fitbit API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getHealthData(startDate: string, endDate: string): Promise<FitbitHealthData> {
    try {
      const [activities, heart, sleep] = await Promise.all([
        this.fetchFitbitData(`activities/date/${startDate}/${endDate}.json`),
        this.fetchFitbitData(`heart/date/${startDate}/${endDate}.json`),
        this.fetchFitbitData(`sleep/date/${startDate}/${endDate}.json`)
      ]);

      return {
        steps: activities.summary.steps || 0,
        activeMinutes: activities.summary.veryActiveMinutes || 0,
        heartRate: heart['activities-heart'][0]?.value?.restingHeartRate || 0,
        sleepHours: sleep.summary.totalTimeInBed / 60 || 0,
        calories: activities.summary.calories || 0
      };
    } catch (error) {
      console.error('Error fetching Fitbit health data:', error);
      if (crashlytics) {
        crashlytics.recordError(error as Error);
      }
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokens !== null && await this.refreshTokensIfNeeded();
  }

  async logout(): Promise<void> {
    this.tokens = null;
    await AsyncStorage.removeItem('fitbit_tokens');
  }
}

export const fitbitService = FitbitService.getInstance(); 