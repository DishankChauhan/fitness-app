export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class PaymentError extends AppError {
  constructor(
    message: string,
    code: string,
    userMessage: string,
    public stripeError?: {
      type?: string;
      code?: string;
      declineCode?: string;
      metadata?: Record<string, any>;
    }
  ) {
    super(message, code, userMessage);
    this.name = 'PaymentError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(
      message,
      'AUTH_REQUIRED',
      'Please sign in to continue'
    );
    this.name = 'AuthenticationError';
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(available: number, required: number) {
    super(
      `Insufficient funds: ${available} available, ${required} required`,
      'INSUFFICIENT_FUNDS',
      'You don\'t have enough tokens for this transaction',
      {
        type: 'insufficient_funds',
        code: 'INSUFFICIENT_FUNDS',
        metadata: { available, required }
      }
    );
  }
}

export class PaymentDeclinedError extends PaymentError {
  constructor(declineCode: string) {
    const userMessage = getDeclineMessage(declineCode);
    super(
      `Payment declined: ${declineCode}`,
      'PAYMENT_DECLINED',
      userMessage,
      {
        type: 'card_declined',
        declineCode,
        metadata: { declineCode }
      }
    );
  }
}

export class PaymentMethodError extends PaymentError {
  constructor(message: string, code: string) {
    super(
      message,
      'PAYMENT_METHOD_ERROR',
      'There was an issue with your payment method. Please try a different card or contact support.',
      {
        type: 'payment_method_error',
        code,
        metadata: { code }
      }
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(
      message,
      'NETWORK_ERROR',
      'Unable to connect to the server. Please check your internet connection and try again.'
    );
    this.name = 'NetworkError';
  }
}

function getDeclineMessage(declineCode: string): string {
  const declineMessages: Record<string, string> = {
    'insufficient_funds': 'Your card has insufficient funds. Please try a different card.',
    'lost_card': 'This card has been reported lost. Please use a different card.',
    'stolen_card': 'This card has been reported stolen. Please use a different card.',
    'expired_card': 'This card has expired. Please update your card information.',
    'incorrect_cvc': 'The security code is incorrect. Please check and try again.',
    'processing_error': 'There was an error processing your card. Please try again.',
    'incorrect_number': 'The card number is incorrect. Please check and try again.',
    default: 'Your payment was declined. Please try a different payment method or contact your bank.',
  };

  return declineMessages[declineCode] || declineMessages.default;
} 