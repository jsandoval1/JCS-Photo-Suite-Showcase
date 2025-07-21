import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import licenseService from '../../services/license';
import './DownloadPluginCard.css';

function DownloadPluginCard({ currentLicense, onError, onSuccess }) {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadToken, setDownloadToken] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);

  // Check for existing download tokens when current license changes
  useEffect(() => {
    if (currentLicense) {
      // Add a small delay to ensure authentication context is fully updated
      // especially after payment redirects
      const timeoutId = setTimeout(() => {
        checkExistingDownloadTokens();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentLicense]);

  const checkExistingDownloadTokens = async () => {
    if (!currentLicense) return;

    try {
      const response = await licenseService.getUserDownloadTokens(currentLicense.license_key);
      
      if (response.success && response.hasValidToken) {
        const validToken = response.validToken;
        setDownloadToken(validToken.token);
        onSuccess('You have an existing download token. Checking status...');
        
        // Start polling for the existing token's status
        pollDownloadStatus(validToken.token);
      }
    } catch (err) {
      // Silently handle authentication timing issues after payment redirects
      if (err.response?.status === 401) {
        // This is likely a temporary auth issue after payment redirect - ignore silently
        return;
      }
      
      console.error('Error checking existing download tokens:', err);
      // Don't show error to user - this is a background check
    }
  };

  const pollDownloadStatus = async (token) => {
    try {
      const response = await licenseService.checkDownloadStatus(token);
      setDownloadStatus(response);

      if (response.status === 'ready') {
        // Only show the "ready for download" message if they haven't downloaded yet
        if (response.download_count === 0) {
          onSuccess('Your plugin is ready for download!');
        } else {
          // Clear any existing success message if they've already downloaded
          onSuccess(null);
        }
      } else if (response.status === 'building') {
        // Continue polling every 5 seconds
        setTimeout(() => pollDownloadStatus(token), 5000);
      } else if (response.status === 'error') {
        onError('Plugin build failed. Please try again or contact support.');
      }
    } catch (err) {
      console.error('Error checking download status:', err);
      // Stop polling on error
    }
  };

  const handleCreateDownloadToken = async () => {
    if (!currentLicense) return;

    try {
      setDownloadLoading(true);
      onError(null);
      onSuccess(null);

      // Use the new user endpoint that handles authentication and email automatically
      const response = await licenseService.createDownloadToken({
        license_key: currentLicense.license_key,
        max_downloads: 3,
        expires_in_hours: 24
      });

      if (response.success) {
        setDownloadToken(response.token);
        
        if (response.reused) {
          onSuccess(response.message || 'Using existing download token. Checking status...');
        } else {
          onSuccess(response.message || 'Download token created! Your plugin is being built...');
        }
        
        // Start polling for download status
        pollDownloadStatus(response.token);
      }
    } catch (err) {
      onError(err.message || 'Failed to create download token');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadToken) return;

    try {
      // Use the new GET endpoint for direct downloads
      const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        return import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
      };
      const downloadUrl = `${getApiUrl()}/download/${downloadToken}`;
      window.open(downloadUrl, '_blank');
      onSuccess('Download started!');
      
      // Refresh download status after a short delay to get updated count
      setTimeout(() => {
        pollDownloadStatus(downloadToken);
      }, 2000);
    } catch (err) {
      onError(err.message || 'Failed to download plugin');
    }
  };

  const resetDownloadToken = () => {
    setDownloadToken(null);
    setDownloadStatus(null);
    onSuccess(null);
  };

  if (!currentLicense) {
    return null;
  }

  return (
    <div className="download-section">
      <h2>Download Plugin</h2>
        <p>
          <strong>Note:</strong> You can download the plugin, but it will not work unless your payment has cleared (if you paid by check) and your license is active.
        </p>
      
      {!downloadToken ? (
        <Button 
          variant="primary" 
          onClick={handleCreateDownloadToken}
          disabled={downloadLoading || !currentLicense.is_active}
        >
          {downloadLoading ? 'Creating Download...' : 'Create Download'}
        </Button>
      ) : (
        <div className="download-info">
          <p><strong>Download Token:</strong> {downloadToken}</p>
          {downloadStatus && (
            <div className="download-status">
              <p><strong>Status:</strong> {downloadStatus.status}</p>
              {downloadStatus.message && <p>{downloadStatus.message}</p>}
              
              {downloadStatus.status === 'ready' && (
                <div className="download-ready">
                  <Button variant="primary" onClick={handleDownload}>
                    Download Plugin ZIP
                  </Button>
                  <div className="download-stats">
                    <p><small>Downloads: {downloadStatus.download_count || 0} / {downloadStatus.max_downloads || 3}</small></p>
                    <p><small>Expires: {downloadStatus.expires_at ? new Date(downloadStatus.expires_at).toLocaleString() : 'Unknown'}</small></p>
                  </div>
                </div>
              )}
              
              {downloadStatus.status === 'building' && (
                <div className="building-indicator">
                  <p>Building your plugin... Please wait.</p>
                  <p><small>You can safely refresh this page without losing your progress, or hang tight for a few seconds.</small></p>
                </div>
              )}
            </div>
          )}
          
          <div className="token-actions">
            {/* Only show Create New Token if token is exhausted, expired, or has errors */}
            {downloadStatus && (
              (downloadStatus.download_count >= downloadStatus.max_downloads || 
               downloadStatus.status === 'expired' || 
               downloadStatus.status === 'error') && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={resetDownloadToken}
                  >
                    Create New Token
                  </Button>
                  <small>
                    {downloadStatus.download_count >= downloadStatus.max_downloads 
                      ? 'You have used all downloads for this token. Create a new one to get 3 more downloads.' 
                      : downloadStatus.status === 'expired' 
                      ? 'This token has expired. Create a new one to download your plugin.'
                      : 'This token encountered an error. Create a new one to try again.'}
                  </small>
                </>
              )
            )}
            
            {/* Show reuse info only when token still has downloads available */}
            {downloadStatus && downloadStatus.download_count < downloadStatus.max_downloads && downloadStatus.status !== 'expired' && downloadStatus.status !== 'error' && (
              <small>Note: You can reuse this token up to {downloadStatus.max_downloads || 3} times (or until it expires in 24 hours)</small>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DownloadPluginCard;
