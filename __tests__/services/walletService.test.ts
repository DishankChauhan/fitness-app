import '@testing-library/jest-native/extend-expect';
import * as walletService from '../../services/walletService';
import { solanaService } from '../../services/solanaService';
import * as authService from '../../services/authService';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  doc 
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('../../config/firebase', () => ({
  db: {},
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc
}));

// Mock the imported Firebase functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn().mockReturnValue({}),
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'tx1',
        data: () => ({
          userId: 'test-user-id',
          type: 'stake',
          amount: 1,
          timestamp: { toDate: () => new Date() },
          status: 'completed',
          challengeId: 'challenge-1',
        }),
      },
    ],
  }),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      tokens: 1000,
    }),
  }),
  addDoc: jest.fn().mockResolvedValue({ id: 'new-tx-id' }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn().mockReturnValue({}),
}));

// Mock Solana service
jest.mock('../../services/solanaService', () => ({
  solanaService: {
    initializeWallet: jest.fn().mockResolvedValue(undefined),
    getBalance: jest.fn().mockResolvedValue(10), // 10 SOL
    stakeInChallenge: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Auth service
jest.mock('../../services/authService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    tokens: 1000,
    createdAt: new Date(),
  }),
}));

describe('Wallet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletStats', () => {
    it('should return wallet stats', async () => {
      // Mock for this test
      const mockUserChallenges = {
        docs: [
          {
            data: () => ({
              userId: 'test-user-id',
              stakedAmount: 2, // 2 SOL
              status: 'active',
            }),
          },
          {
            data: () => ({
              userId: 'test-user-id',
              stakedAmount: 3, // 3 SOL
              status: 'active',
            }),
          },
        ],
      };

      const mockPendingRewards = {
        docs: [
          {
            data: () => ({
              userId: 'test-user-id',
              amount: 1, // 1 SOL
              status: 'pending',
            }),
          },
        ],
      };

      const mockRewardTransactions = {
        docs: [
          {
            data: () => ({
              userId: 'test-user-id',
              amount: 5, // 5 SOL
              type: 'reward',
              status: 'completed',
            }),
          },
        ],
      };

      // Setup mocks for this specific test
      (collection as jest.Mock).mockImplementation((_, collectionName) => {
        if (collectionName === 'userChallenges') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockUserChallenges),
          };
        } else if (collectionName === 'rewards') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockPendingRewards),
          };
        } else if (collectionName === 'transactions') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockRewardTransactions),
          };
        }
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
      });

      // Execute
      const result = await walletService.getWalletStats();

      // Verify
      expect(solanaService.initializeWallet).toHaveBeenCalled();
      expect(solanaService.getBalance).toHaveBeenCalled();
      expect(result).toEqual({
        totalStaked: 5, // 2 + 3
        availableBalance: 10, // from solanaService.getBalance mock
        pendingRewards: 1,
        totalEarned: 5,
      });
    });

    it('should throw an error if user is not authenticated', async () => {
      // Mock for this test
      (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      // Execute and verify
      await expect(walletService.getWalletStats()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getTransactions', () => {
    it('should return user transactions', async () => {
      // Mock transaction data
      const mockTransactions = {
        docs: [
          {
            id: 'tx1',
            data: () => ({
              userId: 'test-user-id',
              type: 'stake',
              amount: 1,
              timestamp: { toDate: () => new Date('2023-01-01') },
              status: 'completed',
              challengeId: 'challenge-1',
              txHash: 'hash1',
            }),
          },
          {
            id: 'tx2',
            data: () => ({
              userId: 'test-user-id',
              type: 'reward',
              amount: 2,
              timestamp: { toDate: () => new Date('2023-01-02') },
              status: 'completed',
              challengeId: 'challenge-1',
              txHash: 'hash2',
            }),
          },
        ],
      };

      // Setup mocks for this specific test
      (collection as jest.Mock).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockTransactions),
      });

      // Execute
      const result = await walletService.getTransactions();

      // Verify
      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('tx1');
      expect(result[0].type).toBe('stake');
      expect(result[1].id).toBe('tx2');
      expect(result[1].type).toBe('reward');
    });

    it('should throw an error if user is not authenticated', async () => {
      // Mock for this test
      (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      // Execute and verify
      await expect(walletService.getTransactions()).rejects.toThrow('Not authenticated');
    });
  });

  describe('withdrawFunds', () => {
    it('should process a withdrawal successfully', async () => {
      // Setup mocks
      (collection as jest.Mock).mockReturnValueOnce({
        add: jest.fn().mockResolvedValue({ id: 'withdrawal-tx-id' }),
      });

      // Mock the doc reference with proper update method
      const mockDocRef = {
        update: jest.fn().mockResolvedValue(undefined)
      };
      (doc as jest.Mock).mockReturnValueOnce(mockDocRef);

      // Execute
      const result = await walletService.withdrawFunds(5);

      // Verify
      expect(solanaService.initializeWallet).toHaveBeenCalled();
      expect(solanaService.getBalance).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'withdrawal-tx-id',
        type: 'withdrawal',
        amount: 5,
        status: 'completed',
      }));
    });

    it('should throw an error if balance is insufficient', async () => {
      // Mock for this test
      (solanaService.getBalance as jest.Mock).mockResolvedValueOnce(2);

      // Execute and verify
      await expect(walletService.withdrawFunds(5)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('stakeInChallenge', () => {
    it('should process a stake successfully', async () => {
      // Setup mocks
      (collection as jest.Mock).mockReturnValueOnce({
        add: jest.fn().mockResolvedValue({ id: 'stake-tx-id' }),
      });

      // Mock the doc reference with proper update method
      const mockDocRef = {
        update: jest.fn().mockResolvedValue(undefined)
      };
      (doc as jest.Mock).mockReturnValueOnce(mockDocRef);

      // Mock userChallenge query
      const mockUserChallengeSnapshot = {
        empty: false,
        docs: [
          {
            ref: { id: 'user-challenge-id' },
            data: () => ({
              userId: 'test-user-id',
              challengeId: 'challenge-id',
              stakedAmount: 1,
            }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserChallengeSnapshot),
      });

      // Execute
      const result = await walletService.stakeInChallenge('challenge-id', 2);

      // Verify
      expect(solanaService.initializeWallet).toHaveBeenCalled();
      expect(solanaService.getBalance).toHaveBeenCalled();
      expect(solanaService.stakeInChallenge).toHaveBeenCalledWith('challenge-id', 2);
      expect(result).toEqual(expect.objectContaining({
        id: 'stake-tx-id',
        type: 'stake',
        amount: 2,
        challengeId: 'challenge-id',
        status: 'completed',
      }));
    });

    it('should throw an error if balance is insufficient', async () => {
      // Mock for this test
      (solanaService.getBalance as jest.Mock).mockResolvedValueOnce(1);

      // Execute and verify
      await expect(walletService.stakeInChallenge('challenge-id', 2))
        .rejects.toThrow('Insufficient balance');
    });

    it('should handle staking errors gracefully', async () => {
      // Setup mocks
      (collection as jest.Mock).mockReturnValueOnce({
        add: jest.fn().mockResolvedValue({ id: 'stake-tx-id' }),
      });

      // Mock the doc reference with proper update method
      const mockDocRef = {
        update: jest.fn().mockResolvedValue(undefined)
      };
      (doc as jest.Mock).mockReturnValueOnce(mockDocRef);

      // Mock solanaService to throw an error
      (solanaService.stakeInChallenge as jest.Mock).mockRejectedValueOnce(new Error('Blockchain error'));

      // Execute and verify
      await expect(walletService.stakeInChallenge('challenge-id', 2))
        .rejects.toThrow('Staking failed');
      
      // Verify transaction was marked as failed
      expect(doc).toHaveBeenCalled();
      expect(mockDocRef.update).toHaveBeenCalledWith({ status: 'failed' });
    });
  });
}); 