/**
 * LoginForm component handles user authentication
 * This form allows existing users to log into their accounts
 * It integrates with the AuthContext for state management
 */

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import "./LoginForm.css";

/**
 * LoginForm component
 * Provides a form for user login with validation and error handling
 */
function LoginForm() {
  // Get authentication functions from context
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page the user was trying to access before being redirected to login
  const from = location.state?.from?.pathname || "/dashboard";

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form, attempts login, and redirects on success
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Attempt login
      const result = await login(formData);

      if (result.success) {
        // Login successful, redirect to intended page or dashboard
        navigate(from, { replace: true });
      }
      // If login fails, the error will be set by the auth context
    } catch (error) {
      // This shouldn't happen as errors are handled by the auth context
      console.error("Unexpected login error:", error);
    }
  };

  return (
    <div className="login-form">
      <h2>Sign In</h2>

      {/* Display general error message */}
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Email field */}
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

        {/* Password field */}
        <div
          className={`form-group password-group ${
            fieldErrors.password ? "error" : ""
          }`}
        >
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          {fieldErrors.password && (
            <span className="field-error">{fieldErrors.password}</span>
          )}
        </div>
        {/* <p className="forgot-password">
          <NavLink to="/forgot-password">Forgot Password?</NavLink>
        </p> */}
        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>

      {/* Links to other pages */}
      <div className="form-links">
        <p>
          Don't have an account? <NavLink to="/register">Sign up here</NavLink>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
