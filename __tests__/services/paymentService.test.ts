import { initStripe, confirmPayment } from '@stripe/stripe-react-native';
import { auth, crashlytics, logAnalyticsEvent } from '../../config/firebase';
import { paymentService, TokenPackage } from '../../services/paymentService';
import { env } from '../../config/env';
import {
  AuthenticationError,
  PaymentDeclinedError,
  PaymentMethodError,
  NetworkError,
} from '../../types/errors';
import firestore from '@react-native-firebase/firestore';

// Mock the external dependencies
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  confirmPayment: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  crashlytics: {
    recordError: jest.fn(),
    setAttributes: jest.fn(),
  },
  logAnalyticsEvent: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = {
    Timestamp: {
      now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    },
    FieldValue: {
      increment: jest.fn(amount => ({ _increment: amount })),
    },
    collection: jest.fn(),
    doc: jest.fn(),
  };
  return jest.fn(() => mockFirestore) as unknown as typeof firestore;
});

jest.mock('../../config/env', () => ({
  env: {
    api: {
      url: 'http://test-api.com',
      timeout: 5000,
    },
    stripe: {
      publishableKey: 'test_key',
      merchantId: 'test_merchant',
    },
    app: {
      maxRetries: 3,
    },
    features: {
      analytics: true,
      crashlytics: true,
    },
  },
}));

describe('PaymentService', () => {
  const mockUser = {
    uid: 'test-user-id',
    getIdToken: jest.fn().mockResolvedValue('test-token'),
  };

  const mockTokenPackage: TokenPackage = {
    id: 'test-package',
    tokens: 100,
    price: 9.99,
    description: 'Test Package',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (auth as any).currentUser = mockUser;
  });

  describe('initialization', () => {
    it('should initialize Stripe successfully', async () => {
      (initStripe as jest.Mock).mockResolvedValueOnce(undefined);
      
      await paymentService['initialize']();
      
      expect(initStripe).toHaveBeenCalledWith({
        publishableKey: env.stripe.publishableKey,
        merchantIdentifier: env.stripe.merchantId,
        urlScheme: 'accountability-app',
      });
      expect(logAnalyticsEvent).toHaveBeenCalledWith('payment_service_initialized');
    });

    it('should throw error if Stripe publishable key is missing', async () => {
      const envWithoutKey = { ...env, stripe: { ...env.stripe, publishableKey: '' } };
      jest.mock('../../config/env', () => ({ env: envWithoutKey }));

      await expect(paymentService['initialize']()).rejects.toThrow('Stripe publishable key is missing');
    });
  });

  describe('purchaseTokens', () => {
    const mockPaymentIntent = {
      id: 'test-intent-id',
      clientSecret: 'test-secret',
      status: 'requires_confirmation',
    };

    const mockTransactionRef = {
      id: 'test-transaction-id',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaymentIntent),
      });
      
      (confirmPayment as jest.Mock).mockResolvedValueOnce({ error: null });

      const mockFirestore = {
        collection: jest.fn().mockReturnThis(),
        add: jest.fn().mockResolvedValue(mockTransactionRef),
        doc: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(undefined),
      };

      (firestore as unknown as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should process purchase successfully', async () => {
      const result = await paymentService.purchaseTokens(mockTokenPackage, 'test-payment-method');

      expect(result).toEqual({
        success: true,
        transactionId: 'test-transaction-id',
      });

      expect(logAnalyticsEvent).toHaveBeenCalledWith('token_purchase_success', {
        package_id: mockTokenPackage.id,
        amount: mockTokenPackage.price,
        tokens: mockTokenPackage.tokens,
      });
    });

    it('should throw AuthenticationError if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const result = await paymentService.purchaseTokens(mockTokenPackage, 'test-payment-method');

      expect(result).toEqual({
        success: false,
        error: 'Please sign in to continue',
      });
    });

    it('should handle declined payment', async () => {
      (confirmPayment as jest.Mock).mockResolvedValueOnce({
        error: {
          type: 'card_error',
          code: 'card_declined',
          declineCode: 'insufficient_funds',
          message: 'Your card was declined',
        },
      });

      const result = await paymentService.purchaseTokens(mockTokenPackage, 'test-payment-method');

      expect(result).toEqual({
        success: false,
        error: 'Your card has insufficient funds. Please try a different card.',
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await paymentService.purchaseTokens(mockTokenPackage, 'test-payment-method');

      expect(result).toEqual({
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection and try again.',
      });
    });
  });

  describe('getPaymentMethods', () => {
    const mockPaymentMethods = [
      {
        id: 'pm_test1',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2024,
        },
      },
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaymentMethods),
      });
    });

    it('should fetch payment methods successfully', async () => {
      const result = await paymentService.getPaymentMethods();

      expect(result).toEqual(mockPaymentMethods);
      expect(global.fetch).toHaveBeenCalledWith(
        `${env.api.url}/payment-methods`,
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
          },
        })
      );
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await paymentService.getPaymentMethods();

      expect(result).toEqual([]);
      if (crashlytics) {
        expect(crashlytics.recordError).toHaveBeenCalled();
      }
    });
  });

  describe('error handling', () => {
    it('should log errors to crashlytics and analytics', async () => {
      const error = new PaymentMethodError('Test error', 'TEST_ERROR');
      
      paymentService['handleError'](error, 'test_operation');

      if (crashlytics) {
        expect(crashlytics.recordError).toHaveBeenCalledWith(error);
        expect(crashlytics.setAttributes).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: 'PAYMENT_METHOD_ERROR',
            operation: 'test_operation',
          })
        );
      }
      expect(logAnalyticsEvent).toHaveBeenCalledWith('error_occurred', {
        error_type: 'PaymentMethodError',
        error_code: 'PAYMENT_METHOD_ERROR',
        operation: 'test_operation',
        message: 'Test error',
      });
    });
  });
}); 