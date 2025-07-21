import StatusCard from '../ui/StatusCard';
import './EmailVerifyingStatus.css';

function EmailVerifyingStatus() {
  return (
    <div className="email-verifying-status">
      <StatusCard
        icon={<span className="verifying-spinner">⏳</span>}
        title="Verifying Your Email"
        message="Please wait while we verify your email address..."
        variant="info"
      />
    </div>
  );
}

export default EmailVerifyingStatus; 