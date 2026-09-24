import { useAuth } from "../context/AuthContext";
import Forbidden from "../pages/Forbidden";

// Wrap a page that should only be reachable by users with a specific
// permission. Unlike ProtectedRoute (which only checks login), this
// checks authorization — so typing the URL directly is blocked too,
// not just hidden from the sidebar.
export default function RequirePermission({ permission, children }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <Forbidden />;
  }

  return children;
}