import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { hasPermission } = useAuth();

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
          {hasPermission("view_users") && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              Users
            </NavLink>)}
        </nav>
      </div>
    </aside>
  );
}
