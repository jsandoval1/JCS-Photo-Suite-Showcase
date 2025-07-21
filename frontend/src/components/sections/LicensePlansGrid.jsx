import { useState } from 'react';
import Button from '../ui/Button';
import { LICENSE_TIERS } from '../../services/license';
import licenseService from '../../services/license';
import './LicensePlansGrid.css';

function LicensePlansGrid({ currentLicense, onLicenseChange, onError, onSuccess }) {
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleCreateLicense = async (planTier) => {
    try {
      setUpgradeLoading(true);
      onError(null);
      onSuccess(null);

      const response = await licenseService.createLicense({
        plan_tier: planTier,
        // For demo purposes, we're not handling real payments
        payment_intent_id: null
      });

      if (response.success) {
        onSuccess(`${planTier} license created successfully!`);
        await onLicenseChange(); // Reload license data
      }
    } catch (err) {
      onError(err.message || 'Failed to create license');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUpgradeLicense = async (newPlanTier) => {
    try {
      setUpgradeLoading(true);
      onError(null);
      onSuccess(null);

      const response = await licenseService.updateLicense({
        plan_tier: newPlanTier,
        // For demo purposes, we're not handling real payments
        payment_intent_id: null
      });

      if (response.success) {
        onSuccess(`License ${response.change_type}d to ${newPlanTier} successfully!`);
        await onLicenseChange(); // Reload license data
      }
    } catch (err) {
      onError(err.message || 'Failed to update license');
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="plans-section">
      <h2>{currentLicense ? 'Upgrade/Change Plan' : 'Choose Your Plan'}</h2>
      <div className="plans-grid">
        {Object.entries(LICENSE_TIERS).map(([tierName, tierInfo]) => {
          const isCurrentPlan = currentLicense?.plan_tier === tierName;
          const isAvailable = !currentLicense || !isCurrentPlan;
          
          return (
            <div key={tierName} className={`plan-card ${isCurrentPlan ? 'current-plan' : ''}`}>
              <h3>{tierInfo.display_name}</h3>
              <p className="plan-description">{tierInfo.description}</p>
              <div className="plan-price">
                {tierInfo.price === 0 ? 'Free' : 
                 tierInfo.price === -1 ? 'Contact Us' : 
                 `$${tierInfo.price}/year`}
              </div>
              <div className="plan-features">
                <div className="feature">
                  <span>Student Uploads:</span>
                  <span>{tierInfo.max_student_uploads === -1 ? 'Unlimited' : tierInfo.max_student_uploads.toLocaleString()}</span>
                </div>
                <div className="feature">
                  <span>Staff Uploads:</span>
                  <span>{tierInfo.max_staff_uploads === -1 ? 'Unlimited' : tierInfo.max_staff_uploads.toLocaleString()}</span>
                </div>
              </div>
              
              {isCurrentPlan ? (
                <div className="current-plan-badge">Current Plan</div>
              ) : (
                <Button
                  variant={tierInfo.price === 0 ? "outline" : "primary"}
                  onClick={() => currentLicense ? handleUpgradeLicense(tierName) : handleCreateLicense(tierName)}
                  disabled={upgradeLoading || !isAvailable}
                >
                  {upgradeLoading ? 'Processing...' : 
                   currentLicense ? 'Switch to This Plan' : 'Choose This Plan'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LicensePlansGrid; 