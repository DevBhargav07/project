import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getAllUsers } from "../api/auth";


function FormatDate({ timestamp }) {
  if (!timestamp) return <span>—</span>;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return <span>—</span>; // guards against bad/missing data

  const formatted = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  return <span>{formatted}</span>;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        setUsers(response.data);
      } catch (error) {
        const message =
          error.response?.data?.detail || "Failed to load users";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="page-content">
      <h1>All Users</h1>

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <FormatDate timestamp={u.created_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
