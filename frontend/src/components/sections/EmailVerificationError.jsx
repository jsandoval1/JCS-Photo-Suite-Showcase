import StatusCard from '../ui/StatusCard';
import Button from '../ui/Button';
import './EmailVerificationError.css';

function EmailVerificationError({ message, isAuthenticated, onGoHome, onRequestNew }) {
  return (
    <div className="email-verification-error">
      <StatusCard
        icon="❌"
        title="Verification Failed"
        message={message}
        variant="error"
      >
        <Button variant="outline" onClick={onGoHome}>
          Go Home
        </Button>
        <Button variant="primary" onClick={onRequestNew}>
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
        </Button>
      </StatusCard>
    </div>
  );
}

export default EmailVerificationError; 