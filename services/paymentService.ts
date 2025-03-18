import { Platform } from 'react-native';
import {
  initStripe,
  createPaymentMethod,
  confirmPayment,
  CardField,
  useStripe,
  ConfirmPaymentResult,
} from '@stripe/stripe-react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { auth, db, crashlytics, logAnalyticsEvent } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { retryWithBackoff } from '../utils/retry';
import firestore from '@react-native-firebase/firestore';
import { env } from '../config/env';
import {
  AppError,
  AuthenticationError,
  InsufficientFundsError,
  PaymentDeclinedError,
  PaymentMethodError,
  NetworkError,
} from '../types/errors';

// Constants from environment
const API_URL = env.api.url;
const API_TIMEOUT = env.api.timeout;
const MAX_RETRIES = env.app.maxRetries;

export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  description: string;
  popular?: boolean;
}

interface StripeError {
  type: string;
  code: string;
  message: string;
  declineCode?: string;
}

interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  status: string;
}

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postalCode?: string;
      state?: string;
    };
  };
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'basic', tokens: 100, price: 4.99, description: 'Basic Package' },
  { id: 'popular', tokens: 500, price: 19.99, description: 'Popular Package', popular: true },
  { id: 'premium', tokens: 1000, price: 34.99, description: 'Premium Package' }
];

class PaymentService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const { publishableKey, merchantId } = env.stripe;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key is missing');
      }

      await initStripe({
        publishableKey,
        merchantIdentifier: merchantId,
        urlScheme: 'accountability-app',
      });

      this.initialized = true;
      if (env.features.analytics) {
        logAnalyticsEvent('payment_service_initialized');
      }
    } catch (error) {
      this.handleError(error as Error, 'initialize');
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private handleError(error: Error, operation: string): void {
    if (error instanceof AppError) {
      if (crashlytics && env.features.crashlytics) {
        crashlytics.recordError(error);
        const attributes: Record<string, string> = {
          errorCode: error.code,
          operation,
        };
        if (error instanceof PaymentMethodError && error.stripeError) {
          if (error.stripeError.type) attributes.type = error.stripeError.type;
          if (error.stripeError.code) attributes.code = error.stripeError.code;
          if (error.stripeError.declineCode) attributes.declineCode = error.stripeError.declineCode;
        }
        crashlytics.setAttributes(attributes);
      }
      if (env.features.analytics) {
        logAnalyticsEvent('error_occurred', {
          error_type: error.name,
          error_code: error.code,
          operation,
          message: error.message,
        });
      }
    } else {
      // Unknown error
      if (crashlytics && env.features.crashlytics) {
        crashlytics.recordError(error);
      }
      if (env.features.analytics) {
        logAnalyticsEvent('unknown_error', {
          operation,
          message: error.message,
        });
      }
    }
  }

  async purchaseTokens(
    tokenPackage: TokenPackage,
    paymentMethodId: string,
    retryCount = 0
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      await this.ensureInitialized();
      
      const user = auth.currentUser;
      if (!user) {
        throw new AuthenticationError();
      }

      // Create payment intent on backend
      const paymentIntent = await retryWithBackoff(
        () => this.createPaymentIntent(tokenPackage.price, paymentMethodId),
        MAX_RETRIES
      );

      // Confirm payment with Stripe
      const { error: confirmError } = await confirmPayment(paymentIntent.clientSecret);

      if (confirmError) {
        const stripeError = confirmError as unknown as StripeError;
        if (stripeError.type === 'card_error' && stripeError.code === 'card_declined') {
          throw new PaymentDeclinedError(stripeError.declineCode || 'unknown');
        }
        throw new PaymentMethodError(stripeError.message, stripeError.code || 'unknown');
      }

      // Record transaction in Firestore
      const transactionRef = await firestore().collection('transactions').add({
        userId: user.uid,
        packageId: tokenPackage.id,
        tokens: tokenPackage.tokens,
        amount: tokenPackage.price,
        status: 'completed',
        timestamp: firestore.Timestamp.now(),
        paymentMethodId,
        paymentIntentId: paymentIntent.id,
      });

      // Update user's token balance
      await firestore().collection('users').doc(user.uid).update({
        tokens: firestore.FieldValue.increment(tokenPackage.tokens),
        lastPurchase: firestore.Timestamp.now(),
      });

      // Log successful purchase
      if (env.features.analytics) {
        logAnalyticsEvent('token_purchase_success', {
          package_id: tokenPackage.id,
          amount: tokenPackage.price,
          tokens: tokenPackage.tokens,
        });
      }

      return { success: true, transactionId: transactionRef.id };
    } catch (error) {
      this.handleError(error as Error, 'purchaseTokens');
      
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.userMessage,
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      };
    }
  }

  private async createPaymentIntent(
    amount: number,
    paymentMethodId: string
  ): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          paymentMethodId,
          currency: 'usd',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new PaymentMethodError(
          error.message || 'Failed to create payment intent',
          'PAYMENT_INTENT_ERROR'
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw new PaymentMethodError(
        'Failed to create payment intent',
        'UNKNOWN_ERROR'
      );
    }
  }

  async getPaymentMethods(): Promise<StripePaymentMethod[]> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to get payment methods');
      }

      const response = await fetch(`${API_URL}/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      return response.json();
    } catch (error) {
      this.handleError(error as Error, 'getPaymentMethods');
      return [];
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to delete payment method');
      }

      const response = await fetch(`${API_URL}/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      logAnalyticsEvent('payment_method_deleted');
      return true;
    } catch (error) {
      this.handleError(error as Error, 'deletePaymentMethod');
      return false;
    }
  }

  getTokenPackages(): TokenPackage[] {
    return TOKEN_PACKAGES;
  }
}

export const paymentService = new PaymentService(); 