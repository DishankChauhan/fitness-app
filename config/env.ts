import { Platform } from 'react-native';

interface EnvConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  stripe: {
    publishableKey: string;
    merchantId: string | undefined;
  };
  api: {
    url: string;
    timeout: number;
  };
  app: {
    maxRetries: number;
    environment: 'development' | 'staging' | 'production';
  };
  solana: {
    network: 'devnet' | 'testnet' | 'mainnet-beta';
    rpcUrl: string;
  };
  features: {
    analytics: boolean;
    crashlytics: boolean;
    performance: boolean;
  };
}

function validateEnvVariable(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvConfig(): EnvConfig {
  try {
    return {
      firebase: {
        apiKey: validateEnvVariable('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
        authDomain: validateEnvVariable('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
        projectId: validateEnvVariable('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
        storageBucket: validateEnvVariable('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
        messagingSenderId: validateEnvVariable('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
        appId: validateEnvVariable('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
        measurementId: validateEnvVariable('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID),
      },
      stripe: {
        publishableKey: validateEnvVariable('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY),
        merchantId: Platform.OS === 'ios' ? validateEnvVariable('EXPO_PUBLIC_STRIPE_MERCHANT_ID', process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID) : undefined,
      },
      api: {
        url: validateEnvVariable('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
        timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
      },
      app: {
        maxRetries: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || '3'),
        environment: (process.env.EXPO_PUBLIC_APP_ENV || 'development') as EnvConfig['app']['environment'],
      },
      solana: {
        network: (validateEnvVariable('EXPO_PUBLIC_SOLANA_NETWORK', process.env.EXPO_PUBLIC_SOLANA_NETWORK)) as EnvConfig['solana']['network'],
        rpcUrl: validateEnvVariable('EXPO_PUBLIC_SOLANA_RPC_URL', process.env.EXPO_PUBLIC_SOLANA_RPC_URL),
      },
      features: {
        analytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
        crashlytics: process.env.EXPO_PUBLIC_ENABLE_CRASHLYTICS === 'true',
        performance: process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE === 'true',
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Environment configuration error: ${error.message}`);
    }
    throw error;
  }
}

export const env = getEnvConfig(); 