import { useState, useEffect } from 'react';
import { 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement,
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import Button from '../ui/Button';
import paymentService from '../../services/payment';
import { elementOptions } from '../../utils/stripe';
import { getPaymentButtonPrice } from '../../utils/pricing';
import './StripePaymentForm.css';

function StripePaymentForm({ plan, licenseKey, onSuccess, onError, loading }) {
  const stripe = useStripe();
  const elements = useElements();
  const [stripeLoading, setStripeLoading] = useState(true);

  useEffect(() => {
    if (stripe && elements) {
      setStripeLoading(false);
    }
  }, [stripe, elements]);

  if (stripeLoading) {
    return (
      <div className="loading-container">
        <p>Loading payment form...</p>
      </div>
    );
  }

  if (!stripe || !elements) {
    return (
      <div className="error-message">
        <p>Failed to load payment form. Please refresh the page and try again.</p>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    try {
      // Create payment intent
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
        onError(stripeError);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Verify payment on backend
        const verificationResponse = await paymentService.verifyPayment(
          paymentIntent.id,
          licenseKey
        );

        if (verificationResponse.success) {
          const isNewLicense = licenseKey === 'CREATE_NEW_LICENSE';
          onSuccess({
            paymentIntent: paymentIntent,
            plan: plan,
            isNewLicense: isNewLicense,
            licenseKey: verificationResponse.license_key,
            message: isNewLicense 
              ? 'Payment successful! Your license has been created.'
              : 'Payment successful! Your license has been upgraded.'
          });
        } else {
          onError(new Error(verificationResponse.error || 'Payment verification failed'));
        }
      } else {
        onError(new Error(`Payment was not completed successfully. Status: ${paymentIntent.status}`));
      }

    } catch (err) {
      onError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
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
          <div className="stripe-element-wrapper">
            <input
              type="text"
              id="postal-code"
              placeholder="12345"
              className="postal-code-input"
              maxLength="10"
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        variant="primary"
        disabled={!stripe || loading}
        className="pay-button"
      >
        {loading ? 'Processing...' : `Pay ${getPaymentButtonPrice(plan, 'stripe')}`}
      </Button>

      <div className="payment-security">
        <p>🔒 Your payment information is secure and encrypted.</p>
      </div>
    </form>
  );
}

export default StripePaymentForm; 