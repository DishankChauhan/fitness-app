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
import { auth, db } from '../../config/firebase';
import { Transaction, WalletStats } from '../../types/wallet';
import { FirebaseFirestore } from '@firebase/firestore-types';

// Mock Firebase modules
jest.mock('../../config/firebase', () => {
  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
  };

  return {
    auth: {
      currentUser: null,
    },
    db: mockFirestore as unknown as FirebaseFirestore,
  };
});

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
  const mockUser = {
    uid: 'test-user-id',
  };

  const mockTransaction: Transaction = {
    id: 'test-transaction-id',
    userId: 'test-user-id',
    amount: 100,
    type: 'deposit',
    status: 'completed',
    timestamp: new Date(),
    description: 'Test transaction',
  };

  const mockWalletStats: WalletStats = {
    balance: 1000,
    totalEarned: 2000,
    totalSpent: 1000,
    recentTransactions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = mockUser;
  });

  describe('getWalletStats', () => {
    beforeEach(() => {
      const mockQuerySnapshot = {
        docs: [
          {
            data: () => ({
              balance: mockWalletStats.balance,
              totalEarned: mockWalletStats.totalEarned,
              totalSpent: mockWalletStats.totalSpent,
            }),
          },
        ],
      };

      const mockTransactionsSnapshot = {
        docs: [
          {
            id: mockTransaction.id,
            data: () => ({
              ...mockTransaction,
              timestamp: { toDate: () => mockTransaction.timestamp },
            }),
          },
        ],
      };

      const mockFirestore = jest.requireMock('../../config/firebase').db;
      mockFirestore.get.mockImplementation((collection: string) => 
        Promise.resolve(collection === 'wallets' ? mockQuerySnapshot : mockTransactionsSnapshot)
      );
    });

    it('should return wallet stats for authenticated user', async () => {
      const stats = await walletService.getWalletStats('test-user-id');

      expect(stats).toEqual({
        ...mockWalletStats,
        recentTransactions: [mockTransaction],
      });
    });

    it('should throw error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      await expect(walletService.getWalletStats('test-user-id')).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getTransactions', () => {
    const mockTransactions = [mockTransaction];

    beforeEach(() => {
      const mockQuerySnapshot = {
        docs: mockTransactions.map(tx => ({
          id: tx.id,
          data: () => ({
            ...tx,
            timestamp: { toDate: () => tx.timestamp },
          }),
        })),
      };

      const mockFirestore = jest.requireMock('../../config/firebase').db;
      mockFirestore.get.mockResolvedValue(mockQuerySnapshot);
    });
    it('should return transactions for authenticated user', async () => {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated');
      }
      const transactions = await walletService.getTransactions({ limit: 10, cursor: '' });

      expect(transactions).toEqual(mockTransactions);
    });

    it('should throw error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      await expect(walletService.getTransactions({ limit: 10, cursor: '' })).rejects.toThrow('User must be authenticated');
    });

    it('should apply pagination correctly', async () => {
      const mockFirestore = jest.requireMock('../../config/firebase').db;
      await walletService.getTransactions({ limit: 10, cursor: 'test-cursor' });

      expect(mockFirestore.limit).toHaveBeenCalledWith(10);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
    });
  });

  describe('withdrawFunds', () => {
    const withdrawalAmount = 500;

    beforeEach(() => {
      const mockWalletDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ balance: mockWalletStats.balance }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockFirestore = jest.requireMock('../../config/firebase').db;
      mockFirestore.doc.mockReturnValue(mockWalletDoc);
      mockFirestore.add.mockResolvedValue({ id: 'new-transaction-id' });
    });

    it('should process withdrawal successfully', async () => {
      const result = await walletService.withdrawFunds(withdrawalAmount);

      expect(result).toEqual({
        success: true,
        transactionId: 'new-transaction-id',
      });

      const mockFirestore = jest.requireMock('../../config/firebase').db;
      expect(mockFirestore.update).toHaveBeenCalledWith({
        balance: mockWalletStats.balance - withdrawalAmount,
        totalSpent: expect.any(Number),
      });

      expect(mockFirestore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.uid,
          amount: withdrawalAmount,
          type: 'withdrawal',
          status: 'completed',
        })
      );
    });

    it('should throw error if withdrawal amount exceeds balance', async () => {
      const excessAmount = mockWalletStats.balance + 100;

      await expect(walletService.withdrawFunds(excessAmount))
        .rejects.toThrow('Insufficient funds');
    });

    it('should throw error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      await expect(walletService.withdrawFunds(withdrawalAmount))
        .rejects.toThrow('User must be authenticated');
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