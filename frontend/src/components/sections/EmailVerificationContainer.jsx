import './EmailVerificationContainer.css';

function EmailVerificationContainer({ children }) {
  return (
    <section className="email-verification-container">
      <div className="email-verification-content">
        {children}
      </div>
    </section>
  );
}

export default EmailVerificationContainer; 