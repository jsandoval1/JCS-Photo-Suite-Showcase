import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CurrentLicenseCard, DownloadPluginCard, LicensePlansGrid, Button, EmailVerificationGuard } from '../components';
import licenseService from '../services/license';
import './LicenseManagement.css';

function LicenseManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userLicenses, setUserLicenses] = useState(null);
  const [currentLicense, setCurrentLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load user license information
  useEffect(() => {
    loadUserLicenses();
  }, []);

  const loadUserLicenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await licenseService.getUserLicenses();
      
      if (response.success) {
        setUserLicenses(response.user);
        // Get the primary license (assuming user has one license for now)
        const primaryLicense = response.user.licenses?.find(license => license.role === 'primary');
        setCurrentLicense(primaryLicense);
      }
    } catch (err) {
      setError(err.message || 'Failed to load license information');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <section className="license-management">
        <div className="container">
          <div className="license-content">
            <div className="loading">
              <p>Loading license information...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="license-management">
      <div className="container">
        <div className="license-content">
          <div className="license-header">
            <div className="header-navigation">
              <Button variant="outline" onClick={handleBackToDashboard}>
                ← Back to Dashboard
              </Button>
            </div>
            <div className="header-content">
              <h1>License Management</h1>
              <p>Manage your JCS Photo Suite license and download your customized plugin</p>
            </div>
          </div>

          <EmailVerificationGuard 
            title="Email Verification Required"
            backButton={
              <Button 
                variant="outline" 
                onClick={handleBackToDashboard}
                className="back-to-dashboard-btn"
              >
                Back to Dashboard
              </Button>
            }
            className="email-verification-required"
          >
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                <p>{successMessage}</p>
                <button onClick={() => setSuccessMessage(null)}>Dismiss</button>
              </div>
            )}

            {/* Current License Section */}
            <CurrentLicenseCard currentLicense={currentLicense} />

            {/* Download Section */}
            <DownloadPluginCard 
              currentLicense={currentLicense}
              onError={setError}
              onSuccess={setSuccessMessage}
            />
          </EmailVerificationGuard>
        </div>
      </div>
    </section>
  );
}

export default LicenseManagement; 