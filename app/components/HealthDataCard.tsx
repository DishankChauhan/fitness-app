import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { HealthData } from '@/types/health';

interface HealthDataCardProps {
  data: HealthData;
  isLoading: boolean;
}

export default function HealthDataCard({ data, isLoading }: HealthDataCardProps) {
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading health data...</ThemedText>
      </ThemedView>
    );
  }

  const metrics = [
    {
      icon: 'footsteps',
      label: 'Steps',
      value: data.steps || 0,
      target: 10000,
    },
    {
      icon: 'heart',
      label: 'Active Minutes',
      value: data.activeMinutes || 0,
      target: 30,
    },
    {
      icon: 'flame',
      label: 'Calories',
      value: data.calories || 0,
      target: 2000,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {metrics.map((metric, index) => (
        <View key={metric.label} style={[styles.metric, index > 0 && styles.metricBorder]}>
          <View style={styles.metricIcon}>
            <Ionicons name={metric.icon as any} size={24} color={Colors.light.tint} />
          </View>
          <View style={styles.metricContent}>
            <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
            <View style={styles.metricProgress}>
              <ThemedText type="defaultSemiBold">{metric.value}</ThemedText>
              <ThemedText style={styles.metricTarget}>/ {metric.target}</ThemedText>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricBorder: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricContent: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#757575',
  },
  metricProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricTarget: {
    fontSize: 12,
    color: '#757575',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
}); 