import StatusCard from '../ui/StatusCard';
import Button from '../ui/Button';
import './EmailVerificationSuccess.css';

function EmailVerificationSuccess({ message, isAuthenticated, onContinue }) {
  return (
    <div className="email-verification-success">
      <StatusCard
        icon="✅"
        title="Email Verified!"
        message={`${message} You can now access all features of JCS Photo Suite.`}
        variant="success"
      >
        <Button variant="primary" onClick={onContinue}>
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
        </Button>
      </StatusCard>
    </div>
  );
}

export default EmailVerificationSuccess; 