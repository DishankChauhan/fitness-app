export interface HealthData {
  steps: number;
  calories: number;
  activeMinutes: number;
  distance?: number;
  lastUpdated?: Date;
}

export interface HealthGoal {
  type: 'steps' | 'calories' | 'distance' | 'activeMinutes';
  target: number;
  current: number;
  unit: string;
}

export interface HealthPermissions {
  steps: boolean;
  calories: boolean;
  distance: boolean;
  activeMinutes: boolean;
} 