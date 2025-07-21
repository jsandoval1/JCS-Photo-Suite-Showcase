import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, SubscriptionHistorySection, PricingGrid } from '../components';
import subscriptionService from '../services/subscription';
import './SubscriptionManagement.css';

function SubscriptionManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const historyResponse = await subscriptionService.getSubscriptionHistory();
      setSubscriptionHistory(historyResponse.history || []);
    } catch (err) {
      setError(err.message || 'Failed to load subscription data');
      setSubscriptionHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (!user?.email_verified) {
    return (
      <div className="subscription-page">
        <div className="container">
          <nav className="back-navigation">
            <button onClick={handleBackToDashboard} className="back-nav-button">
              <span className="arrow">←</span>
              Dashboard
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="current-page">Subscription Management</span>
          </nav>
          <h1>Subscription Management</h1>
          <div className="email-verification-container">
            <div className="verification-warning">
              <div className="warning-icon">⚠️</div>
              <h2>Email Verification Required</h2>
              <p>You must verify your email address before you can manage your subscription.</p>
              <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="container">
          <div className="loading-container">
            <p>Loading subscription information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <div className="container">
        <nav className="back-navigation">
          <button onClick={handleBackToDashboard} className="back-nav-button">
            <span className="arrow">←</span>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="current-page">Subscription Management</span>
        </nav>
        
        <h1>Subscription Management</h1>
        <p>Manage your plan, view history, and upgrade your subscription</p>

              {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

        <div className="subscription-history-section">
          <SubscriptionHistorySection subscriptionHistory={subscriptionHistory} />
        </div>

        <h2>Available Plans</h2>
        <PricingGrid />
      </div>
    </div>
  );
}

export default SubscriptionManagement; 