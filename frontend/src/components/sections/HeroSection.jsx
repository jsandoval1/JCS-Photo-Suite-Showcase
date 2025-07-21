import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';

function HeroSection() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Redirect to register page with pre-filled email
    try {
      navigate('/register', { 
        state: { prefilledEmail: email } 
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero-content">
      <h1>Professional Photo Management for Schools</h1>
      <p>
        Streamline student and staff photo uploads, management, and distribution 
        with our powerful PowerSchool plugin. Built for educational institutions.
      </p>
      <form onSubmit={handleGetStarted} className="cta-form">
        <input
          type="email"
          placeholder="Enter your school email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Getting Started...' : 'Get Started Free'}
        </button>
      </form>
      <p className="hero-subtitle">
        Start with 100 free uploads • No credit card required
      </p>
    </div>
  );
}

export default HeroSection; 