import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Moon, Sun, UserCircle, User, LogOut } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { username, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    toast.info("You have been logged out");
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        <button
          onClick={toggleTheme}
          className="topbar-icon-btn"
          aria-label="Toggle theme"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="topbar-profile" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="topbar-icon-btn"
            aria-label="Account menu"
            title="Account"
          >
            <UserCircle size={20} />
          </button>

          {dropdownOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-name">{username || "User"}</div>
              <button className="topbar-dropdown-item" onClick={handleProfileClick}>
                <User size={16} />
                Profile
              </button>
              <button
                className="topbar-dropdown-item topbar-dropdown-item-danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}