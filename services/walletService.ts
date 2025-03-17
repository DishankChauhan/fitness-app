import { solanaService } from './solanaService';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import * as authService from './authService';

export interface WalletStats {
  totalStaked: number;
  availableBalance: number;
  pendingRewards: number;
  totalEarned: number;
}

export interface Transaction {
  id: string;
  type: 'stake' | 'reward' | 'withdrawal';
  amount: number;
  timestamp: Date;
  status: 'pending' | 'completed';
  challengeId?: string;
  txHash?: string;
  userId: string;
}

export async function getWalletStats(): Promise<WalletStats> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  // Get available balance from Solana
  let availableBalance = 0;
  try {
    await solanaService.initializeWallet();
    availableBalance = await solanaService.getBalance();
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
  }

  // Get user data from Firestore to calculate other stats
  const userDoc = await getDoc(doc(db, 'users', currentUser.id));
  if (!userDoc.exists()) throw new Error('User not found');
  
  const userData = userDoc.data();

  // Calculate total staked from active challenges
  const userChallengesQuery = query(
    collection(db, 'userChallenges'),
    where('userId', '==', currentUser.id),
    where('status', '==', 'active')
  );
  const userChallenges = await getDocs(userChallengesQuery);
  const totalStaked = userChallenges.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.stakedAmount || 0);
  }, 0);

  // Calculate pending rewards from challenges
  const pendingRewardsQuery = query(
    collection(db, 'rewards'),
    where('userId', '==', currentUser.id),
    where('status', '==', 'pending')
  );
  const pendingRewardsSnapshot = await getDocs(pendingRewardsQuery);
  const pendingRewards = pendingRewardsSnapshot.docs.reduce((sum, doc) => {
    return sum + doc.data().amount;
  }, 0);

  // Calculate total earned from completed transactions
  const rewardTransactionsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', currentUser.id),
    where('type', '==', 'reward'),
    where('status', '==', 'completed')
  );
  const rewardTransactions = await getDocs(rewardTransactionsQuery);
  const totalEarned = rewardTransactions.docs.reduce((sum, doc) => {
    return sum + doc.data().amount;
  }, 0);

  return {
    totalStaked,
    availableBalance,
    pendingRewards,
    totalEarned
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', currentUser.id),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(transactionsQuery);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      amount: data.amount,
      timestamp: data.timestamp.toDate(),
      status: data.status,
      challengeId: data.challengeId,
      txHash: data.txHash,
      userId: data.userId
    };
  });
}

export async function withdrawFunds(amount: number): Promise<Transaction> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  // Initialize Solana wallet
  await solanaService.initializeWallet();
  
  // Check if user has sufficient balance
  const balance = await solanaService.getBalance();
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }

  // Create transaction record in Firestore
  const transaction: Omit<Transaction, 'id'> = {
    type: 'withdrawal',
    amount,
    timestamp: new Date(),
    status: 'pending',
    userId: currentUser.id
  };

  const transactionRef = await addDoc(collection(db, 'transactions'), transaction);

  // Perform the actual withdrawal on Solana
  try {
    // For a real app you'd need to add a withdraw method to solanaService
    // For now we'll simulate success after a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update transaction status
    await updateDoc(transactionRef, {
      status: 'completed',
      txHash: 'solana_tx_hash_' + Math.random().toString(36).substring(2)
    });

    return {
      ...transaction,
      id: transactionRef.id,
      status: 'completed'
    };
  } catch (error) {
    console.error('Withdrawal failed:', error);
    await updateDoc(transactionRef, { status: 'failed' });
    throw new Error('Withdrawal failed');
  }
}

export async function stakeInChallenge(challengeId: string, amount: number): Promise<Transaction> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  // Initialize Solana wallet
  await solanaService.initializeWallet();
  
  // Check if user has sufficient balance
  const balance = await solanaService.getBalance();
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }

  // Create transaction record in Firestore
  const transaction: Omit<Transaction, 'id'> = {
    type: 'stake',
    amount,
    timestamp: new Date(),
    status: 'pending',
    challengeId,
    userId: currentUser.id
  };

  const transactionRef = await addDoc(collection(db, 'transactions'), transaction);

  // Perform the actual staking on Solana
  try {
    await solanaService.stakeInChallenge(challengeId, amount);
    
    // Update transaction status
    await updateDoc(transactionRef, {
      status: 'completed'
    });

    // Update user challenge record with staked amount
    const userChallengeQuery = query(
      collection(db, 'userChallenges'),
      where('userId', '==', currentUser.id),
      where('challengeId', '==', challengeId)
    );
    
    const userChallengeSnapshot = await getDocs(userChallengeQuery);
    if (!userChallengeSnapshot.empty) {
      const userChallengeDoc = userChallengeSnapshot.docs[0];
      const userData = userChallengeDoc.data();
      await updateDoc(userChallengeDoc.ref, {
        stakedAmount: (userData.stakedAmount || 0) + amount
      });
    }

    return {
      ...transaction,
      id: transactionRef.id,
      status: 'completed'
    };
  } catch (error) {
    console.error('Staking failed:', error);
    await updateDoc(transactionRef, { status: 'failed' });
    throw new Error('Staking failed');
  }
} 