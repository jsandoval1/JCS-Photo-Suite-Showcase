import Button from '../ui/Button';
import { useEmailVerification } from './useEmailVerification';
import './EmailVerificationNotice.css';

function EmailVerificationNotice() {
  const { isEmailVerified, isResending, handleResendVerification } = useEmailVerification();
  
  if (isEmailVerified) {
    return null;
  }
  
  return (
    <div className="verification-notice">
      <div className="verification-icon">⚠️</div>
      <div className="verification-content">
        <h3>Email Verification Required</h3>
        <p>
          Please verify your email address to access all features of JCS Photo Suite. 
          Check your inbox for the verification email.
        </p>
        <Button 
          variant="secondary" 
          onClick={handleResendVerification}
          disabled={isResending}
          className="resend-btn"
        >
          {isResending ? 'Sending...' : 'Resend Verification Email'}
        </Button>
      </div>
    </div>
  );
}

export default EmailVerificationNotice; 