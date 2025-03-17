import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import { IDL } from '../target/types/accountability_program';

const WALLET_KEY = 'SOLANA_WALLET_KEY';
const PROGRAM_ID = new PublicKey('your_program_id_here');
const NETWORK = 'https://api.devnet.solana.com';

interface StakeTransaction {
  challengeId: string;
  amount: number;
  participantKey: PublicKey;
}

class SolanaService {
  private static instance: SolanaService;
  private connection: Connection;
  private provider: AnchorProvider | null = null;
  private program: Program | null = null;
  private wallet: Keypair | null = null;

  private constructor() {
    this.connection = new Connection(NETWORK, 'confirmed');
  }

  public static getInstance(): SolanaService {
    if (!SolanaService.instance) {
      SolanaService.instance = new SolanaService();
    }
    return SolanaService.instance;
  }

  async initializeWallet(): Promise<void> {
    try {
      const storedKey = await SecureStore.getItemAsync('solana_private_key');
      if (storedKey) {
        const privateKey = new Uint8Array(JSON.parse(storedKey));
        this.wallet = Keypair.fromSecretKey(privateKey);
      } else {
        this.wallet = Keypair.generate();
        await SecureStore.setItemAsync(
          'solana_private_key',
          JSON.stringify(Array.from(this.wallet.secretKey))
        );
      }

      this.provider = new AnchorProvider(
        this.connection,
        {
          publicKey: this.wallet.publicKey,
          signTransaction: async (tx) => {
            tx.partialSign(this.wallet!);
            return tx;
          },
          signAllTransactions: async (txs) => {
            txs.forEach(tx => tx.partialSign(this.wallet!));
            return txs;
          }
        },
        { commitment: 'confirmed' }
      );

      this.program = new Program(IDL, PROGRAM_ID, this.provider);
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async createChallenge(challengeId: string, stakeAmount: number): Promise<string> {
    if (!this.program || !this.wallet) {
      throw new Error('Program or wallet not initialized');
    }

    const challengeAccount = Keypair.generate();
    const amountInLamports = new BN(stakeAmount * LAMPORTS_PER_SOL);

    try {
      await this.program.methods
        .initializeChallenge(challengeId, amountInLamports)
        .accounts({
          challenge: challengeAccount.publicKey,
          authority: this.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([challengeAccount])
        .rpc();

      return challengeAccount.publicKey.toString();
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  }

  async stakeInChallenge(challengeAddress: string, amount: number): Promise<void> {
    if (!this.program || !this.wallet) {
      throw new Error('Program or wallet not initialized');
    }

    const challengePubkey = new PublicKey(challengeAddress);
    const amountInLamports = new BN(amount * LAMPORTS_PER_SOL);

    try {
      await this.program.methods
        .stakeTokens(amountInLamports)
        .accounts({
          challenge: challengePubkey,
          participant: this.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([this.wallet])
        .rpc();
    } catch (error) {
      console.error('Error staking in challenge:', error);
      throw error;
    }
  }

  async distributeReward(challengeAddress: string, winnerAddress: string, amount: number): Promise<void> {
    if (!this.program || !this.wallet) {
      throw new Error('Program or wallet not initialized');
    }

    const challengePubkey = new PublicKey(challengeAddress);
    const winnerPubkey = new PublicKey(winnerAddress);
    const amountInLamports = new BN(amount * LAMPORTS_PER_SOL);

    try {
      await this.program.methods
        .distributeReward(amountInLamports)
        .accounts({
          challenge: challengePubkey,
          winner: winnerPubkey,
          authority: this.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([this.wallet])
        .rpc();
    } catch (error) {
      console.error('Error distributing reward:', error);
      throw error;
    }
  }
}

export const solanaService = SolanaService.getInstance(); 