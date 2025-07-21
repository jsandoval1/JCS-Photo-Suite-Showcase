function LicenseInfoSection({ primaryLicense }) {
  if (!primaryLicense) {
    return null;
  }

  return (
    <div className="license-info-section">
      <h3>Your License</h3>
      <div className="license-overview">
        <div className="license-basic-info">
          <div className="license-tier">
            <strong>{primaryLicense.plan_tier}</strong>
            <span className={`license-status ${primaryLicense.is_active ? 'active' : 'inactive'}`}>
              {primaryLicense.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="license-details">
            <p><strong>License Key:</strong> <code>{primaryLicense.license_key}</code></p>
            <p><strong>Expires:</strong> {new Date(primaryLicense.expiry_date).toLocaleDateString()}</p>
            <p><strong>Installation:</strong> {primaryLicense.is_installed ? 'Installed' : 'Not Installed'}</p>
          </div>
        </div>

        <div className="usage-summary">
          <h4>Usage Summary</h4>
          <div className="usage-stats">
            <div className="usage-stat">
              <span className="stat-label">Student Uploads:</span>
              <span className="stat-value">
                {primaryLicense.used_student_uploads} / {
                  primaryLicense.max_student_uploads === -1 ? 'Unlimited' : primaryLicense.max_student_uploads.toLocaleString()
                }
              </span>
            </div>
            <div className="usage-stat">
              <span className="stat-label">Staff Uploads:</span>
              <span className="stat-value">
                {primaryLicense.used_staff_uploads} / {
                  primaryLicense.max_staff_uploads === -1 ? 'Unlimited' : primaryLicense.max_staff_uploads.toLocaleString()
                }
              </span>
            </div>
          </div>
          <p className="usage-note">Note: Usage is only tracked for your production server.</p>
        </div>

        {/* Configured Servers */}
        {primaryLicense.servers && primaryLicense.servers.length > 0 && (
          <div className="servers-info">
            <h4>Configured Servers</h4>
            <p className="servers-note">Note: Your license is only valid for the servers listed below. If you need to add a new server, please add it below and proceed with checkout.</p>
            <div className="servers-list">
              {primaryLicense.servers.map((server) => (
                <div key={server.id} className="server-item">
                  <span className="server-type">{server.server_type}:</span>
                  <span className="server-url">{server.server_url}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LicenseInfoSection; 