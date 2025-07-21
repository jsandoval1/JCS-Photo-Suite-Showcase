import './LegalGrid.css';

function LegalGrid() {
  return (
    <>
      <h2>Legal Information</h2>
      <div className="legal-content">
        <section className="legal-section">
          <h3>Terms of Service</h3>
          <p>
            By using this website and its services, you agree to abide by our Terms of Service. These terms govern your use of the platform and outline your rights and responsibilities. Please review them carefully before using our services.
          </p>
        </section>
        <section className="legal-section">
          <h3>Privacy Policy</h3>
          <p>
            We are committed to protecting your privacy. Our Privacy Policy explains how we collect, use, and safeguard your personal information. By using our services, you consent to the collection and use of your information as described in this policy.
          </p>
        </section>
        <section className="legal-section">
          <h3>Cookie Policy</h3>
          <p>
            This website uses cookies to enhance your browsing experience and provide personalized content. By continuing to use our site, you accept our use of cookies as outlined in our Cookie Policy.
          </p>
        </section>
        <section className="legal-section">
          <h3>Contact Information</h3>
          <p>
            If you have any questions about our legal policies, please contact us at <a href="mailto:support@example.com">support@example.com</a>.
          </p>
        </section>
      </div>
    </>
  );
}

export default LegalGrid; 