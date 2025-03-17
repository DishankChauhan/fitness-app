import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DayProgress, UserSettings } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface ProgressHeaderProps {
  progress: DayProgress;
  settings: UserSettings;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({ progress, settings }) => {
  const progressPercentage = progress.totalTasks > 0
    ? Math.round((progress.tasksCompleted / settings.dailyTaskGoal) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.streakContainer}>
        <Ionicons name="flame" size={24} color="#FF9800" />
        <Text style={styles.streakText}>{settings.streakCount} Day Streak</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {progress.tasksCompleted} / {settings.dailyTaskGoal} Tasks
          </Text>
          <Text style={styles.percentageText}>{progressPercentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(progressPercentage, 100)}%` },
              progressPercentage >= 100 && styles.completedProgressBar,
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  progressContainer: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#757575',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  completedProgressBar: {
    backgroundColor: '#4CAF50',
  },
}); 