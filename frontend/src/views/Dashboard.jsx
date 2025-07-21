/**
 * Dashboard view page
 * This page is shown to authenticated users after login
 * It provides access to user account and license management features
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEmailVerification } from "../components/shared/useEmailVerification";
import {
  EmailVerificationNotice,
  Button,
  DownloadPluginCard,
  UserInfoSection,
  LicenseInfoSection,
  NoLicenseSection,
  DownloadMessages,
} from "../components";
import "../App.css";
import "../components/sections/DashboardGrid.css";
import Loader from "../components/loader/Loader";

function Dashboard() {
  const { user, logout, isLoading } = useAuth();
  const { isEmailVerified } = useEmailVerification();
  const navigate = useNavigate();

  // State for download messages
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  // Reference for scrolling to status messages
  const statusMessagesRef = useRef(null);

  // Auto-scroll to status messages when they appear
  useEffect(() => {
    if ((downloadError || downloadSuccess) && statusMessagesRef.current) {
      statusMessagesRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [downloadError, downloadSuccess]);

  const handleManageSubscription = () => {
    navigate("/subscription-management");
  };

  const handleChoosePlan = () => {
    navigate("/pricing");
  };

  const handleDownloadError = (error) => {
    setDownloadError(error);
    setDownloadSuccess(null);
  };

  const handleDownloadSuccess = (message) => {
    setDownloadSuccess(message);
    setDownloadError(null);
  };

  if (isLoading) {
    return (
      <div className="container">
        <section className="dashboard">
          <Loader />
        </section>
      </div>
    );
  }

  // Get user's primary license
  const primaryLicense =
    user?.licenses?.find((license) => license.role === "primary") || null;

  return (
    <div className="container">
      <section className="dashboard">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Dashboard</h1>

            <div className="secondary-actions">
              {primaryLicense && (
                <Button
                  variant="secondary"
                  onClick={handleManageSubscription}
                  disabled={!isEmailVerified}
                  title={
                    !isEmailVerified
                      ? "Email verification required to manage subscription"
                      : ""
                  }
                  className="manage-btn"
                >
                  Manage Subscription
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={!isEmailVerified}
                title={
                  !isEmailVerified
                    ? "Email verification required to access account settings"
                    : ""
                }
                className="settings-btn"
              >
                Account Settings
              </Button>
            </div>
          </div>

          {/* Download Messages */}
          <DownloadMessages
            downloadError={downloadError}
            downloadSuccess={downloadSuccess}
            ref={statusMessagesRef}
          />

          {/* Email Verification Notice */}
          <EmailVerificationNotice />

          <div className="user-card-info">
            <div className="info-user">
              {/* User Information */}
              <UserInfoSection user={user} />
            </div>
            <div className="info-plugin">
              {/* Download Plugin Section - Only shown if user has license */}
              {primaryLicense && (
                <DownloadPluginCard
                  currentLicense={primaryLicense}
                  onError={handleDownloadError}
                  onSuccess={handleDownloadSuccess}
                />
              )}
            </div>
          </div>
          {/* License Information or No License */}
          {primaryLicense ? (
            <LicenseInfoSection primaryLicense={primaryLicense} />
          ) : (
            <NoLicenseSection onManageSubscription={handleChoosePlan} />
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
