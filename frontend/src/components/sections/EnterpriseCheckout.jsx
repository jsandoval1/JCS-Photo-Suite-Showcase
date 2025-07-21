import Button from '../ui/Button';
import ServerLimitationNotice from '../shared/ServerLimitationNotice';
import './EnterpriseCheckout.css';

function EnterpriseCheckout({ plan, onContact }) {
  return (
    <div className="checkout-form">
      <h2>Enterprise Plan</h2>
      <p>Get a custom quote for your organization's needs.</p>
      
      <div className="enterprise-info">
        <h3>Enterprise includes:</h3>
        <ul>
          {plan.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>

      <ServerLimitationNotice />
      
      <div className="checkout-actions">
        <Button 
          variant="primary" 
          onClick={onContact}
          className="contact-sales-btn"
        >
          Contact Sales
        </Button>
      </div>
    </div>
  );
}

export default EnterpriseCheckout; 