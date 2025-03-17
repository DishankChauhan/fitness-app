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

// Constants
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const API_URL = process.env.API_URL;
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');
const MAX_RETRIES = 3;

export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  description: string;
  popular?: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'basic', tokens: 100, price: 4.99, description: 'Basic Package' },
  { id: 'popular', tokens: 500, price: 19.99, description: 'Popular Package', popular: true },
  { id: 'premium', tokens: 1000, price: 34.99, description: 'Premium Package' }
];

interface PaymentError extends Error {
  code?: string;
  declineCode?: string;
  stripeErrorCode?: string;
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

class PaymentService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!STRIPE_PUBLISHABLE_KEY) {
        throw new Error('Stripe publishable key is missing');
      }

      await initStripe({
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        merchantIdentifier: Platform.OS === 'ios' ? 'merchant.com.accountability' : undefined,
        urlScheme: 'your-url-scheme',
      });

      this.initialized = true;
      logAnalyticsEvent('payment_service_initialized');
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
  private handleError(error: PaymentError, operation: string): void {
    if (crashlytics) {
      crashlytics.recordError(error);
    }
    logAnalyticsEvent('payment_error', {
      operation,
      errorMessage: error.message,
      errorCode: error.code || error.stripeErrorCode || error.declineCode,
    });
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
        throw new Error('User must be authenticated to purchase tokens');
      }

      // Create payment intent on backend
      const paymentIntent = await retryWithBackoff(
        () => this.createPaymentIntent(tokenPackage.price, paymentMethodId),
        MAX_RETRIES
      );

      // Confirm payment with Stripe
      const { error: confirmError } = await confirmPayment(paymentIntent.clientSecret);

      if (confirmError) {
        throw confirmError;
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
      logAnalyticsEvent('token_purchase_success', {
        package_id: tokenPackage.id,
        amount: tokenPackage.price,
        tokens: tokenPackage.tokens,
      });

      return { success: true, transactionId: transactionRef.id };
    } catch (error) {
      const paymentError = error as PaymentError;
      this.handleError(paymentError, 'purchaseTokens');
      
      return {
        success: false,
        error: paymentError.message,
      };
    }
  }

  private async createPaymentIntent(
    amount: number,
    paymentMethodId: string
  ): Promise<PaymentIntentResponse> {
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
      throw new Error(error.message || 'Failed to create payment intent');
    }

    return response.json();
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