import {
  db,
  analytics,
  crashlytics,
  logAnalyticsEvent,
  collection,
  query,
  where,
  getDocs,
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
  getDoc,
} from '../config/firebase';
import { healthService } from './healthService';
import * as authService from './authService';
import { solanaService } from './solanaService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { UserProfile } from '../types/user';

// Constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PROGRESS_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 3;
const STORAGE_KEYS = {
  CHALLENGES_CACHE: 'challenges_cache',
  LAST_PROGRESS_UPDATE: 'last_progress_update',
};

export type ChallengeType = 'steps' | 'activeMinutes' | 'heartRate' | 'sleepHours';
export type ChallengeVisibility = 'public' | 'private' | 'invite_only';
export type ChallengeStatus = 'active' | 'completed' | 'failed';

export interface UserChallenge extends Challenge {
  prizePool: number;
  userId: string;
  progress: number;
  displayName: string;
}

export interface CreateChallengeParams {
  title: string;
  description: string;
  type: ChallengeType;
  goal: number;
  stake: number;
  startDate: string;
  endDate: string;
  visibility: ChallengeVisibility;
  groupId?: string | null;
}

export interface Challenge {
  prizePool: number;
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  goal: number;
  stake: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  participants: string[];
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  solanaAddress?: string;
}

export class ChallengeService {
  private static instance: ChallengeService;
  private readonly challengesCollection = firestore().collection('challenges');
  private progressUpdateInterval?: NodeJS.Timeout;
  private challengeListeners: Map<string, () => void> = new Map();

  private constructor() {
    this.startProgressUpdateInterval();
  }

  public static getInstance(): ChallengeService {
    if (!ChallengeService.instance) {
      ChallengeService.instance = new ChallengeService();
    }
    return ChallengeService.instance;
  }

  private startProgressUpdateInterval(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
    }

