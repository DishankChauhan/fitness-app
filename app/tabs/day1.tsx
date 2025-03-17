import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { TaskList } from '../components/TaskList';
import { AddTask } from '../components/AddTask';
import { ProgressHeader } from '../components/ProgressHeader';
import { useTasks } from '../hooks/useTasks';
import { useProgress } from '../hooks/useProgress';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function Day1Screen() {
  const { tasks, isLoading: tasksLoading, addTask, toggleTask, deleteTask } = useTasks();
  const { settings, todayProgress, isLoading: progressLoading, updateProgress } = useProgress();
  const colorScheme = useColorScheme();

  // Update progress whenever tasks change
  useEffect(() => {
    const completedTasks = tasks.filter(task => task.completed).length;
    updateProgress(completedTasks, tasks.length);
  }, [tasks, updateProgress]);

  if (tasksLoading || progressLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProgressHeader progress={todayProgress} settings={settings} />
      <TaskList
        tasks={tasks}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
      />
      <AddTask onAddTask={addTask} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
}); 