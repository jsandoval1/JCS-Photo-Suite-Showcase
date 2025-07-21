/**
 * ProtectedRoute component handles authentication-based routing
 * This component ensures that only authenticated users can access certain pages
 * If a user is not authenticated, they will be redirected to the login page
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Loader from "../loader/Loader";

/**
 * ProtectedRoute component
 * Wraps components that require authentication
 *
 * @param {Object} props - Component props
 * @param {React.Component} props.children - The component to render if authenticated
 * @param {string} props.redirectTo - Where to redirect if not authenticated (default: '/login')
 * @returns {React.Component} Either the protected component or a redirect
 */
function ProtectedRoute({ children, redirectTo = "/login" }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while we're checking authentication status
  if (isLoading) {
    return (
      <div className="">
        <Loader />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  // We save the current location so we can redirect back after login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected component
  return children;
}

export default ProtectedRoute;
