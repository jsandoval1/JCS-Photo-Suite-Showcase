import './PricingGrid.css';
import Button from '../ui/Button';
import subscriptionService from '../../services/subscription';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function PricingGrid() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trialEligible, setTrialEligible] = useState(false);
  const [error, setError] = useState(null);

  // Get plans from subscription service
  const plans = subscriptionService.getAvailablePlans();

  // Get current plan from user's licenses
  const getCurrentPlan = () => {
    return user?.licenses?.find(license => license.role === 'primary')?.plan_tier || null;
  };

  const currentPlan = getCurrentPlan();

  useEffect(() => {
    // Check trial eligibility when user is logged in
    if (user) {
      checkTrialEligibility();
    } else {
      // Assume trial is available for anonymous users
      setTrialEligible(true);
    }
  }, [user]);

  const checkTrialEligibility = async () => {
    try {
      const trialResponse = await subscriptionService.checkTrialEligibility();
      setTrialEligible(trialResponse.eligible);
    } catch (err) {
      console.error('Failed to check trial eligibility:', err);
      // Set default based on current plan - if they have a current plan, they're likely not trial eligible
      setTrialEligible(getCurrentPlan() === null);
    }
  };

  const handleSubscriptionRequest = (plan) => {
    // Handle Enterprise plan first - always redirect to contact page regardless of login status
    if (plan.tier === 'Enterprise') {
      navigate('/contact');
      return;
    }

    // If user is not logged in, redirect appropriately
    if (!user) {
      if (plan.tier === 'Trial') {
        navigate('/register');
      } else {
        navigate('/login');
      }
      return;
    }

    // Prevent selecting the same plan
    if (currentPlan === plan.tier) {
      setError(`You already have the ${plan.tier} plan.`);
      return;
    }
    
    // Prevent downgrading to trial
    if (plan.tier === 'Trial' && currentPlan && currentPlan !== 'Trial') {
      setError('Cannot downgrade from a paid plan to Trial.');
      return;
    }
    
    // Check trial eligibility for trial plans
    if (plan.tier === 'Trial' && !trialEligible) {
      setError('You are not eligible for a trial. Your district has already used the trial period.');
      return;
    }

    // Clear any previous errors and redirect to checkout
    setError(null);
    
    // Navigate to checkout page with selected plan
    navigate('/checkout', { 
      state: { planTier: plan.tier }
    });
  };

  const getButtonText = (plan) => {
    if (currentPlan === plan.tier) return 'Current Plan';
    if (plan.tier === 'Trial') {
      if (!trialEligible && user) return 'Trial Used';
      return 'Start Free Trial';
    }
    // Always show "Contact Sales" for Enterprise regardless of login status
    if (plan.tier === 'Enterprise') return 'Contact Sales';
    
    // Different text for logged in vs logged out users
    if (user) {
      return 'Change Plan';
    } else {
      return 'Purchase Plan';
    }
  };

  const getButtonVariant = (plan) => {
    if (currentPlan === plan.tier) return 'primary';
    return 'secondary';
  };

  const isCurrentPlan = (plan) => {
    return currentPlan === plan.tier;
  };

  const isButtonDisabled = (plan) => {
    // Disable if it's the current plan
    if (currentPlan === plan.tier) return true;
    
    // Disable trial if not eligible and user is logged in
    if (plan.tier === 'Trial' && !trialEligible && user) return true;
    
    return false;
  };

  return (
    <>
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div 
            key={plan.tier} 
            className={`pricing-card ${isCurrentPlan(plan) ? 'current' : ''} ${isButtonDisabled(plan) && plan.tier === 'Trial' ? 'disabled' : ''}`}
          >
            <h3>{plan.name}</h3>
            <div className="price">{plan.price}</div>
            <div className="duration">{plan.duration}</div>
          <ul>
              {plan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
          </ul>
            <Button 
              variant={getButtonVariant(plan)} 
              onClick={() => handleSubscriptionRequest(plan)}
              disabled={isButtonDisabled(plan)}
            >
              {getButtonText(plan)}
          </Button>
        </div>
        ))}
      </div>

    </>
  );
}

export default PricingGrid; 