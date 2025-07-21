import Button from './Button';
import './PlanConfirmationModal.css';

function PlanConfirmationModal({ 
  isOpen, 
  selectedPlan, 
  currentPlan, 
  onConfirm, 
  onCancel, 
  loading 
}) {
  if (!isOpen || !selectedPlan) return null;

  return (
    <div className="plan-confirmation-modal">
      <div className="modal-overlay" onClick={onCancel}></div>
      <div className="modal-content">
        <h3>Confirm Plan Change</h3>
        <p>
          {currentPlan ? 
            `Change from ${currentPlan} to ${selectedPlan.name}?` : 
            `Activate ${selectedPlan.name} plan?`
          }
        </p>
        <div className="plan-summary">
          <h4>{selectedPlan.name}</h4>
          <p className="price">{selectedPlan.price} {selectedPlan.duration}</p>
          <ul>
            {selectedPlan.features.slice(0, 3).map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : 
             selectedPlan.tier === 'Trial' ? 'Activate Trial' : 
             selectedPlan.tier === 'Enterprise' ? 'Contact Sales' : 'Proceed to Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PlanConfirmationModal; 