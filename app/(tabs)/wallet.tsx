import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import { Button } from '@/components/Button';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TextInput } from '@/components/ui/TextInput';
import * as walletService from '@/services/walletService';
import type { WalletStats, Transaction } from '@/services/walletService';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalStaked: 0,
    availableBalance: 0,
    pendingRewards: 0,
    totalEarned: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const stats = await walletService.getWalletStats();
      const transactionHistory = await walletService.getTransactions();
      
      setWalletStats(stats);
      setTransactions(transactionHistory);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > walletStats.availableBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setWithdrawing(true);
      await walletService.withdrawFunds(parseFloat(withdrawAmount));
      Alert.alert('Success', 'Withdrawal initiated successfully');
      setWithdrawAmount('');
      loadWalletData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process withdrawal';
      Alert.alert('Error', errorMessage);
    } finally {
      setWithdrawing(false);
    }
  };

  const StatCard = ({ title, amount, icon }: { title: string; amount: number; icon: IconSymbolName }) => (
    <AnimatedThemedView
      entering={FadeInDown}
      style={[styles.statCard, { backgroundColor: colors.card }]}
    >
      <IconSymbol name={icon} size={24} color={colors.tint} />
      <ThemedText style={styles.statAmount}>${amount.toFixed(2)}</ThemedText>
      <ThemedText style={styles.statTitle}>{title}</ThemedText>
    </AnimatedThemedView>
  );

  const TransactionItem = ({ transaction }: { transaction: Transaction }) => (
    <AnimatedThemedView
      entering={FadeInDown}
      style={[styles.transactionItem, { backgroundColor: colors.card }]}
    >
      <ThemedView style={styles.transactionIcon}>
        <IconSymbol
          name={
            transaction.type === 'stake'
              ? 'arrow.down.circle.fill'
              : transaction.type === 'reward'
              ? 'star.circle.fill'
              : 'arrow.up.circle.fill'
          }
          size={24}
          color={
            transaction.type === 'stake'
              ? colors.tint
              : transaction.type === 'reward'
              ? '#FFD700'
              : '#FF6B6B'
          }
        />
      </ThemedView>
      <ThemedView style={styles.transactionInfo}>
        <ThemedText style={styles.transactionType}>
          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </ThemedText>
        <ThemedText style={styles.transactionDate}>
          {transaction.timestamp.toLocaleDateString()}
        </ThemedText>
      </ThemedView>
      <ThemedText style={[styles.transactionAmount, transaction.type === 'withdrawal' && styles.withdrawal]}>
        {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount.toFixed(2)}
      </ThemedText>
    </AnimatedThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.statsGrid}>
          <StatCard title="Total Staked" amount={walletStats.totalStaked} icon="dollarsign.circle" />
          <StatCard title="Available" amount={walletStats.availableBalance} icon="wallet.pass" />
          <StatCard title="Pending Rewards" amount={walletStats.pendingRewards} icon="hourglass" />
          <StatCard title="Total Earned" amount={walletStats.totalEarned} icon="star.circle" />
        </ThemedView>

        <ThemedView style={styles.withdrawalSection}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Withdraw Funds
          </ThemedText>
          <TextInput
            placeholder="Enter amount"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Button
            onPress={handleWithdraw}
            loading={withdrawing}
            disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            style={styles.withdrawButton}
          >
            Withdraw
          </Button>
        </ThemedView>

        <ThemedView style={styles.transactionsSection}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Recent Transactions
          </ThemedText>
          {transactions.map(transaction => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statAmount: {
    fontSize: 24,
    fontWeight: '600',
  },
  statTitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  withdrawalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  withdrawButton: {
    width: '100%',
  },
  transactionsSection: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  withdrawal: {
    color: '#FF6B6B',
  },
}); 