import { useEmailVerification } from '../shared/useEmailVerification';
import Button from '../ui/Button';

function NoLicenseSection({ onManageSubscription }) {
  const { isEmailVerified } = useEmailVerification();

  return (
    <>
      <div className="no-license-section">
        <h3>No License</h3>
        <p>You don't have a license yet. Get started by choosing a plan!</p>
      </div>

      <div className="no-license-action">
        <h3>Get Started</h3>
        <div className="primary-action">
          <Button
            variant="primary"
            onClick={onManageSubscription}
            disabled={!isEmailVerified}
            title={!isEmailVerified ? 'Email verification required to choose a plan' : ''}
            className="choose-plan-btn"
          >
            Choose Your Plan
          </Button>
        </div>
      </div>
    </>
  );
}

export default NoLicenseSection; 