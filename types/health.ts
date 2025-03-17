export interface HealthData {
  steps: number;
  activeMinutes: number;
  calories: number;
}

export interface ActivityData {
  timestamp: number;
  steps: number;
  isActive: boolean;
}

// Constants for calculations
export const ACTIVITY_THRESHOLDS = {
  STEPS_PER_MINUTE_ACTIVE: 100, // Consider active if walking more than 100 steps per minute
  CALORIES_PER_STEP: 0.04, // Average calories burned per step
  ACTIVE_CALORIES_MULTIPLIER: 1.5, // Multiply calories by 1.5 during active minutes
}; 