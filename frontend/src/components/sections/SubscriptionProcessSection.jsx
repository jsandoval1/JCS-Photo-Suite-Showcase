import './SubscriptionProcessSection.css';

function SubscriptionProcessSection() {
  return (
    <div className="subscription-process">
      <h3>How It Works</h3>
      <div className="process-steps">
        <div className="step">
          <div className="step-number">1</div>
          <h4>Create Account</h4>
          <p>Sign up and choose your plan - start with a free trial or go straight to paid</p>
        </div>
        <div className="step">
          <div className="step-number">2</div>
          <h4>Make Payment</h4>
          <p>Pay securely with Stripe or mail us a check for annual subscription</p>
        </div>
        <div className="step">
          <div className="step-number">3</div>
          <h4>Get Activated</h4>
          <p>Instant activation with Stripe, or upon check clearance for mailed payments</p>
        </div>
        <div className="step">
          <div className="step-number">4</div>
          <h4>Install on PowerSchool</h4>
          <p>Download your custom ZIP file and install the plugin on your PowerSchool server</p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionProcessSection; 