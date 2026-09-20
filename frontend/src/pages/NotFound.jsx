import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="notfound-page">
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      {/* Send logged-in users to the dashboard, logged-out users to login */}
      <Link to={isAuthenticated ? "/dashboard" : "/login"} className="notfound-link">
        {isAuthenticated ? "Go to Dashboard" : "Go to Login"}
      </Link>
    </div>
  );
}
