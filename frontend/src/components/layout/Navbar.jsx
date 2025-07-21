import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import './Navbar.css';

function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <img src="Brand-Logo.png" alt="JCS Photo Suite" className="logo-img" />
          </NavLink>
        </div>

        {/* Toggle button for mobile */}
        <div className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
          ☰
        </div>

        <nav className={`nav ${menuOpen ? 'show' : ''}`}>
          {isAuthenticated && (
            <div className="welcome-message-mobile">
              Welcome, {user?.first_name}
            </div>
          )}

          <NavLink to="/features" onClick={closeMenu}>Features</NavLink>
          <NavLink to="/pricing" onClick={closeMenu}>Pricing</NavLink>
          <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>
          <NavLink to="/legal" onClick={closeMenu}>Legal</NavLink>

          {isAuthenticated && (
            <NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink>
          )}

          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            <div className="toggle-track">
              <div className="toggle-thumb">
                <span className="toggle-icon">{isDark ? '🌙' : '☀️'}</span>
              </div>
              <div className="toggle-background-icon">
                <span className="background-icon">{isDark ? '☀️' : '🌙'}</span>
              </div>
            </div>
          </button>

          {isAuthenticated ? (
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          ) : (
            <NavLink to="/login" onClick={closeMenu}>
              <Button variant="primary">Sign In</Button>
            </NavLink>
          )}
        </nav>

        {/* Desktop user message */}
        {isAuthenticated && (
          <div className="welcome-message-desktop">
            Welcome, {user?.first_name}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
