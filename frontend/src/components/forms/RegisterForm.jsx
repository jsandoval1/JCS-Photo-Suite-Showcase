/**
 * RegisterForm component handles user registration
 * This form allows new users to create accounts in the system
 * It includes all required fields for the licensing server API
 */

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import "./RegisterForm.css";

/**
 * RegisterForm component
 * Provides a comprehensive form for user registration with validation
 */
function RegisterForm() {
  // Get authentication functions from context
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get pre-filled email from navigation state (if coming from hero section)
  const prefilledEmail = location.state?.prefilledEmail || "";

  // Form state - includes all required fields for the API
  const [formData, setFormData] = useState({
    // Personal information
    email: prefilledEmail,
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",

    // District information
    district_name: "",
    district_uniqueid: "",

    // Server URLs (optional)
    powerschool_url: "",
    test_url: "",
  });

  // Field-specific error state
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Handle input changes
   * Updates the form data and clears any existing errors
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear general error
    if (error) {
      clearError();
    }
  };

  /**
   * Validate form data
   * Returns true if form is valid, false otherwise
   * Sets field errors for any invalid fields
   */
  const validateForm = () => {
    const errors = {};

    // Personal information validation
    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // District information validation
    if (!formData.district_name.trim()) {
      errors.district_name = "District name is required";
    }

    if (!formData.district_uniqueid.trim()) {
      errors.district_uniqueid = "District unique ID is required";
    }

    // URL validation (optional fields)
    if (formData.powerschool_url && !isValidUrl(formData.powerschool_url)) {
      errors.powerschool_url = "Please enter a valid URL";
    }

    if (formData.test_url && !isValidUrl(formData.test_url)) {
      errors.test_url = "Please enter a valid URL";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Validate URL format
   * Simple URL validation helper function
   */
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Handle form submission
   * Validates form, attempts registration, and redirects on success
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data for API (exclude confirmPassword)
      const { confirmPassword, ...registrationData } = formData;

      // Attempt registration
      const result = await register(registrationData);

      if (result.success) {
        // Registration successful, redirect to dashboard
        navigate("/dashboard", { replace: true });
      }
      // If registration fails, the error will be set by the auth context
    } catch (error) {
      // This shouldn't happen as errors are handled by the auth context
      console.error("Unexpected registration error:", error);
    }
  };

  return (
    <div className="register-form">
      <h2>Create Your Account</h2>
      <p>Join JCS Photo Suite to manage your school's photo uploads</p>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid-3col">
          {/* Column 1: Personal Information */}
          <div className="form-section">
            <h3>Personal Information</h3>

            {/* <div className="form-row"> */}
            <div
              className={`form-group ${fieldErrors.first_name ? "error" : ""}`}
            >
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
                autoComplete="given-name"
                required
              />
              {fieldErrors.first_name && (
                <span className="field-error">{fieldErrors.first_name}</span>
              )}
            </div>

            <div
              className={`form-group ${fieldErrors.last_name ? "error" : ""}`}
            >
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter your last name"
                autoComplete="family-name"
                required
              />
              {fieldErrors.last_name && (
                <span className="field-error">{fieldErrors.last_name}</span>
              )}
            </div>
            {/* </div> */}

            <div className={`form-group ${fieldErrors.email ? "error" : ""}`}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div
              className={`form-group ${fieldErrors.password ? "error" : ""}`}
            >
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
              <span className="help-text">Must be at least 8 characters</span>
            </div>

            <div
              className={`form-group ${
                fieldErrors.confirmPassword ? "error" : ""
              }`}
            >
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
              {fieldErrors.confirmPassword && (
                <span className="field-error">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          {/* Column 2: District Information */}
          <div className="form-section">
            <h3>District Information</h3>

            <div
              className={`form-group ${
                fieldErrors.district_name ? "error" : ""
              }`}
            >
              <label htmlFor="district_name">District Name</label>
              <input
                type="text"
                id="district_name"
                name="district_name"
                value={formData.district_name}
                onChange={handleChange}
                placeholder="Enter your school district name"
                autoComplete="organization"
                required
              />
              {fieldErrors.district_name && (
                <span className="field-error">{fieldErrors.district_name}</span>
              )}
            </div>

            <div
              className={`form-group ${
                fieldErrors.district_uniqueid ? "error" : ""
              }`}
            >
              <label htmlFor="district_uniqueid">District Unique ID</label>
              <input
                type="text"
                id="district_uniqueid"
                name="district_uniqueid"
                value={formData.district_uniqueid}
                onChange={handleChange}
                placeholder="Enter your district's unique identifier"
                required
              />
              {fieldErrors.district_uniqueid && (
                <span className="field-error">
                  {fieldErrors.district_uniqueid}
                </span>
              )}
              <span className="help-text">
                This is your district's unique identifier code
              </span>
            </div>
            <h3>
              Server URLs 
              {/* <span className="optional">(Optional)</span> */}
            </h3>

            <div
              className={`form-group ${
                fieldErrors.powerschool_url ? "error" : ""
              }`}
            >
              <label htmlFor="powerschool_url">PowerSchool Server URL</label>
              <input
                type="url"
                id="powerschool_url"
                name="powerschool_url"
                value={formData.powerschool_url}
                onChange={handleChange}
                placeholder="https://your-powerschool-server.com"
              />
              {fieldErrors.powerschool_url && (
                <span className="field-error">
                  {fieldErrors.powerschool_url}
                </span>
              )}
              <span className="help-text">
                Your production PowerSchool server URL
              </span>
            </div>

            <div
              className={`form-group ${fieldErrors.test_url ? "error" : ""}`}
            >
              <label htmlFor="test_url">Test Server URL</label>
              <input
                type="url"
                id="test_url"
                name="test_url"
                value={formData.test_url}
                onChange={handleChange}
                placeholder="https://your-test-server.com"
              />
              {fieldErrors.test_url && (
                <span className="field-error">{fieldErrors.test_url}</span>
              )}
              <span className="help-text">
                Your test/development server URL
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="form-links">
        <p>
          Already have an account? <NavLink to="/login">Sign in here</NavLink>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
