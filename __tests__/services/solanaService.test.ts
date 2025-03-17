import '@testing-library/jest-native/extend-expect';
import { solanaService } from '../../services/solanaService';
import * as SecureStore from 'expo-secure-store';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Program, BN } from '@project-serum/anchor';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => {
  const originalModule = jest.requireActual('@solana/web3.js');
  return {
    ...originalModule,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(5000000000), // 5 SOL in lamports
      getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mock-blockhash' }),
      sendRawTransaction: jest.fn().mockResolvedValue('mock-signature'),
      confirmTransaction: jest.fn().mockResolvedValue(true),
      requestAirdrop: jest.fn().mockResolvedValue('mock-airdrop-signature'),
    })),
    Keypair: {
      generate: jest.fn().mockReturnValue({
        publicKey: {
          toString: jest.fn().mockReturnValue('mock-public-key'),
          toBase58: jest.fn().mockReturnValue('mock-public-key-base58'),
        },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      }),
      fromSecretKey: jest.fn().mockReturnValue({
        publicKey: {
          toString: jest.fn().mockReturnValue('mock-public-key'),
          toBase58: jest.fn().mockReturnValue('mock-public-key-base58'),
        },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      }),
    },
    PublicKey: jest.fn().mockImplementation((key) => ({
      toString: jest.fn().mockReturnValue(key),
      toBase58: jest.fn().mockReturnValue(key),
    })),
    Transaction: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockReturnThis(),
      recentBlockhash: null,
      sign: jest.fn(),
      serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    })),
  };
});

// Mock @project-serum/anchor
jest.mock('@project-serum/anchor', () => ({
  Program: jest.fn().mockImplementation(() => ({
    methods: {
      initializeChallenge: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnThis(),
        signers: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue('mock-tx-signature'),
      }),
      stakeTokens: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnThis(),
        signers: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue('mock-tx-signature'),
      }),
      distributeReward: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnThis(),
        signers: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue('mock-tx-signature'),
      }),
    },
  })),
  AnchorProvider: jest.fn().mockImplementation(() => ({})),
  web3: {
    SystemProgram: {
      programId: 'mock-system-program-id',
    },
  },
  utils: {},
  BN: jest.fn().mockImplementation((value) => ({
    toNumber: jest.fn().mockReturnValue(Number(value)),
  })),
}));

describe('SolanaService', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeWallet', () => {
    it('should create a new wallet if none exists', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      // Execute
      await solanaService.initializeWallet();
      
      // Verify
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('solana_private_key');
      expect(Keypair.generate).toHaveBeenCalled();
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
      expect(Program).toHaveBeenCalled();
    });

    it('should load existing wallet if one exists', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      
      // Execute
      await solanaService.initializeWallet();
      
      // Verify
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('solana_private_key');
      expect(Keypair.fromSecretKey).toHaveBeenCalled();
      expect(Program).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      // Execute and verify
      await expect(solanaService.initializeWallet()).rejects.toThrow('Storage error');
    });
  });

  describe('getBalance', () => {
    it('should throw error if wallet is not initialized', async () => {
      // Execute and verify
      await expect(solanaService.getBalance()).rejects.toThrow('Wallet not initialized');
    });

    it('should return the wallet balance', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Execute
      const balance = await solanaService.getBalance();
      
      // Verify
      expect(balance).toBe(5); // 5 SOL
    });
  });

  describe('createChallenge', () => {
    it('should throw error if wallet is not initialized', async () => {
      // Execute and verify
      await expect(solanaService.createChallenge('test-id', 1)).rejects.toThrow('Program or wallet not initialized');
    });

    it('should create a challenge and return its address', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Execute
      const address = await solanaService.createChallenge('test-id', 1);
      
      // Verify
      expect(address).toBeDefined();
      expect(BN).toHaveBeenCalled();
      // Verify the program.methods.initializeChallenge was called
      expect((Program as jest.Mock).mock.results[0].value.methods.initializeChallenge).toHaveBeenCalledWith('test-id', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Mock the program method to throw an error
      (Program as jest.Mock).mockImplementationOnce(() => ({
        methods: {
          initializeChallenge: jest.fn().mockReturnValue({
            accounts: jest.fn().mockReturnThis(),
            signers: jest.fn().mockReturnThis(),
            rpc: jest.fn().mockRejectedValue(new Error('Blockchain error')),
          }),
        },
      }));
      
      // Execute and verify
      await expect(solanaService.createChallenge('test-id', 1)).rejects.toThrow('Blockchain error');
    });
  });

  describe('stakeInChallenge', () => {
    it('should throw error if wallet is not initialized', async () => {
      // Execute and verify
      await expect(solanaService.stakeInChallenge('challenge-address', 1)).rejects.toThrow('Program or wallet not initialized');
    });

    it('should stake tokens in a challenge', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Execute
      await solanaService.stakeInChallenge('challenge-address', 1);
      
      // Verify
      expect(PublicKey).toHaveBeenCalledWith('challenge-address');
      expect(BN).toHaveBeenCalled();
      // Verify the program.methods.stakeTokens was called
      expect((Program as jest.Mock).mock.results[0].value.methods.stakeTokens).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Mock the program method to throw an error
      (Program as jest.Mock).mockImplementationOnce(() => ({
        methods: {
          stakeTokens: jest.fn().mockReturnValue({
            accounts: jest.fn().mockReturnThis(),
            signers: jest.fn().mockReturnThis(),
            rpc: jest.fn().mockRejectedValue(new Error('Blockchain error')),
          }),
        },
      }));
      
      // Execute and verify
      await expect(solanaService.stakeInChallenge('challenge-address', 1)).rejects.toThrow();
    });
  });

  describe('distributeReward', () => {
    it('should throw error if wallet is not initialized', async () => {
      // Execute and verify
      await expect(solanaService.distributeReward('challenge-address', 'winner-address', 1)).rejects.toThrow('Program or wallet not initialized');
    });

    it('should distribute rewards', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Execute
      await solanaService.distributeReward('challenge-address', 'winner-address', 1);
      
      // Verify
      expect(PublicKey).toHaveBeenCalledWith('challenge-address');
      expect(PublicKey).toHaveBeenCalledWith('winner-address');
      expect(BN).toHaveBeenCalled();
      // Verify the program.methods.distributeReward was called
      expect((Program as jest.Mock).mock.results[0].value.methods.distributeReward).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([1, 2, 3, 4]));
      await solanaService.initializeWallet();
      
      // Mock the program method to throw an error
      (Program as jest.Mock).mockImplementationOnce(() => ({
        methods: {
          distributeReward: jest.fn().mockReturnValue({
            accounts: jest.fn().mockReturnThis(),
            signers: jest.fn().mockReturnThis(),
            rpc: jest.fn().mockRejectedValue(new Error('Blockchain error')),
          }),
        },
      }));
      
      // Execute and verify
      await expect(solanaService.distributeReward('challenge-address', 'winner-address', 1)).rejects.toThrow();
    });
  });
}); 