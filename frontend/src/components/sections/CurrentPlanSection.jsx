import './CurrentPlanSection.css';

function CurrentPlanSection({ currentPlan, user }) {
  return (
    <div className="current-plan-section">
      <h2>Current Plan</h2>
      {currentPlan ? (
        <div className="current-plan-card">
          <h3>{currentPlan}</h3>
          <p>Your current subscription level</p>
          {user?.licenses?.find(license => license.role === 'primary') && (
            <p className="expiry-info">
              Expires: {new Date(user.licenses.find(license => license.role === 'primary').expiry_date).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className="no-plan-card">
          <h3>No Active Plan</h3>
          <p>Choose a plan below to get started</p>
        </div>
      )}
    </div>
  );
}

export default CurrentPlanSection; 