import { useState, useEffect, useCallback } from 'react';
import { HealthData } from '../types/health';
import { healthService } from '../services/healthService';

interface HealthDataHook {
  healthData: HealthData;
  isLoading: boolean;
  error: string | null;
  refreshHealthData: () => Promise<void>;
}

export function useHealthData(): HealthDataHook {
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    activeMinutes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await healthService.getHealthData();
      if (data) {
        setHealthData(data);
      } else {
        setError('Failed to fetch health data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initializeHealth() {
      try {
        const isAvailable = await healthService.initialize();
        if (!isAvailable) {
          setError('Pedometer is not available on this device');
          return;
        }
        const hasPermission = await healthService.requestPermissions();
        if (!hasPermission) {
          setError('Permission to access pedometer was denied');
          return;
        }
        await fetchHealthData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize health tracking');
        setIsLoading(false);
      }
    }

    initializeHealth();
    const interval = setInterval(fetchHealthData, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      healthService.cleanup();
    };
  }, [fetchHealthData]);

  return { healthData, isLoading, error, refreshHealthData: fetchHealthData };
}