import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any page that should only be visible to logged-in users
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were trying to go (e.g. /users) in route "state".
    // Login.jsx reads this back after a successful login.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
