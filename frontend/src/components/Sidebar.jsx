import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar() {
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">MyApp</div>

        <nav className="sidebar-nav">
          {/* NavLink auto-adds an "active" class when this is the current page */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            Users
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark mode" : "☀️ Light mode"}
        </button>
        <div className="sidebar-user">{username || "User"}</div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
