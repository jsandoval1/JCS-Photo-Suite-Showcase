import StatusCard from '../ui/StatusCard';
import Button from '../ui/Button';
import './EmailLinkExpired.css';

function EmailLinkExpired({ message, isAuthenticated, onRequestNew }) {
  return (
    <div className="email-link-expired">
      <StatusCard
        icon="⏰"
        title="Link Expired"
        message={message}
        variant="warning"
      >
        <Button variant="primary" onClick={onRequestNew}>
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In to Request New Link'}
        </Button>
      </StatusCard>
    </div>
  );
}

export default EmailLinkExpired; 