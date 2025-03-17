import { useState, useEffect } from 'react';
import { HealthData } from '@/types/health';
import { healthService } from '@/services/healthService';

export function useHealthData() {
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    activeMinutes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealthData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await healthService.getHealthData();
        if (data) {
          setHealthData({
            steps: data.steps,
            calories: data.calories || 0,
            activeMinutes: data.activeMinutes,
          });
        } else {
          throw new Error('No health data available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHealthData();
    // Refresh health data every 5 minutes
    const interval = setInterval(fetchHealthData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { healthData, isLoading, error };
} 