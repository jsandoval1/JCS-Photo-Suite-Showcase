import { NavLink } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>JCS Photo Suite</h4>
            <p>Professional photo management for educational institutions.</p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <a
              href={`${
                import.meta.env.VITE_API_URL
                  ? import.meta.env.VITE_API_URL.replace("/api", "")
                  : import.meta.env.PROD
                  ? ""
                  : "http://localhost:3000"
              }/health`}
              target="_blank"
              rel="noopener noreferrer"
            >
              API Status
            </a>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <NavLink to="/contact">Contact</NavLink>
            <a href="/docs">Documentation</a>
            <a href="/admin">Admin Portal</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 JCS Photo Suite. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
