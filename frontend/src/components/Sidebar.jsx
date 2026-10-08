import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function truncateLabel(label, max = 10) {
  if (label.length <= max) return label;
  return label.slice(0, max) + "...";
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { to: "/users", label: "Users", icon: Users, permission: "view_users" },
  { to: "/admin/groups", label: "Groups & Permissions", icon: ShieldCheck, permission: "change_groups" },
  { to: "/chat", label: "Chat", icon: MessageCircle, permission: null },
  { to: "/region/", label: "Region", icon: ShieldCheck, permission: "view_users"},
];

export default function Sidebar() {
  const { hasPermission } = useAuth();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "true"
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button
        className="sidebar-toggle-btn"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map(
          ({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-link-icon-wrap">
                <Icon size={18} className="sidebar-link-icon" />
              </span>
              {!collapsed && (
                <span className="sidebar-link-text">{truncateLabel(label)}</span>
              )}
              {collapsed && <span className="sidebar-tooltip">{label}</span>}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}