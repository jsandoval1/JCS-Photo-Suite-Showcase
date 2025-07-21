import './PaymentMethodsSection.css';

function PaymentMethodsSection() {
  return (
    <div className="payment-methods-section">
      <h3>Payment Options</h3>
      <div className="payment-grid">
        <div className="payment-method-card">
          <h4>💳 Credit Card</h4>
          <p>Fast and secure online payment</p>
          <ul>
            <li>Domestic: 2.9% processing fee</li>
            <li>International: 4.0% processing fee</li>
            <li>Instant activation</li>
          </ul>
        </div>
        
        <div className="payment-method-card">
          <h4>✉️ Check Payment</h4>
          <p>Traditional payment method</p>
          <div className="mailing-address">
            <strong>Mail checks to:</strong><br/>
            JCS Photo Suite<br/>
            [Your Business Address]<br/>
            [City, State ZIP]<br/>
            [Country]
          </div>
          <p><em>Activation upon check clearance</em></p>
        </div>
      </div>
    </div>
  );
}

export default PaymentMethodsSection; 