import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export function useEmailVerification() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  
  const isEmailVerified = user?.email_verified || false;
  
  const handleResendVerification = async () => {
    if (isResending) return;
    
    try {
      setIsResending(true);
      
      const response = await api.post('/auth/resend-verification', {});
      
      if (response.success) {
        alert('Verification email sent! Please check your inbox.');
      } else {
        throw new Error(response.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      
      // Handle specific error codes
      if (error.status === 400 && error.data?.code === 'ALREADY_VERIFIED') {
        alert('Your email is already verified!');
      } else {
        alert(error.message || 'Failed to send verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };
  
  return {
    isEmailVerified,
    isResending,
    handleResendVerification,
    user
  };
} 