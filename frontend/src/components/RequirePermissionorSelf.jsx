import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Forbidden from "../pages/Forbidden";

// Like RequirePermission, but also allows access if the URL's :id
// param matches the logged-in user's own id — so everyone can always
// view their own user-detail page, even without view_users.
export default function RequirePermissionOrSelf({ permission, children }) {
  const { hasPermission, userId } = useAuth();
  const { id } = useParams();

  const isOwnPage = String(userId) === String(id);

  if (!isOwnPage && !hasPermission(permission)) {
    return <Forbidden />;
  }

  return children;
}