import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";

function truncateLabel(label, max = 10) {
  if (label.length <= max) return label;
  return label.slice(0, max) + "...";
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { to: "/users", label: "Users", icon: Users, permission: "view_users" },
  { to: "/chat", label: "Chat", icon: MessageCircle, permission: null, end: true },
  { to: "/chat/visibility", label: "Visibility", icon: Eye, permission: null },
  { to: "/admin/regions", label: "Regions", icon: Globe, permission: "add_regions" },
  { to: "/admin/groups", label: "Groups & Permissions", icon: ShieldCheck, permission: "change_groups" },
];

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { hasPermission } = useAuth();
  const isMobile = useMediaQuery("(max-width: 860px)");
  const location = useLocation();

  const [collapsedPref, setCollapsedPref] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "true"
  );
  // On phones the sidebar is a slide-in drawer, which always shows full labels.
  const collapsed = collapsedPref && !isMobile;

  const toggleCollapsed = () => {
    setCollapsedPref((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close the drawer after every navigation
  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {isMobile && mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}

      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
          isMobile && mobileOpen ? "sidebar-mobile-open" : ""
        }`}
      >
        {!isMobile && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map(
            ({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
                title={collapsed ? label : undefined}
              >
                <span className="sidebar-link-icon-wrap">
                  <Icon size={18} className="sidebar-link-icon" />
                </span>
                {!collapsed && <span className="sidebar-link-text">{truncateLabel(label)}</span>}
                {collapsed && <span className="sidebar-tooltip">{label}</span>}
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}