/**
 * PublicRoute component handles routing for non-authenticated users
 * This component ensures that authenticated users are redirected away from
 * pages like login and register that they shouldn't access while logged in
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Loader from "../loader/Loader";

/**
 * PublicRoute component
 * Wraps components that should only be accessible to non-authenticated users
 *
 * @param {Object} props - Component props
 * @param {React.Component} props.children - The component to render if not authenticated
 * @param {string} props.redirectTo - Where to redirect if authenticated (default: '/dashboard')
 * @returns {React.Component} Either the public component or a redirect
 */
function PublicRoute({ children, redirectTo = "/dashboard" }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while we're checking authentication status
  if (isLoading) {
    return (
      <div className="">
        <Loader />
      </div>
    );
  }

  // If user is authenticated, redirect them to the dashboard
  // They shouldn't be on login/register pages while logged in
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated, render the public component
  return children;
}

export default PublicRoute;
