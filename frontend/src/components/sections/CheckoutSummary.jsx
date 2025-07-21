import './CheckoutSummary.css';
import { getPricingBreakdown } from '../../utils/pricing';

function CheckoutSummary({ selectedPlan, paymentMethod = 'stripe' }) {
  const pricing = getPricingBreakdown(selectedPlan, paymentMethod);
  
  return (
    <div className="order-summary">
      <h3>Order Summary</h3>
      <div className="plan-details">
        <h4>{selectedPlan.name}</h4>
        <p className="plan-description">{selectedPlan.description}</p>
        <div className="plan-price">
          <span className="price">{selectedPlan.price}</span>
          <span className="duration">{selectedPlan.duration}</span>
        </div>
      </div>
      
      <div className="plan-features">
        <h5>What's included:</h5>
        <ul>
          {selectedPlan.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>
      
      {selectedPlan.tier !== 'Trial' && selectedPlan.tier !== 'Enterprise' && (
        <div className="total-section">
          <div className="total-line">
            <span>License Cost</span>
            <span>{pricing.formattedBase}</span>
          </div>
          
          {pricing.hasProcessingFee && (
            <div className="total-line processing-fee">
              <span>Card Processing Fee</span>
              <span>{pricing.formattedProcessingFee}</span>
            </div>
          )}
          
          <div className="total-line total">
            <span>Total</span>
            <span>{pricing.formattedTotal}</span>
          </div>
          
          {pricing.hasProcessingFee && (
            <div className="payment-note">
              <p>* Processing fee applies to credit card payments only</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckoutSummary; 