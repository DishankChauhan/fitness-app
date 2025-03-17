import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, RefreshControl } from 'react-native';
import HealthDataCard from './components/HealthDataCard';
import { useHealthData } from './hooks/useHealthData';
import { Colors } from './constants/Colors';
import { useColorScheme } from './hooks/useColorScheme';
export default function HomeScreen() {
  const { healthData, isLoading, error } = useHealthData();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  function refreshHealthData(): void {
    throw new Error('Function not implemented.');
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshHealthData} />
      }
    >
      <Text style={styles.title}>Today's Activity</Text>
      <HealthDataCard data={healthData} isLoading={isLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    padding: 16,
    paddingBottom: 0,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
}); 