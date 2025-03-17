import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  tokens: number;
  createdAt: Date;
  stats?: {
    firstJoins: number;
    challengesCompleted: number;
    longestStreak: number;
    socialInteractions: number;
    goalsExceeded: number;
    topPerformer: boolean;
    helpfulResponses: number;
    popularChallenges: number;
  };
}

export async function signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
  const userCredential = await auth().createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;

  const userProfile: UserProfile = {
    id: user.uid,
    email: user.email!,
    displayName,
    tokens: 1000,
    createdAt: new Date()
  };

  await firestore().collection('users').doc(user.uid).set(userProfile);
  await user.updateProfile({ displayName });

  return userProfile;
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const userCredential = await auth().signInWithEmailAndPassword(email, password);
  const userDoc = await firestore().collection('users').doc(userCredential.user.uid).get();
  
  if (!userDoc.exists) {
    throw new Error('User profile not found');
  }

  return userDoc.data() as UserProfile;
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const user = auth().currentUser;
  if (!user) return null;

  const userDoc = await firestore().collection('users').doc(user.uid).get();
  return userDoc.exists ? (userDoc.data() as UserProfile) : null;
}

export async function updateUserTokens(userId: string, tokens: number): Promise<void> {
  await firestore().collection('users').doc(userId).update({ tokens });
}

export function onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
  return auth().onAuthStateChanged(callback);
} 