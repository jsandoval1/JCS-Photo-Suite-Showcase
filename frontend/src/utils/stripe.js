import { loadStripe } from '@stripe/stripe-js';

// Load Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
export const stripePromise = loadStripe(stripePublishableKey);

// Element styling options for Stripe
export const elementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
    complete: {
      color: '#059669',
    },
  },
}; 