    this.progressUpdateInterval = setInterval(() => {
      this.updateAllChallengesProgress().catch(error => {
        this.handleError(error, 'progress_update_interval');
      });
    }, PROGRESS_UPDATE_INTERVAL);
  }

  private handleError(error: Error, operation: string): void {
    console.error(`Error in ${operation}:`, error);
    // Only record the error if crashlytics is available
    if (crashlytics) {
      crashlytics.recordError(error);
    }
    throw error;
  }

  private async getUserTokens(): Promise<number> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      return user.tokens;
    } catch (error) {
      this.handleError(error as Error, 'get_user_tokens');
      throw error;
    }
  }

  private async setUserTokens(tokens: number): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      await authService.updateUserTokens(user.id, tokens);
      logAnalyticsEvent('tokens_updated', { newBalance: tokens });
    } catch (error) {
      this.handleError(error as Error, 'set_user_tokens');
      throw error;
    }
  }

  private validateChallenge(challenge: Challenge): void {
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);

    if (startDate >= endDate) {
      throw new Error('Challenge end date must be after start date');
    }
    if (endDate <= now) {
      throw new Error('Challenge end date must be in the future');
    }
    if (challenge.stake <= 0) {
      throw new Error('Challenge stake must be greater than 0');
    }
    if (challenge.goal <= 0) {
      throw new Error('Challenge goal must be greater than 0');
    }
    if (!challenge.title || !challenge.description) {
      throw new Error('Challenge must have a title and description');
    }
  }

  private async getChallengeProgress(type: ChallengeType, goal: number): Promise<number> {
    try {
      const healthData = await healthService.getHealthData();
      if (!healthData) return 0;

      let progress = 0;

      switch (type) {
        case 'steps':
          progress = (healthData.steps / goal) * 100;
          break;
        case 'activeMinutes':
          progress = (healthData.activeMinutes / goal) * 100;
          break;
        case 'heartRate':
          throw new Error('Heart rate tracking not supported');
        case 'sleepHours':
          throw new Error('Sleep hours tracking not supported');
        default:
          throw new Error(`Unsupported challenge type: ${type}`);
      }

      return Math.min(Math.max(progress, 0), 100);
    } catch (error) {
      this.handleError(error as Error, 'get_challenge_progress');
      return 0;
    }
  }

  async getUserChallenges(): Promise<UserChallenge[]> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const userChallengesRef = query(
        collection(db, 'userChallenges'),
        where('userId', '==', user.id),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(userChallengesRef);
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          displayName: user.displayName || 'Anonymous'
        } as UserChallenge;
      });
    } catch (error) {
      this.handleError(error as Error, 'get_user_challenges');
      throw error;
    }
  }

  async getAvailableChallenges(): Promise<Challenge[]> {
    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES_CACHE);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data as Challenge[];
        }
      }
      const challengesRef = query(
        collection(db, 'challenges'),
        where('status', '==', 'active'),
        where('endDate', '>', new Date().toISOString())
      );

      const snapshot = await getDocs(challengesRef);

      const challenges = snapshot.docs.map((doc: { data: () => any; id: any; }) => ({
        ...doc.data(),
        id: doc.id,
      })) as Challenge[];

      // Update cache
      await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGES_CACHE, JSON.stringify({
        data: challenges,
        timestamp: Date.now(),
      }));

      return challenges;
    } catch (error) {
      this.handleError(error as Error, 'get_available_challenges');
      return [];
    }
  }

  async getAllChallenges(): Promise<(Challenge | UserChallenge)[]> {
    try {
      const [userChallenges, availableChallenges] = await Promise.all([
        this.getUserChallenges(),
        this.getAvailableChallenges(),
      ]);

      // Filter out challenges that the user has already joined
      const filteredAvailable = availableChallenges.filter(
        challenge => !userChallenges.some(uc => uc.id === challenge.id)
      );

      return [...userChallenges, ...filteredAvailable];
    } catch (error) {
      this.handleError(error as Error, 'get_all_challenges');
      return [];
    }
  }

  private async updateAllChallengesProgress(): Promise<void> {
    try {
      const userChallenges = await this.getUserChallenges();
      const batch = writeBatch(db);
      const now = new Date();

      for (const challenge of userChallenges) {
        if (challenge.status !== 'active') continue;
        if (new Date(challenge.endDate) <= now) {
          // Challenge has ended, mark for completion check
          await this.checkChallengeCompletion(challenge.id);
          continue;
        }

        const progress = await this.getChallengeProgress(challenge.type, challenge.goal);
        const ref = doc(db, 'userChallenges', challenge.id);
        batch.update(ref, { progress });
      }

      await batch.commit();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROGRESS_UPDATE, Date.now().toString());
      logAnalyticsEvent('challenges_progress_updated');
    } catch (error) {
      this.handleError(error as Error, 'update_all_challenges_progress');
    }
  }

  async joinChallenge(challengeId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Get challenge
      const challengeDoc = await this.challengesCollection.doc(challengeId).get();
      if (!challengeDoc.exists) throw new Error('Challenge not found');

      const challenge = { id: challengeDoc.id, ...challengeDoc.data() } as Challenge;
      
      // Check if user is already a participant
      if (challenge.participants.includes(user.id)) {
        throw new Error('Already joined this challenge');
      }

      // Validate user can join (e.g., has enough tokens)
      const userTokens = await this.getUserTokens();
      if (userTokens < challenge.stake) {
        throw new Error('Insufficient tokens to join challenge');
      }

      // Initialize Solana wallet if needed
      await solanaService.initializeWallet();

      // Stake tokens in Solana program
      if (challenge.solanaAddress) {
        await solanaService.stakeInChallenge(
          challenge.solanaAddress,
          challenge.stake
        );
      }

      // Update Firestore
      await this.challengesCollection.doc(challengeId).update({
        participants: firestore.FieldValue.arrayUnion(user.id),
        prizePool: firestore.FieldValue.increment(challenge.stake),
        updatedAt: new Date().toISOString()
      });

      // Deduct tokens from user
      await this.setUserTokens(userTokens - challenge.stake);

      // Log event
      logAnalyticsEvent('challenge_joined', {
        challenge_id: challengeId,
        stake_amount: challenge.stake
      });
    } catch (error) {
      this.handleError(error as Error, 'joinChallenge');
      throw error;
    }
  }

  async leaveChallenge(challengeId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const challengeRef = doc(db, 'challenges', challengeId);
      const userChallengeRef = doc(db, 'userChallenges', challengeId);

      await runTransaction(db, async (transaction: Transaction) => {
        const [challengeDoc, userChallengeDoc] = await Promise.all([
          transaction.get(challengeRef),
          transaction.get(userChallengeRef)
        ]);

        if (!challengeDoc.exists || !userChallengeDoc.exists) {
          throw new Error('Challenge not found');
        }

        const challenge = challengeDoc.data() as Challenge;
        const userChallenge = userChallengeDoc.data() as UserChallenge;

        if (userChallenge.userId !== user.id) {
          throw new Error('Not authorized to leave this challenge');
        }

        if (challenge.status !== 'active') {
          throw new Error('Cannot leave a completed challenge');
        }

        // Update challenge participants and prize pool
        transaction.update(challengeRef, {
          participants: challenge.participants.filter(id => id !== user.id),
          prizePool: challenge.prizePool - challenge.stake
        });

        // Delete user challenge
        transaction.delete(userChallengeRef);

        // Return stake to user
        const userTokens = await this.getUserTokens();
        await this.setUserTokens(userTokens + challenge.stake);
      });

      logAnalyticsEvent('challenge_left', { challengeId });
    } catch (error) {
      this.handleError(error as Error, 'leave_challenge');
      throw error;
    }
  }

  async checkChallengeCompletion(challengeId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Get challenge
      const challengeDoc = await this.challengesCollection.doc(challengeId).get();
      if (!challengeDoc.exists) throw new Error('Challenge not found');

      const challenge = { id: challengeDoc.id, ...challengeDoc.data() } as Challenge;
      
      // Ensure user is a participant
      if (!challenge.participants.includes(user.id)) {
        throw new Error('Not a participant in this challenge');
      }
      
      // Get current progress
      const currentProgress = await this.getChallengeProgress(
        challenge.type,
        challenge.goal
      );
      
      // Determine if challenge is completed
      const isCompleted = currentProgress >= 100;
      
      if (isCompleted && challenge.status !== 'completed') {
        // Initialize Solana wallet if needed
        await solanaService.initializeWallet();
        
        // Handle completion with Solana
        if (challenge.solanaAddress) {
          // Distribute reward
          await solanaService.distributeReward(
            challenge.solanaAddress,
            user.id, // Using user ID, would need to map to Solana address in production
            challenge.stake
          );
        }
        
        // Update Firestore
        await this.challengesCollection.doc(challengeId).update({
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
        
        // Add tokens back to user plus reward
        const userTokens = await this.getUserTokens();
        const reward = challenge.stake;
        await this.setUserTokens(userTokens + reward);
        
        // Log event
        logAnalyticsEvent('challenge_completed', {
          challenge_id: challengeId,
          reward_amount: reward
        });
      }
    } catch (error) {
      this.handleError(error as Error, 'checkChallengeCompletion');
      throw error;
    }
  }

  async getUserChallenge(challengeId: string, userId: string): Promise<UserChallenge | null> {
    try {
      const userChallengeRef = doc(db, 'userChallenges', `${userId}_${challengeId}`);
      const userChallengeDoc = await getDoc(userChallengeRef);
      
      if (!userChallengeDoc.exists()) {
        return null;
      }

      return {
        id: userChallengeDoc.id,
        ...userChallengeDoc.data() as Omit<UserChallenge, 'id'>
      };
    } catch (error) {
      console.error('Error getting user challenge:', error);
      throw error;
    }
  }

  async createChallenge(params: CreateChallengeParams): Promise<Challenge> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Initialize Solana wallet if needed
      await solanaService.initializeWallet();
      
      // Create document in Firestore first
      const challengeData: Omit<Challenge, 'id'> = {
        title: params.title,
        description: params.description,
        type: params.type,
        goal: params.goal,
        stake: params.stake,
        startDate: params.startDate,
        endDate: params.endDate,
        createdBy: user.id,
        participants: [user.id],
        status: 'active',
        visibility: params.visibility,
        groupId: params.groupId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prizePool: params.stake, // Initial prize pool is the creator's stake
      };

      const docRef = await this.challengesCollection.add(challengeData);
      const challengeId = docRef.id;
      
      // Create Solana challenge with the Firestore ID
      const solanaAddress = await solanaService.createChallenge(
        challengeId,
        params.stake
      );
      
      // Update Firestore document with Solana address
      await docRef.update({
        solanaAddress
      });

      // Log event
      logAnalyticsEvent('challenge_created', {
        challenge_id: challengeId,
        challenge_type: params.type,
        stake_amount: params.stake,
        solana_address: solanaAddress
      });

      return {
        ...challengeData,
        id: challengeId,
        solanaAddress
      } as Challenge;
    } catch (error) {
      this.handleError(error as Error, 'createChallenge');
      throw error;
    }
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    const doc = await this.challengesCollection.doc(challengeId).get();
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data() as Omit<Challenge, 'id'>
    };
  }

  async updateChallenge(challengeId: string, updates: Partial<Omit<Challenge, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const challenge = await this.getChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.createdBy !== currentUser.id) {
      throw new Error('Not authorized');
    }

    await this.challengesCollection.doc(challengeId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async getPublicChallenges(limit: number = 10): Promise<Challenge[]> {
    const snapshot = await this.challengesCollection
      .where('visibility', '==', 'public')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<Challenge, 'id'>
    }));
  }

  // Cleanup method to be called when the service is no longer needed
  destroy(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
    }
    this.challengeListeners.forEach(unsubscribe => unsubscribe());
    this.challengeListeners.clear();
  }
}

export const challengeService = ChallengeService.getInstance(); 