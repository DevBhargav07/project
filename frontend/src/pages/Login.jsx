import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import MatrixRain from "../components/MatrixRain";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If they're already logged in and land on /login (e.g. typed the URL,
  // or clicked back), bounce them straight to the dashboard.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Where were they trying to go before being sent here? Set by
  // ProtectedRoute.jsx. Falls back to /dashboard if they just came
  // straight to /login normally.
  const redirectTo = location.state?.from || "/dashboard";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error("Please fill in both fields");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser(formData.username, formData.password);

      // FastAPI's OAuth2PasswordBearer convention returns:
      // { access_token: "<jwt>", token_type: "bearer" }
      // (plus "refresh_token" too, if your backend issues one)
      const { access_token, refresh_token } = response.data;

      login({
        access: access_token,
        refresh: refresh_token,
        username: formData.username,
      });

      toast.success("Logged in successfully!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Invalid username or password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <MatrixRain />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>&gt; LOGIN_</h2>

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="switch-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
