import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">MyApp</div>
      <div className="navbar-right">
        <span className="navbar-user">Hi, {username || "User"}</span>
        <button className="navbar-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
