import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement,
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import Button from '../ui/Button';
import paymentService from '../../services/payment';
import { getPaymentButtonPrice } from '../../utils/pricing';
import './PaymentForm.css';

// Load Stripe with debugging
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
console.log('🔑 Loading Stripe with key:', stripePublishableKey ? stripePublishableKey.substring(0, 12) + '...' : 'NOT SET');
const stripePromise = loadStripe(stripePublishableKey);

// Individual element styling options
const elementOptions = {
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

// Payment form component (inside Elements wrapper)
function PaymentFormContent({ plan, licenseKey, onSuccess, onError, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      console.log('Creating payment intent for:', { planTier: plan.tier, licenseKey });
      
      const paymentIntentResponse = await paymentService.createPaymentIntent({
        planTier: plan.tier,
        licenseKey: licenseKey
      });

      if (!paymentIntentResponse.success) {
        throw new Error(paymentIntentResponse.error || 'Failed to create payment intent');
      }

      const { client_secret } = paymentIntentResponse.payment_intent;

      // Confirm payment with card number element
      const cardNumberElement = elements.getElement(CardNumberElement);
      
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardNumberElement,
        }
      });

      if (stripeError) {
        console.log('🚨 Stripe Payment Error:', {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          payment_intent_id: client_secret.split('_secret_')[0]
        });
        setError(stripeError.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment Succeeded:', paymentIntent.id);
        
        // Verify payment on backend
        const verificationResponse = await paymentService.verifyPayment(
          paymentIntent.id,
          licenseKey
        );

        if (verificationResponse.success) {
          console.log('🎉 License Activated:', licenseKey);
          onSuccess({
            paymentIntent: paymentIntent,
            plan: plan,
            message: 'Payment successful! Your license has been activated.'
          });
        } else {
          console.log('❌ Verification Failed:', verificationResponse.error);
          setError(verificationResponse.error || 'Payment verification failed');
        }
      } else {
        console.log('⏸️ Payment Status:', paymentIntent.status);
        setError(`Payment was not completed successfully. Status: ${paymentIntent.status}`);
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      onError && onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-header">
        <h3>Complete Your Payment</h3>
        <p>
          {plan.name} - {plan.price} {plan.duration}
        </p>
      </div>

      <div className="card-fields-container">
        <div className="card-field">
          <label htmlFor="card-number">Card Number</label>
          <div className="stripe-element-wrapper">
            <CardNumberElement 
              id="card-number"
              options={elementOptions}
            />
          </div>
        </div>

        <div className="card-row">
          <div className="card-field">
            <label htmlFor="card-expiry">Expiry Date</label>
            <div className="stripe-element-wrapper">
              <CardExpiryElement 
                id="card-expiry"
                options={elementOptions}
              />
            </div>
          </div>

          <div className="card-field">
            <label htmlFor="card-cvc">CVC</label>
            <div className="stripe-element-wrapper">
              <CardCvcElement 
                id="card-cvc"
                options={elementOptions}
              />
            </div>
          </div>
        </div>

        <div className="card-field">
          <label htmlFor="postal-code">ZIP / Postal Code</label>
          <input
            type="text"
            id="postal-code"
            placeholder="12345"
            className="postal-code-input"
            maxLength="10"
          />
        </div>
      </div>

      {error && (
        <div className="payment-error">
          <p>{error}</p>
        </div>
      )}

      <div className="payment-actions">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary"
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : `Pay ${getPaymentButtonPrice(plan, 'stripe')}`}
        </Button>
      </div>

      <div className="payment-security">
        <p>🔒 Your payment information is secure and encrypted.</p>
      </div>
    </form>
  );
}

// Main component with Elements wrapper
function PaymentForm({ plan, licenseKey, onSuccess, onError, onCancel }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent
        plan={plan}
        licenseKey={licenseKey}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
}

export default PaymentForm; 