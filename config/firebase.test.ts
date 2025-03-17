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
import { jest } from '@jest/globals';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-auth-domain',
  projectId: 'test-project-id',
  storageBucket: 'test-storage-bucket',
  messagingSenderId: 'test-messaging-sender-id',
  appId: 'test-app-id',
  measurementId: 'test-measurement-id',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export const mockFirebaseUser: FirebaseAuthTypes.User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: false,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString()
  },
  providerData: [],
  providerId: 'firebase',
  refreshToken: 'test-refresh-token',
  tenantId: null,
  phoneNumber: null,
  photoURL: null,
  getIdToken: jest.fn().mockResolvedValue('test-id-token'),
  getIdTokenResult: jest.fn().mockResolvedValue({
    token: 'test-id-token',
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date().toISOString(),
    signInProvider: 'password',
    claims: {}
  }),
  reload: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnValue({})
};

export const mockUserDoc = {
  id: mockFirebaseUser.uid,
  email: mockFirebaseUser.email,
  displayName: mockFirebaseUser.displayName,
  tokens: 0,
  createdAt: new Date().toISOString()
};

export const mockAuth = {
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  currentUser: mockFirebaseUser,
  onAuthStateChanged: jest.fn()
} as unknown as FirebaseAuthTypes.Module;

export const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
} as unknown as FirebaseFirestoreTypes.Module;

jest.mock('@react-native-firebase/auth', () => () => mockAuth);
jest.mock('@react-native-firebase/firestore', () => () => mockFirestore);

// Export configured instances
export {
  app,
  auth,
  db,
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