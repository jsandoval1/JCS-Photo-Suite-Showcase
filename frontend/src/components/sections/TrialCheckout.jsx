import Button from '../ui/Button';
import ServerLimitationNotice from '../shared/ServerLimitationNotice';
import './TrialCheckout.css';

function TrialCheckout({ plan, onActivate, loading, trialEligible }) {
  return (
    <div className="checkout-form">
      <h2>Activate Your Trial</h2>
      <p>Get started with a free 30-day trial of JCS Photo Suite.</p>
      
      <div className="trial-info">
        <h3>Trial includes:</h3>
        <ul>
          {plan.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>

      <ServerLimitationNotice message="Your trial license will only work with the servers you specified when you registered. If you need to add additional servers, you can purchase server permissions after activating your trial." />
      
      {!trialEligible ? (
        <div className="trial-ineligible">
          <p>Your district has already used the trial period. Please select a paid plan.</p>
        </div>
      ) : (
        <div className="checkout-actions">
          <Button 
            variant="primary" 
            onClick={onActivate}
            disabled={loading}
            className="activate-trial-btn"
          >
            {loading ? 'Activating...' : 'Activate Free Trial'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default TrialCheckout; 