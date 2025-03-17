import '@testing-library/jest-native/extend-expect';
import { jest, beforeEach } from '@jest/globals';
import { NativeModules } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Firebase Auth
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: null,
  updateProfile: jest.fn().mockImplementation(async (updates) => {
    mockUser.displayName = updates.displayName;
    return Promise.resolve();
  }),
};

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
    signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
    signOut: jest.fn().mockResolvedValue(mockUser),
    currentUser: mockUser,
  }),
}));

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ id: 'test-id' }),
        }),
      })),
    })),
  }),
}));

// Mock Firebase Crashlytics
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    recordError: jest.fn(),
  }),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  select: jest.fn(),
  OS: 'ios',
}));

// Mock AppleHealthKit
jest.mock('react-native-health', () => ({
  AppleHealthKit: {
    initHealthKit: jest.fn((options, callback) => callback(null, true)),
    getStepCount: jest.fn((options, callback) => callback(null, { value: 1000 })),
    getHeartRateSamples: jest.fn((options, callback) => callback(null, [{ value: 75 }])),
    getDistanceWalking: jest.fn((options, callback) => callback(null, { value: 2000 })),
    getActiveEnergyBurned: jest.fn((options, callback) => callback(null, { value: 500 })),
    getSleepSamples: jest.fn((options, callback) => callback(null, [{ value: 8 }])),
  },
}));

// Mock react-native-app-auth
jest.mock('react-native-app-auth', () => ({
  authorize: jest.fn(),
}));

// Mock Health Kit
jest.mock('react-native-health', () => ({
  AppleHealthKit: {
    initHealthKit: jest.fn((options, callback) => callback(null, true)),
    getStepCount: jest.fn((options, callback) => callback(null, { value: 10000 })),
    getHeartRateSamples: jest.fn((options, callback) => callback(null, [{ value: 75 }])),
    getSleepSamples: jest.fn((options, callback) => callback(null, [{ value: 8 }])),
    getDistanceWalking: jest.fn(),
    getActiveEnergyBurned: jest.fn(),
  },
}));

// Mock Health Connect
jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(() => Promise.resolve(true)),
  requestPermission: jest.fn(() => Promise.resolve(true)),
  readRecords: jest.fn(() => Promise.resolve([])),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        firebaseApiKey: 'test-api-key',
        firebaseAuthDomain: 'test-auth-domain',
        firebaseProjectId: 'test-project-id',
        firebaseStorageBucket: 'test-storage-bucket',
        firebaseMessagingSenderId: 'test-messaging-sender-id',
        firebaseAppId: 'test-app-id',
        firebaseMeasurementId: 'test-measurement-id',
      },
    },
  },
}));

// Mock Native Modules
NativeModules.HealthKitModule = {
  isAvailable: jest.fn(),
  requestPermissions: jest.fn(),
  getHealthData: jest.fn(),
};

NativeModules.HealthConnect = {
  isAvailable: jest.fn(),
  requestPermissions: jest.fn(),
  getHealthData: jest.fn(),
};

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockUser.displayName = null;
}); 