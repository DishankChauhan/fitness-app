/// <reference types="jest" />
import { jest } from '@jest/globals';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import * as authService from '../../services/authService';
import { mockAuth, mockFirestore, mockFirebaseUser, mockUserDoc } from '../../config/firebase.test';

jest.mock('@react-native-firebase/auth', () => jest.fn(() => mockAuth));
jest.mock('@react-native-firebase/firestore', () => jest.fn(() => mockFirestore));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user successfully', async () => {
      const createUserMock = jest.fn<() => Promise<FirebaseAuthTypes.UserCredential>>().mockResolvedValue({ user: mockFirebaseUser } as FirebaseAuthTypes.UserCredential);
      const setDocMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (mockAuth.createUserWithEmailAndPassword as jest.Mock) = createUserMock;
      (mockFirestore.collection('users').doc(mockFirebaseUser.uid).set as jest.Mock) = setDocMock;

      const result = await authService.signUp(
        mockUserDoc.email!,
        'password123',
        mockUserDoc.displayName!
      );

      expect(createUserMock).toHaveBeenCalledWith(mockUserDoc.email!, 'password123');
      expect(setDocMock).toHaveBeenCalledWith(expect.objectContaining({
        email: mockUserDoc.email!,
        displayName: mockUserDoc.displayName!,
        tokens: 0
      }));
      expect(result).toEqual(mockFirebaseUser);
    });

    it('should handle signup errors', async () => {
      const error = new Error('Email already in use') as unknown as never;
      (mockAuth.createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      await expect(authService.signUp(
        mockUserDoc.email!,
        'password123',
        mockUserDoc.displayName!
      )).rejects.toThrow(error);
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const signInMock = jest.fn<() => Promise<FirebaseAuthTypes.UserCredential>>().mockResolvedValue({ user: mockFirebaseUser } as FirebaseAuthTypes.UserCredential);
      const getDocMock = jest.fn<() => Promise<FirebaseFirestoreTypes.DocumentSnapshot>>().mockResolvedValue({
        exists: true,
        data: () => mockUserDoc,
        id: mockFirebaseUser.uid,
        metadata: {} as FirebaseFirestoreTypes.SnapshotMetadata,
        ref: {} as FirebaseFirestoreTypes.DocumentReference,
        get: jest.fn(),
        isEqual: jest.fn()
      } as unknown as FirebaseFirestoreTypes.DocumentSnapshot);
      (mockAuth.signInWithEmailAndPassword as jest.Mock) = signInMock;
      (mockFirestore.collection('users').doc(mockFirebaseUser.uid).get as jest.Mock) = getDocMock;

      const result = await authService.signIn(mockUserDoc.email!, 'password123');

      expect(signInMock).toHaveBeenCalledWith(mockUserDoc.email!, 'password123');
      expect(getDocMock).toHaveBeenCalled();
      expect(result).toEqual(mockUserDoc);
    });

    it('should handle signin errors', async () => {
      const error = new Error('Invalid credentials') as unknown as never;
      (mockAuth.signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      await expect(authService.signIn(
        mockUserDoc.email!,
        'password123'
      )).rejects.toThrow(error);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const signOutMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (mockAuth.signOut as jest.Mock) = signOutMock;

      await authService.signOut();

      expect(signOutMock).toHaveBeenCalled();
    });

    it('should handle signout errors', async () => {
      const error = new Error('Network error') as unknown as never;
      (mockAuth.signOut as jest.Mock).mockRejectedValue(error);

      await expect(authService.signOut()).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const getDocMock = jest.fn<() => Promise<FirebaseFirestoreTypes.DocumentSnapshot>>().mockResolvedValue({
        exists: true,
        data: () => mockUserDoc,
        id: mockFirebaseUser.uid,
        metadata: {} as FirebaseFirestoreTypes.SnapshotMetadata,
        ref: {} as FirebaseFirestoreTypes.DocumentReference,
        get: jest.fn(),
        isEqual: jest.fn()
      } as unknown as FirebaseFirestoreTypes.DocumentSnapshot);
      mockAuth.currentUser = mockFirebaseUser;
      (mockFirestore.collection('users').doc(mockFirebaseUser.uid).get as jest.Mock) = getDocMock;

      const result = await authService.getCurrentUser();

      expect(getDocMock).toHaveBeenCalled();
      expect(result).toEqual(mockUserDoc);
    });

    it('should return null when not authenticated', async () => {
      mockAuth.currentUser = null;

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('updateUserTokens', () => {
    it('should update user tokens successfully', async () => {
      const updateDocMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (mockFirestore.collection('users').doc(mockFirebaseUser.uid).update as jest.Mock) = updateDocMock;

      const tokens = 100;
      await authService.updateUserTokens(mockFirebaseUser.uid, tokens);

      expect(updateDocMock).toHaveBeenCalledWith({ tokens });
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed') as unknown as never;
      (mockFirestore.collection('users').doc().update as jest.Mock).mockRejectedValue(error);

      await expect(authService.updateUserTokens(
        mockFirebaseUser.uid,
        100
      )).rejects.toThrow(error);
    });
  });

  describe('onAuthStateChanged', () => {
    it('should set up auth state listener', () => {
      const listenerMock = jest.fn();
      (mockAuth.onAuthStateChanged as jest.Mock) = listenerMock;

      const callback = jest.fn();
      authService.onAuthStateChanged(callback);

      expect(listenerMock).toHaveBeenCalledWith(callback);
    });
  });
}); 