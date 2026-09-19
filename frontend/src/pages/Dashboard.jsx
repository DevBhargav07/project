import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { username } = useAuth();

  return (
    <div>
      <Navbar />
      <div className="page-content">
        <h1>Welcome, {username}! 🎉</h1>
        <p>You are logged in. This page is protected by your JWT token.</p>
      </div>
    </div>
  );
}
