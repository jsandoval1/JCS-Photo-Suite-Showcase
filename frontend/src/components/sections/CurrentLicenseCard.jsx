import './CurrentLicenseCard.css';

function CurrentLicenseCard({ currentLicense }) {
  if (!currentLicense) {
    return (
      <div className="current-license-section">
        <h2>Current License</h2>
        <div className="no-license">
          <p>You don't have a license yet. Choose a plan below to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="current-license-section">
      <h2>Current License</h2>
      <div className="license-card">
        <div className="license-info">
          <h3>{currentLicense.plan_tier} License</h3>
          <p><strong>License Key:</strong> {currentLicense.license_key}</p>
          <p><strong>District:</strong> {currentLicense.district_name}</p>
          <p><strong>Status:</strong> {currentLicense.is_active ? 'Active' : 'Inactive'}</p>
          <p><strong>Installed:</strong> {currentLicense.is_installed ? 'Yes' : 'No'}</p>
          <p><strong>Expires:</strong> {new Date(currentLicense.expiry_date).toLocaleDateString()}</p>
        </div>
        
        <div className="usage-info">
          <h4>Usage</h4>
          <div className="usage-stats">
            <div className="usage-item">
              <span>Student Uploads:</span>
              <span>
                {currentLicense.used_student_uploads} / {
                  currentLicense.max_student_uploads === -1 ? 'Unlimited' : currentLicense.max_student_uploads
                }
              </span>
            </div>
            <div className="usage-item">
              <span>Staff Uploads:</span>
              <span>
                {currentLicense.used_staff_uploads} / {
                  currentLicense.max_staff_uploads === -1 ? 'Unlimited' : currentLicense.max_staff_uploads
                }
              </span>
            </div>
          </div>
          <p className="usage-note">Note: Usage is only tracked for your production server.</p>
        </div>

        {/* Server URLs */}
        {currentLicense.servers && currentLicense.servers.length > 0 && (
          <div className="servers-info">
            <h4>Configured Servers</h4>
            {currentLicense.servers.map((server) => (
              <div key={server.id} className="server-item">
                <span>{server.server_type}: {server.server_url}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrentLicenseCard; 