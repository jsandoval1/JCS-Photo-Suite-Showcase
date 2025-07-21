import ContactForm from '../forms/ContactForm';
import './ContactGrid.css';

function ContactGrid() {
  return (
    <>
      <h2>Contact</h2>
      <p>Contact us for more information or support.</p>
      
      {/* Contact Form */}
      <ContactForm />
      
      {/* <div className="contact-content">
        <div className="contact-section">
          <h3>Get in Touch</h3>
          <p>
            We're here to help you with any questions about JCS Photo Suite. 
            Whether you need technical support, want to learn more about our features, 
            or are interested in enterprise solutions, our team is ready to assist you.
          </p>
        </div>
        
        <div className="contact-section">
          <h3>Support</h3>
          <p>
            Email: <a href="mailto:support@jcsphotosuite.com">support@jcsphotosuite.com</a><br/>
            Hours: Monday - Friday, 9 AM - 6 PM EST
          </p>
        </div>
        
        <div className="contact-section">
          <h3>Sales</h3>
          <p>
            For pricing information and custom solutions:<br/>
            Email: <a href="mailto:sales@jcsphotosuite.com">sales@jcsphotosuite.com</a>
          </p>
        </div>
      </div> */}
    </>
  );
}

export default ContactGrid; 