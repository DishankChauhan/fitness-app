export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'reward' | 'stake';
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  description?: string;
  challengeId?: string;
  txHash?: string;
}

export interface WalletStats {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  recentTransactions: Transaction[];
} 