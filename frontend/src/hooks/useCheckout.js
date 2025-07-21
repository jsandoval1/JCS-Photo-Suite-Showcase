import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import subscriptionService from '../services/subscription';

export function useCheckout() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [tempLicenseKey, setTempLicenseKey] = useState(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Get available plans
  const availablePlans = subscriptionService.getAvailablePlans();

  useEffect(() => {
    // Get the selected plan from location state or URL params
    const planTier = location.state?.planTier || new URLSearchParams(location.search).get('plan');
    const plan = availablePlans.find(p => p.tier === planTier);
    
    if (!plan) {
      // If no plan selected, redirect to pricing
      navigate('/pricing');
      return;
    }
    
    setSelectedPlan(plan);
    
    // Get current plan from user's licenses
    const userCurrentPlan = user?.licenses?.find(license => license.role === 'primary')?.plan_tier || null;
    setCurrentPlan(userCurrentPlan);
    
    // Only check trial eligibility if user is logged in and we haven't checked yet
    if (user && plan.tier === 'Trial' && !checkingEligibility) {
      checkTrialEligibility();
    } else if (plan.tier !== 'Trial') {
      // For non-trial plans, trial eligibility doesn't matter
      setTrialEligible(false);
    }
    
    // For trials, prepare for instant activation
    // For paid plans, prepare license for payment
    if (plan.tier === 'Trial') {
      // Trial plans don't need payment method selection
      setPaymentMethod(null);
    } else if (plan.tier !== 'Enterprise' && user && !tempLicenseKey) {
      // Paid plans default to Stripe
      setPaymentMethod('stripe');
      prepareForPayment(plan);
    }
  }, [location.state?.planTier, user?.id]);

  const checkTrialEligibility = async () => {
    if (checkingEligibility) return; // Prevent duplicate calls
    
    setCheckingEligibility(true);
    try {
      const response = await subscriptionService.checkTrialEligibility();
      setTrialEligible(response.eligible);
    } catch (err) {
      // If we get a rate limit error (429) or other API error, 
      // assume trial is available for better user experience
      if (err.response?.status === 429) {
        setTrialEligible(true);
      } else {
        setTrialEligible(false);
      }
    } finally {
      setCheckingEligibility(false);
    }
  };

  const prepareForPayment = async (plan) => {
    try {
      // Check if user has existing license
      const existingLicense = user?.licenses?.find(license => license.role === 'primary') || 
                              user?.licenses?.[0];
      
      if (existingLicense?.license_key) {
        // Use existing license for payment (upgrade scenario)
        setTempLicenseKey(existingLicense.license_key);
      } else {
        // For new users without licenses, we'll create the license during payment verification
        // Set a placeholder that indicates "create new license"
        setTempLicenseKey('CREATE_NEW_LICENSE');
      }
    } catch (err) {
      setError(err.message || 'Failed to prepare checkout');
    }
  };

  const handleTrialActivation = async () => {
    if (!selectedPlan || selectedPlan.tier !== 'Trial') return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (!trialEligible) {
        setError('You are not eligible for a trial. Your district has already used the trial period.');
        setLoading(false);
        return;
      }
      
      let response;
      if (currentPlan) {
        // Update existing license
        response = await subscriptionService.updateLicense(selectedPlan.tier);
      } else {
        // Create new license
        response = await subscriptionService.createLicense(selectedPlan.tier);
      }
      
      if (response.success) {
        setSuccess('Trial activated successfully! Redirecting to dashboard...');
        await refreshProfile(); // Refresh user data to get new license
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(response.error || 'Failed to activate trial');
      }
    } catch (err) {
      setError(err.message || 'Failed to activate trial');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!selectedPlan || !tempLicenseKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create a license in pending payment state for check payment
      let response;
      if (currentPlan && tempLicenseKey !== 'CREATE_NEW_LICENSE') {
        // Update existing license
        response = await subscriptionService.updateLicense(selectedPlan.tier);
      } else {
        // Create new license
        response = await subscriptionService.createLicense(selectedPlan.tier);
      }
      
      if (response.success) {
        setSuccess(`${selectedPlan.tier} plan selected. Your license has been created but is currently inactive. You will receive an email with check payment instructions. Your license will be activated once we receive and process your payment.`);
        await refreshProfile(); // Refresh user data to get new license
        setTimeout(() => navigate('/dashboard'), 4000);
      } else {
        setError(response.error || 'Failed to create license for check payment');
      }
    } catch (err) {
      setError(err.message || 'Failed to process check payment option');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setSuccess(paymentResult.message || 'Payment successful! Your license has been updated.');
    await refreshProfile(); // Refresh user data to get updated license
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  const handlePaymentError = (error) => {
    setError(error.message || 'Payment failed. Please try again.');
  };

  const handleCancel = () => {
    navigate('/pricing');
  };

  const handleBackToPricing = () => {
    navigate('/pricing');
  };

  const handleContactSales = () => {
    navigate('/contact');
  };

  return {
    // State
    selectedPlan,
    currentPlan,
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
    handleCancel,
    handleBackToPricing,
    handleContactSales
  };
} 