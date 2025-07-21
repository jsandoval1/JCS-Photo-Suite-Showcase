import Button from './Button';
import './PaymentInfoModal.css';

function PaymentInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Payment Information</h3>
        <p>For credit card payments, we'll send you a secure payment link.</p>
        <p>For check payments, please use the mailing address above.</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default PaymentInfoModal; 