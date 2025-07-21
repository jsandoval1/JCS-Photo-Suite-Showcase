import StatusCard from '../ui/StatusCard';
import Button from '../ui/Button';
import './EmailAlreadyVerified.css';

function EmailAlreadyVerified({ message, onContinue }) {
  return (
    <div className="email-already-verified">
      <StatusCard
        icon="✅"
        title="Already Verified!"
        message={`${message} You already have full access to all features.`}
        variant="success"
      >
        <Button variant="primary" onClick={onContinue}>
          Go to Dashboard
        </Button>
      </StatusCard>
    </div>
  );
}

export default EmailAlreadyVerified; 