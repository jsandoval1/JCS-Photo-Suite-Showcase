import './FeaturesGrid.css';

function FeaturesGrid() {
  return (
    <>
      <h2>Why Choose JCS Photo Suite?</h2>
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📸</div>
          <h3>Easy Photo Uploads</h3>
          <p>Simple drag-and-drop interface for bulk photo uploads with automatic organization.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Secure & Compliant</h3>
          <p>FERPA-compliant storage with enterprise-grade security for student data protection.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>PowerSchool Integration</h3>
          <p>Seamless integration with your existing PowerSchool system - no additional training needed.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Usage Analytics</h3>
          <p>Track uploads, downloads, and usage patterns with detailed reporting and insights.</p>
        </div>
      </div>
    </>
  );
}

export default FeaturesGrid; 