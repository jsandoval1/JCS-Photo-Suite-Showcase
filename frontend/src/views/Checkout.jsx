import { useEmailVerification } from "../components/shared/useEmailVerification";
import { useCheckout } from "../hooks";
import {
  Button,
  EmailVerificationNotice,
  BackNavigation,
  TrialCheckout,
  EnterpriseCheckout,
  PaidPlanCheckout,
  CheckoutSummary,
} from "../components";
import "./Checkout.css";
import Loader from "../components/loader/Loader";

function Checkout() {
  const { isEmailVerified } = useEmailVerification();
  const {
    // State
    selectedPlan,
    loading,
    error,
    success,
    paymentMethod,
    tempLicenseKey,
    trialEligible,

    // Actions
    setPaymentMethod,
    setError,
    handleTrialActivation,
    handleCheckPayment,
    handlePaymentSuccess,
    handlePaymentError,
    handleBackToPricing,
    handleContactSales,
  } = useCheckout();

  // Email verification check
  if (!isEmailVerified) {
    return (
      <section className="checkout">
        <div className="container">
          <BackNavigation
            onBack={handleBackToPricing}
            backText="Pricing"
            currentPage="Checkout"
          />

          <h1>Checkout</h1>
          <EmailVerificationNotice />

          <div className="checkout-actions">
            <Button onClick={handleBackToPricing}>Back to Pricing</Button>
          </div>
        </div>
      </section>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="container">
        <section className="checkout">
          <div className="loading-container">
            <Loader />
          </div>
        </section>
      </div>
      // <section className="checkout">
      //   <div className="container">
      //     <div className="loading-container">
      //       <p>Loading...</p>
      //     </div>
      //   </div>
      // </section>
    );
  }

  return (
    <section className="checkout">
      <div className="container">
        <BackNavigation
          onBack={handleBackToPricing}
          backText="Pricing"
          currentPage="Checkout"
        />

        {/* Error Messages */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Success Messages */}
        {success && (
          <div className="success-message">
            <p>{success}</p>
          </div>
        )}

        {/* Main Checkout Layout */}
        <div className="checkout-layout">
          {/* Left Side - Checkout Form */}
          <div className="checkout-main">
            {selectedPlan.tier === "Trial" ? (
              <TrialCheckout
                plan={selectedPlan}
                onActivate={handleTrialActivation}
                loading={loading}
                trialEligible={trialEligible}
              />
            ) : selectedPlan.tier === "Enterprise" ? (
              <EnterpriseCheckout
                plan={selectedPlan}
                onContact={handleContactSales}
              />
            ) : (
              <PaidPlanCheckout
                plan={selectedPlan}
                licenseKey={tempLicenseKey}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onCheckPayment={handleCheckPayment}
                loading={loading}
              />
            )}
          </div>

          {/* Right Side - Order Summary */}
          <CheckoutSummary selectedPlan={selectedPlan} paymentMethod={paymentMethod} />
        </div>
      </div>
    </section>
  );
}

export default Checkout;
