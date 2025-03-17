import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import HealthDataCard from '../../components/HealthDataCard';
import { useHealthData } from '../../hooks/useHealthData';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { healthData, isLoading } = useHealthData();

  // TODO: Fetch actual challenge data
  const challenge = {
    id: id as string,
    title: '10K Steps Challenge',
    description: 'Walk 10,000 steps every day for 7 days',
    goal: 10000,
    duration: 7,
    stake: 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    participants: 5,
    totalPrizePool: 500,
  };

  const handleJoinChallenge = () => {
    Alert.alert(
      'Join Challenge',
      `Are you sure you want to join this challenge? You'll need to stake ${challenge.stake} tokens.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: () => {
            // TODO: Implement challenge joining logic
            console.log('Joining challenge:', challenge.id);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{challenge.title}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.description}>{challenge.description}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={24} color={Colors.light.tint} />
            <Text style={styles.statLabel}>{challenge.duration} Days</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={24} color={Colors.light.tint} />
            <Text style={styles.statLabel}>{challenge.participants} Participants</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="wallet-outline" size={24} color={Colors.light.tint} />
            <Text style={styles.statLabel}>{challenge.totalPrizePool} Tokens</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.goalSection}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <HealthDataCard data={healthData} isLoading={false} />
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((healthData.steps / challenge.goal) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {healthData.steps} / {challenge.goal} steps
          </Text>
        </View>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinChallenge}
        >
          <Text style={styles.joinButtonText}>Join Challenge</Text>
          <Text style={styles.stakeText}>Stake {challenge.stake} Tokens</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: 4,
    color: '#757575',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  goalSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stakeText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
}); 