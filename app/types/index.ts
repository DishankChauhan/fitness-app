export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface DayProgress {
  date: Date;
  tasksCompleted: number;
  totalTasks: number;
  streakMaintained: boolean;
}

export interface UserSettings {
  dailyTaskGoal: number;
  reminderTime?: string;
  streakCount: number;
  lastCompletedDate?: Date;
}

export type TaskFilter = 'all' | 'completed' | 'pending'; 