import './SubscriptionHistorySection.css';

function SubscriptionHistorySection({ subscriptionHistory }) {
  return (
    <div className="history-section">
      <h2>Subscription History</h2>
      <div className="history-list scrollable">
        {subscriptionHistory.length > 0 ? (
          <>
            {subscriptionHistory.map((item, index) => (
              <div key={item.id || index} className="history-item">
                <div className="history-details">
                  <span className="change-type">{item.change_type}</span>
                  <span className="plan-change">
                    {item.old_plan_tier ? `${item.old_plan_tier} → ` : ''}{item.new_plan_tier}
                  </span>
                  <span className="date">
                    {new Date(item.effective_date).toLocaleDateString()}
                  </span>
                </div>
                <span className="amount">
                  {item.amount === 0 ? 'Free' : `$${item.amount}`}
                </span>
              </div>
            ))}
          </>
        ) : (
          <div className="no-history-container">
            <p className="no-history-message">No subscription history available.</p>
          </div>
        )}
      </div>
      {subscriptionHistory.length > 3 && (
        <p className="scroll-hint">Scroll to see all {subscriptionHistory.length} items</p>
      )}
    </div>
  );
}

export default SubscriptionHistorySection; 