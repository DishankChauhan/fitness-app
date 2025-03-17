/**
 * Utility function to retry an async operation with exponential backoff
 * @param operation The async operation to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds (default: 1000ms)
 * @param maxDelay Maximum delay in milliseconds (default: 10000ms)
 * @returns The result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        Math.pow(2, attempt) * baseDelay + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
} 