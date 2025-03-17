import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';
import { nanoid } from 'nanoid';

const TASKS_STORAGE_KEY = '@accountability_app_tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from storage
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks).map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save tasks to storage
  const saveTasks = async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const addTask = useCallback((title: string) => {
    const newTask: Task = {
      id: nanoid(),
      title,
      completed: false,
      createdAt: new Date(),
    };
    setTasks(currentTasks => {
      const updatedTasks = [...currentTasks, newTask];
      saveTasks(updatedTasks);
      return updatedTasks;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setTasks(currentTasks => {
      const updatedTasks = currentTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? new Date() : undefined,
            }
          : task
      );
      saveTasks(updatedTasks);
      return updatedTasks;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(currentTasks => {
      const updatedTasks = currentTasks.filter(task => task.id !== taskId);
      saveTasks(updatedTasks);
      return updatedTasks;
    });
  }, []);

  return {
    tasks,
    isLoading,
    addTask,
    toggleTask,
    deleteTask,
  };
} 