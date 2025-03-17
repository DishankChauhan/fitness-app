declare module 'expo-health' {
  export enum Permission {
    STEPS = 'steps',
    DISTANCE = 'distance',
    CALORIES = 'calories',
    HEART_RATE = 'heartRate',
    SLEEP = 'sleep'
  }

  export function isAvailable(): Promise<boolean>;
  export function requestPermissionsAsync(permissions: Permission[]): Promise<Permission[]>;
  export function getStepsAsync(startDate: Date, endDate: Date): Promise<number>;
  export function getDistanceWalkingRunningAsync(startDate: Date, endDate: Date): Promise<number>;
  export function getActiveEnergyBurnedAsync(startDate: Date, endDate: Date): Promise<number>;
  export function getHeartRateAsync(startDate: Date, endDate: Date): Promise<Array<{ value: number }>>;
  export function getSleepAsync(startDate: Date, endDate: Date): Promise<Array<{ startDate: Date; endDate: Date }>>;
} 