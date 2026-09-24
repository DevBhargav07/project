import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="page-content forbidden-page">
      <ShieldAlert size={48} className="forbidden-icon" />
      <h1>403 — Access denied</h1>
      <p>You don't have permission to view this page.</p>
      <Link to="/dashboard" className="notfound-link">
        Go to Dashboard
      </Link>
    </div>
  );
}