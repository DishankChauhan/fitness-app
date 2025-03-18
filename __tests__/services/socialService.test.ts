import { auth, db } from '../../config/firebase';
import { socialService } from '../../services/socialService';
import { UserProfile } from '../../types/user';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore');

describe('SocialService', () => {
  const mockUser = {
    uid: 'test-user-id',
  };

  const mockUserProfile: UserProfile = {
    id: mockUser.uid,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    tokens: 1000,
    challenges: [],
    achievements: [],
    stats: {
      completedChallenges: 5,
      totalSteps: 1000,
      activeDays: 30,
      streak: 7,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = mockUser;
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard data', async () => {
      const mockLeaderboardData = [
        {
          id: 'user-1',
          displayName: 'Top User',
          photoURL: 'https://example.com/photo1.jpg',
          stats: {
            completedChallenges: 10,
            totalSteps: 2000,
            activeDays: 45,
            streak: 15,
          },
        },
      ];

      const mockSnapshot = {
        docs: mockLeaderboardData.map(user => ({
          id: user.id,
          data: () => user,
        })),
      };

      (collection as jest.Mock).mockReturnValue('users');
      (query as jest.Mock).mockReturnValue('leaderboardQuery');
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const leaderboard = await socialService.getLeaderboard();

      expect(leaderboard).toEqual(mockLeaderboardData);
      expect(collection).toHaveBeenCalledWith(db, 'users');
      expect(orderBy).toHaveBeenCalledWith('stats.totalSteps', 'desc');
      expect(limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getFriends', () => {
    it('should return user friends', async () => {
      const mockFriends = [
        {
          id: 'friend-1',
          email: 'friend@example.com',
          displayName: 'Friend One',
          photoURL: 'https://example.com/friend1.jpg',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          tokens: 500,
          challenges: [],
          achievements: [],
          stats: {
            completedChallenges: 3,
            totalSteps: 500,
            activeDays: 15,
            streak: 5,
          },
        },
      ];

      const mockFriendships = {
        docs: mockFriends.map(friend => ({
          data: () => ({ friendId: friend.id }),
        })),
      };

      const mockFriendProfiles = {
        docs: mockFriends.map(friend => ({
          id: friend.id,
          data: () => friend,
        })),
      };

      (collection as jest.Mock).mockReturnValue('collection');
      (query as jest.Mock).mockReturnValue('query');
      (getDocs as jest.Mock)
        .mockResolvedValueOnce(mockFriendships)
        .mockResolvedValueOnce(mockFriendProfiles);

      const friends = await socialService.getFriends();

      expect(friends).toEqual(mockFriends);
      expect(collection).toHaveBeenCalledWith(db, 'friendships');
      expect(where).toHaveBeenCalledWith('userId', '==', mockUser.uid);
    });

    it('should throw error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      await expect(socialService.getFriends())
        .rejects.toThrow('User must be authenticated');
    });
  });

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      const targetUserId = 'target-user-id';
      const mockUserDoc = {
        exists: () => true,
        data: () => mockUserProfile,
      };

      (collection as jest.Mock).mockReturnValue('collection');
      (doc as jest.Mock).mockReturnValue('userDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockUserDoc);
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });
      (addDoc as jest.Mock).mockResolvedValue({ id: 'request-id' });

      const result = await socialService.sendFriendRequest(targetUserId);

      expect(result).toEqual({
        success: true,
        requestId: 'request-id',
      });
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request successfully', async () => {
      const mockRequest = {
        id: 'request-id',
        senderId: 'sender-id',
        receiverId: mockUser.uid,
        status: 'pending',
      };

      const mockRequestDoc = {
        exists: () => true,
        data: () => mockRequest,
      };

      (collection as jest.Mock).mockReturnValue('collection');
      (doc as jest.Mock).mockReturnValue('requestDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockRequestDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'friendship-id' });

      const result = await socialService.acceptFriendRequest(mockRequest.id);

      expect(result).toEqual({
        success: true,
        friendshipId: 'friendship-id',
      });
    });
  });
}); 