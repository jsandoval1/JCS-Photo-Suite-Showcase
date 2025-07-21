import { Elements } from "@stripe/react-stripe-js";
import Button from "../ui/Button";
import StripePaymentForm from "./StripePaymentForm";
import ServerLimitationNotice from "../shared/ServerLimitationNotice";
import { stripePromise } from "../../utils/stripe";
import "./PaidPlanCheckout.css";

function PaidPlanCheckout({
  plan,
  licenseKey,
  paymentMethod,
  setPaymentMethod,
  onPaymentSuccess,
  onPaymentError,
  onCheckPayment,
  loading,
}) {
  return (
    <div className="checkout-form">
      <h2>Complete Your Purchase</h2>
      <p>Choose your payment method to activate your {plan.name} plan.</p>

      <ServerLimitationNotice />

      {/* Payment Method Selection */}
      {/* <div className="payment-methods">
        <h3>Payment Method</h3>
        <div className="payment-options">
          <div 
            className={`payment-option ${paymentMethod === 'stripe' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('stripe')}
          >
            <input 
              type="radio" 
              name="paymentMethod" 
              value="stripe" 
              checked={paymentMethod === 'stripe'}
              onChange={() => setPaymentMethod('stripe')}
              style={{ display: 'none' }}
            />
            <div className="payment-icon stripe-icon">💳</div>
            <div className="payment-labels">
              <div className="payment-label">Credit Card</div>
              <div className="payment-subtitle">Powered by Stripe</div>
            </div>
          </div>
          
          <div 
            className={`payment-option ${paymentMethod === 'check' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('check')}
          >
            <input 
              type="radio" 
              name="paymentMethod" 
              value="check" 
              checked={paymentMethod === 'check'}
              onChange={() => setPaymentMethod('check')}
              style={{ display: 'none' }}
            />
            <div className="payment-icon check-icon">📧</div>
            <div className="payment-labels">
              <div className="payment-label">Pay by Check</div>
              <div className="payment-subtitle">Mail payment</div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="payment-methods">
        <h3>Payment Method</h3>
        <div className="payment-options">
          {/* Stripe Option */}
          <div
            className={`payment-option stripe-payment ${
              paymentMethod === "stripe" ? "selected" : ""
            }`}
            onClick={() => setPaymentMethod("stripe")}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="stripe"
              checked={paymentMethod === "stripe"}
              onChange={() => setPaymentMethod("stripe")}
              style={{ display: "none" }}
            />
            <div className="payment-content">
              <div className="payment-icon stripe-icon">
                {/* Stripe Credit Card SVG */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb">
                  <path d="M20 4H4C2.89 4 2 .89 2 2v20c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 18H4V10h16v12zm0-14H4V6h16v2z"></path>
                </svg>
              </div>
              <div className="payment-labels">
                <div className="payment-label">Pay with Credit Card</div>
                <div className="payment-subtitle">Secured by Stripe</div>
              </div>
              <div className="stripe-icons">
                <img
                  src="https://img.icons8.com/color/48/stripe.png"
                  alt="Stripe Logo"
                  className="stripe-logo"
                />
                <img
                  src="https://img.icons8.com/color/48/visa.png"
                  alt="Visa"
                  className="stripe-logo"
                />

                <img
                  src="https://img.icons8.com/color/48/mastercard-logo.png"
                  alt="MasterCard"
                  className="stripe-logo"
                />
                <img
                  src="https://img.icons8.com/color/48/amex.png"
                  alt="American Express"
                  className="stripe-logo"
                />
              </div>
            </div>
          </div>

          {/* Check Option */}
          <div
            className={`payment-option check-payment1 ${
              paymentMethod === "check" ? "selected" : ""
            }`}
            onClick={() => setPaymentMethod("check")}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="check"
              checked={paymentMethod === "check"}
              onChange={() => setPaymentMethod("check")}
              style={{ display: "none" }}
            />
            <div className="payment-content">
              <div className="payment-icon check-icon">
                {/* Mail / Check Icon */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#ebeb57">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v2h20V6c0-1.1-.9-2-2-2zm0 4H4v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm-2 2l-6 3.5L6 10v2l6 3.5L18 12v-2z" />
                </svg>
              </div>
              <div className="payment-labels">
                <div className="payment-label">Pay by Check</div>
                <div className="payment-subtitle">Mail your payment</div>
              </div>
             
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      {paymentMethod === "stripe" && (
        <div className="payment-separator">
          <span>Enter your card details</span>
        </div>
      )}

      {/* Payment Form */}
      {paymentMethod === "stripe" ? (
        licenseKey && licenseKey !== "" ? (
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              plan={plan}
              licenseKey={licenseKey}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
              loading={loading}
            />
          </Elements>
        ) : (
          <div className="loading-container">
            <p>Preparing payment form...</p>
          </div>
        )
      ) : paymentMethod === "check" ? (
        <div className="check-payment">
          <h3>Pay by Check</h3>
          <p className="check-payment-description">
            Select this option to pay by check. Your license will be activated
            once we receive and process your payment.
          </p>

          <div className="check-instructions">
            <h4>Payment Instructions:</h4>
            <ul>
              <li>
                Make check payable to: <strong>JCS Plugins</strong>
              </li>
              <li>
                Amount: <strong>{plan.price}</strong>
              </li>
              <li>Include your license information in the memo</li>
              <li>
                Mail to:
                <div className="mailing-address">
                  <div className="address-line company">JCS Plugins</div>
                  <div className="address-line">[Business Address]</div>
                  <div className="address-line">[City, State ZIP]</div>
                  <div className="address-line">[Country]</div>
                </div>
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            onClick={onCheckPayment}
            disabled={loading}
            className="check-payment-btn"
          >
            {loading ? "Processing..." : "Continue with Check Payment"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default PaidPlanCheckout;
