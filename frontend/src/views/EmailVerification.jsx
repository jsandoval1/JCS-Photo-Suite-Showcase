import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  EmailVerificationContainer,
  EmailVerifyingStatus,
  EmailVerificationSuccess,
  EmailAlreadyVerified,
  EmailLinkExpired,
  EmailVerificationError
} from '../components';
import api from '../services/api';
import './EmailVerification.css';

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile, isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'expired', 'invalid', 'already_verified'
  const [message, setMessage] = useState('');
  const hasAttemptedVerificationRef = useRef(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided.');
      return;
    }

    if (hasAttemptedVerificationRef.current) {
      return;
    }

    hasAttemptedVerificationRef.current = true;
    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    // Prevent multiple verification attempts
    if (status !== 'verifying') {
      return;
    }

    try {
      const response = await api.get(`/auth/verify-email?token=${verificationToken}`);
      
      if (response.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        // If user is logged in, refresh their profile to update email_verified status
        if (isAuthenticated) {
          try {
            await refreshProfile();
          } catch (profileError) {
            // Don't let profile refresh failure override the success
            console.warn('Profile refresh failed after email verification:', profileError);
          }
        }
      } else {
        throw new Error(response.error || 'Verification failed');
      }
    } catch (error) {
      // Only handle errors if we haven't already succeeded
      if (status === 'success') {
        return;
      }

      console.error('Email verification error:', error);
      
      // The error data is in error.data (from the ApiError class)
      const errorCode = error.data?.code;
      const errorMessage = error.message || error.data?.error || 'Verification failed. Please try again.';
      
      if (errorCode === 'TOKEN_EXPIRED') {
        setStatus('expired');
        setMessage('Your verification link has expired. Please request a new one.');
      } else if (errorCode === 'INVALID_TOKEN') {
        // Check if user is already verified
        if (isAuthenticated && user?.email_verified) {
          setStatus('already_verified');
          setMessage('Your email is already verified! This link has been used.');
        } else {
          setStatus('invalid');
          setMessage('This verification link is invalid or has already been used.');
        }
      } else {
        setStatus('error');
        setMessage(errorMessage);
      }
    }
  };

  const handleContinue = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleRequestNew = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login', { 
        state: { message: 'Please log in to request a new verification email.' }
      });
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <EmailVerificationContainer>
      {status === 'verifying' && (
        <EmailVerifyingStatus />
      )}

      {status === 'success' && (
        <EmailVerificationSuccess 
          message={message}
          isAuthenticated={isAuthenticated}
          onContinue={handleContinue}
        />
      )}

      {status === 'already_verified' && (
        <EmailAlreadyVerified 
          message={message}
          onContinue={handleContinue}
        />
      )}

      {status === 'expired' && (
        <EmailLinkExpired 
          message={message}
          isAuthenticated={isAuthenticated}
          onRequestNew={handleRequestNew}
        />
      )}

      {(status === 'invalid' || status === 'error') && (
        <EmailVerificationError 
          message={message}
          isAuthenticated={isAuthenticated}
          onGoHome={handleGoHome}
          onRequestNew={handleRequestNew}
        />
      )}
    </EmailVerificationContainer>
  );
}

export default EmailVerification; 