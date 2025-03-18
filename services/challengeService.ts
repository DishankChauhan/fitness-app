import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import { healthService } from './healthService';
import * as authService from './authService';
import { solanaService } from './solanaService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/user';
import {
  Challenge,
  UserChallenge,
  ChallengeGroup,
  CheckInResult,
  ChallengeStatus,
  ChallengeCategory,
} from '../types/challenge';
import { FirebaseFirestore } from '@firebase/firestore-types';

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

export interface ChallengeData {
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
    try {
      crashlytics().recordError(error);
    } catch (e) {
      // Ignore crashlytics errors in development
      console.debug('Crashlytics error:', e);
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
      await this.logAnalyticsEvent('tokens_updated', { newBalance: tokens });
    } catch (error) {
      this.handleError(error as Error, 'set_user_tokens');
      throw error;
    }
  }

  private validateChallenge(challenge: ChallengeData): void {
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

  async getUserChallenges(userId: string): Promise<UserChallenge[]> {
    try {
      const snapshot = await firestore()
        .collection('userChallenges')
        .where('userId', '==', userId)
        .get();
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          lastCheckIn: data.lastCheckIn ? data.lastCheckIn.toDate() : null
        } as UserChallenge;
      });
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      return [];
    }
  }

  async getAvailableChallenges(): Promise<ChallengeData[]> {
    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES_CACHE);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data as ChallengeData[];
        }
      }

      const snapshot = await firestore()
        .collection('challenges')
        .where('status', '==', 'active')
        .where('endDate', '>', firestore.Timestamp.fromDate(new Date()))
        .get();

      const challenges = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as ChallengeData[];

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

  async getAllChallenges(): Promise<(ChallengeData | UserChallenge)[]> {
    try {
      const userId = await this.ensureAuthenticated();
      const [userChallenges, availableChallenges] = await Promise.all([
        this.getUserChallenges(userId),
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
      const userId = await this.ensureAuthenticated();
      const userChallenges = await this.getUserChallenges(userId);
      const batch = firestore().batch();
      const now = firestore.Timestamp.fromDate(new Date());

      for (const challenge of userChallenges) {
        if (challenge.status !== 'active') continue;
        if (now.toMillis() > challenge.endDate.toMillis()) {
          // Challenge has ended, mark for completion check
          await this.checkChallengeCompletion(challenge.id);
          continue;
        }

        const progress = await this.getChallengeProgress(challenge.type, challenge.goal);
        const ref = firestore().collection('userChallenges').doc(challenge.id);
        batch.update(ref, { progress });
      }

      await batch.commit();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROGRESS_UPDATE, Date.now().toString());
      await this.logAnalyticsEvent('challenges_progress_updated');
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

      const challenge = { id: challengeDoc.id, ...challengeDoc.data() } as ChallengeData;
      
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
      await this.logAnalyticsEvent('challenge_joined', {
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

      const challengeRef = firestore().collection('challenges').doc(challengeId);
      const userChallengeRef = firestore().collection('userChallenges').doc(challengeId);

      await firestore().runTransaction(async (transaction) => {
        const [challengeDoc, userChallengeDoc] = await Promise.all([
          transaction.get(challengeRef),
          transaction.get(userChallengeRef)
        ]);

        if (!challengeDoc.exists || !userChallengeDoc.exists) {
          throw new Error('Challenge not found');
        }

        const challenge = challengeDoc.data() as ChallengeData;
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

      await this.logAnalyticsEvent('challenge_left', { challengeId });
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

      const challenge = { id: challengeDoc.id, ...challengeDoc.data() } as ChallengeData;
      
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
        await this.logAnalyticsEvent('challenge_completed', {
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
      const userChallengeDoc = await firestore()
        .collection('userChallenges')
        .doc(`${userId}_${challengeId}`)
        .get();
      
      if (!userChallengeDoc.exists) {
        return null;
      }

      const data = userChallengeDoc.data();
      if (!data) {
        return null;
      }

      return {
        id: userChallengeDoc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        lastCheckIn: data.lastCheckIn?.toDate() || null
      } as UserChallenge;
    } catch (error) {
      console.error('Error getting user challenge:', error);
      throw error;
    }
  }

  async createChallenge(params: CreateChallengeParams): Promise<ChallengeData> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Initialize Solana wallet if needed
      await solanaService.initializeWallet();
      
      // Create document in Firestore first
      const challengeData: Omit<ChallengeData, 'id'> = {
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
      await this.logAnalyticsEvent('challenge_created', {
        challenge_id: challengeId,
        challenge_type: params.type,
        stake_amount: params.stake,
        solana_address: solanaAddress
      });

      return {
        ...challengeData,
        id: challengeId,
        solanaAddress
      } as ChallengeData;
    } catch (error) {
      this.handleError(error as Error, 'createChallenge');
      throw error;
    }
  }

  async getChallenge(challengeId: string): Promise<ChallengeData | null> {
    const doc = await this.challengesCollection.doc(challengeId).get();
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data() as Omit<ChallengeData, 'id'>
    };
  }

  async updateChallenge(challengeId: string, updates: Partial<Omit<ChallengeData, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
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

  async getPublicChallenges(limit: number = 10): Promise<ChallengeData[]> {
    const snapshot = await this.challengesCollection
      .where('visibility', '==', 'public')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<ChallengeData, 'id'>
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

  private async ensureAuthenticated(): Promise<string> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }
    return user.id;
  }

  async getChallenges(category?: ChallengeCategory): Promise<ChallengeData[]> {
    try {
      let query = firestore().collection('challenges').where('endDate', '>', new Date());

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate()
        } as ChallengeData;
      });
    } catch (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }
  }

  async checkIn(userChallengeId: string): Promise<CheckInResult> {
    const userId = await this.ensureAuthenticated();

    try {
      const userChallengeDoc = await firestore().collection('userChallenges').doc(userChallengeId).get();
      
      if (!userChallengeDoc.exists) {
        throw new Error('Challenge participation not found');
      }

      const userChallenge = userChallengeDoc.data() as UserChallenge;

      if (userChallenge.userId !== userId) {
        throw new Error('Not authorized to check in for this challenge');
      }

      if (userChallenge.status !== 'active') {
        throw new Error('Challenge is not active');
      }

      const now = firestore.Timestamp.fromDate(new Date());
      if (now.toMillis() > userChallenge.endDate.toMillis()) {
        throw new Error('Challenge has ended');
      }

      // Calculate progress
      const totalDays = Math.ceil(
        (userChallenge.endDate.toMillis() - userChallenge.startDate.toMillis()) / (1000 * 60 * 60 * 24)
      );
      const newProgress = Math.min(100, Math.round((userChallenge.progress || 0) + (100 / totalDays)));

      // Update user challenge
      await userChallengeDoc.ref.update({
        lastCheckIn: now,
        progress: newProgress,
      });

      return {
        success: true,
        message: 'Check-in successful',
        progress: newProgress,
      };
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  async createGroupChallenge(challenge: Omit<ChallengeData, 'id'>, group: Omit<ChallengeGroup, 'id' | 'challengeId' | 'status'>): Promise<{ challengeId: string; groupId: string }> {
    const userId = await this.ensureAuthenticated();

    try {
      // Create the challenge
      const challengeRef = await firestore().collection('challenges').add({
        ...challenge,
        creatorId: userId,
        type: 'group',
        createdAt: new Date(),
      });

      // Create the group
      const groupRef = await firestore().collection('challengeGroups').add({
        ...group,
        challengeId: challengeRef.id,
        creatorId: userId,
        participants: [userId],
        createdAt: new Date(),
        status: 'pending',
      });

      return {
        challengeId: challengeRef.id,
        groupId: groupRef.id,
      };
    } catch (error) {
      console.error('Error creating group challenge:', error);
      throw error;
    }
  }

  async joinGroupChallenge(groupId: string): Promise<{ success: boolean; userChallengeId: string }> {
    const userId = await this.ensureAuthenticated();

    try {
      const groupDoc = await firestore().collection('challengeGroups').doc(groupId).get();
      if (!groupDoc.exists) {
        throw new Error('Group not found');
      }

      const group = groupDoc.data() as ChallengeGroup;
      
      if (group.participants.includes(userId)) {
        throw new Error('Already a member of this group');
      }

      if (group.participants.length >= group.maxParticipants) {
        throw new Error('Group is full');
      }

      const challengeDoc = await firestore().collection('challenges').doc(group.challengeId).get();
      if (!challengeDoc.exists) {
        throw new Error('Challenge not found');
      }

      const challenge = challengeDoc.data() as ChallengeData;

      // Update group participants
      await groupDoc.ref.update({
        participants: [...group.participants, userId],
      });

      // Create user challenge
      const userChallenge = {
        userId,
        type: challenge.type,
        goal: challenge.goal,
        progress: 0,
        displayName: challenge.title,
        status: 'active' as ChallengeStatus,
        startDate: firestore.Timestamp.fromDate(new Date(challenge.startDate)),
        endDate: firestore.Timestamp.fromDate(new Date(challenge.endDate)),
        lastCheckIn: null,
        stake: challenge.stake,
        groupId,
        isGroupChallenge: true,
      };

      const userChallengeRef = await firestore().collection('userChallenges').add(userChallenge);

      return {
        success: true,
        userChallengeId: userChallengeRef.id,
      };
    } catch (error) {
      console.error('Error joining group challenge:', error);
      throw error;
    }
  }

  async createUserChallenge(challenge: Omit<UserChallenge, 'id'>): Promise<UserChallenge> {
    try {
      const docRef = await firestore().collection('userChallenges').add(challenge);
      return {
        ...challenge,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Error creating user challenge:', error);
      throw error;
    }
  }

  async updateUserChallenge(challengeId: string, data: Partial<UserChallenge>): Promise<void> {
    try {
      await firestore().collection('userChallenges').doc(challengeId).update(data);
    } catch (error) {
      console.error('Error updating user challenge:', error);
      throw error;
    }
  }

  async getChallengeGroups(): Promise<ChallengeGroup[]> {
    try {
      const snapshot = await firestore()
        .collection('challengeGroups')
        .get();
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as ChallengeGroup;
      });
    } catch (error) {
      console.error('Error fetching challenge groups:', error);
      return [];
    }
  }

  async createChallengeGroup(group: Omit<ChallengeGroup, 'id'>): Promise<ChallengeGroup> {
    try {
      const now = firestore.Timestamp.now();
      const docRef = await firestore().collection('challengeGroups').add({
        ...group,
        createdAt: now,
        updatedAt: now
      });

      const data = {
        ...group,
        id: docRef.id,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString()
      };

      return data;
    } catch (error) {
      console.error('Error creating challenge group:', error);
      throw error;
    }
  }

  private async logAnalyticsEvent(eventName: string, params?: Record<string, any>) {
    try {
      await analytics().logEvent(eventName, params);
    } catch (error) {
      console.error('Error logging analytics event:', error);
    }
  }
}

export const challengeService = ChallengeService.getInstance(); 