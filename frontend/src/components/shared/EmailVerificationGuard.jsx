import Button from '../ui/Button';
import { useEmailVerification } from './useEmailVerification';
import './EmailVerificationGuard.css';

function EmailVerificationGuard({ 
  children, 
  title = "Email Verification Required",
  backButton = null,
  className = ""
}) {
  const { isEmailVerified, isResending, handleResendVerification } = useEmailVerification();
  
  if (isEmailVerified) {
    return children;
  }
  
  return (
    <div className={`email-verification-guard ${className}`}>
      <div className="verification-warning">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <h2>{title}</h2>
          <p>
            You must verify your email address before you can access this feature. 
            This helps us ensure the security of your account and prevents unauthorized access to your licenses.
          </p>
          <div className="verification-actions">
            <Button 
              variant="primary" 
              onClick={handleResendVerification}
              disabled={isResending}
              className="resend-verification-btn"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            {backButton}
          </div>
          <div className="verification-help">
            <p>
              <strong>Can't find the verification email?</strong> Check your spam folder or 
              try resending the verification email using the button above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationGuard; 