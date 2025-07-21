import './SubscriptionDetailsSection.css';

function SubscriptionDetailsSection() {
  return (
    <div className="subscription-details">
      <h3>Subscription Details</h3>
      <div className="details-grid">
        <div className="detail-item">
          <h4>What's Included</h4>
          <ul>
            <li>License for production and test servers</li>
            <li>Unlimited downloads during subscription</li>
            <li>Email and video session support</li>
            <li>All updates and enhancements</li>
          </ul>
        </div>
        <div className="detail-item">
          <h4>Terms & Renewal</h4>
          <ul>
            <li>Annual subscription billing</li>
            <li>Auto-renewal available</li>
            <li>30-day money-back guarantee</li>
            <li>Cancel anytime before renewal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionDetailsSection; 