import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
    navigate("/login");
  };

  // return (
  //   <nav className="navbar">
  //     <div className="navbar-brand">&gt;_ MyApp</div>
  //     <div className="navbar-links">
  //       <Link to="/dashboard" className="navbar-link">
  //         Dashboard
  //       </Link>
  //       <Link to="/users" className="navbar-link">
  //         Users
  //       </Link>
  //     </div>
  //     <div className="navbar-right">
  //       <span className="navbar-user">{username || "User"}</span>
  //       <button className="navbar-btn" onClick={handleLogout}>
  //         Logout
  //       </button>
  //     </div>
  //   </nav>
  // );
}
