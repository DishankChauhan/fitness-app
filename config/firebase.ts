import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference,
  CollectionReference,
  WriteBatch,
  runTransaction,
  Transaction,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Analytics, getAnalytics, logEvent } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import Constants from 'expo-constants';
import { FirebaseCrashlyticsTypes, getCrashlytics } from '@react-native-firebase/crashlytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ErrorUtils } from 'react-native';

const isTestEnvironment = process.env.NODE_ENV === 'test';

const firebaseConfig = isTestEnvironment ? {
  apiKey: 'test-api-key',
  authDomain: 'test-app.firebaseapp.com',
  projectId: 'test-project-id',
  storageBucket: 'test-storage-bucket',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
  measurementId: 'G-TEST123456'
} : {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

if (!isTestEnvironment && !process.env.FIREBASE_API_KEY) {
  throw new Error('Firebase configuration is missing. Please check your environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics and Performance if not in development
const analytics = !__DEV__ ? getAnalytics(app) : null;
const perf = !__DEV__ ? getPerformance(app) : null;

// Initialize Crashlytics only in non-test environment
let crashlytics: FirebaseCrashlyticsTypes.Module | null = null;
if (!isTestEnvironment) {
  crashlytics = getCrashlytics();
  // Enable Crashlytics debug mode in development
  if (__DEV__) {
    crashlytics.setCrashlyticsCollectionEnabled(true);
  }
}

// Enable Performance Monitoring in production only
if (perf) {
  perf.instrumentationEnabled = !__DEV__;
  perf.dataCollectionEnabled = !__DEV__;
}

// Log app start to analytics
if (analytics) {
  (analytics as any).logEvent('app_start', {
    platform: Platform.OS,
    version: process.env.APP_VERSION || 'unknown'
  });
}

// Error boundary for uncaught errors
const errorHandler = (error: Error, isFatal?: boolean) => {
  if (crashlytics) {
    crashlytics.recordError(error);
  }
  if (analytics) {
    logEvent(analytics, 'app_error', {
      error: error.message,
      isFatal: isFatal || false
    });
  }
};
// Set up error handlers
if (!__DEV__) {
  ErrorUtils.setGlobalHandler(errorHandler);
}

// Helper function to safely log analytics events
export function logAnalyticsEvent(eventName: string, params?: Record<string, any>) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}

// Export configured instances
export {
  app,
  auth,
  db,
  analytics,
  crashlytics,
  perf,
  errorHandler,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference,
  CollectionReference,
  WriteBatch,
  runTransaction,
  Transaction,
  writeBatch,
}; 