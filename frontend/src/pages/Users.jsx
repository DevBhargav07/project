import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// import { Trash2 } from "lucide-react";
import { getAllUsers /*, deleteUser */ } from "../api/auth";
import { FormatDate } from "../components/FormatDate";
// import { useAuth } from "../context/AuthContext";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Delete is temporarily disabled — backend issue being investigated.
  // const { hasPermission } = useAuth();
  // const canDelete = hasPermission("delete_users");

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // const handleDelete = async (e, userId, username) => {
  //   e.stopPropagation();
  //   if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
  //
  //   try {
  //     await deleteUser(userId);
  //     toast.success(`Deleted ${username}`);
  //     setUsers((prev) => prev.filter((u) => u.id !== userId));
  //   } catch (error) {
  //     toast.error(error.response?.data?.detail || "Failed to delete user");
  //   }
  // };

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
              {/* {canDelete && <th>Actions</th>} */}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="users-table-row-clickable"
                onClick={() => navigate(`/users/${u.id}`)}
              >
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <FormatDate timestamp={u.created_at} />
                </td>
                {/* {canDelete && (
                  <td className="users-actions">
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Delete user"
                      onClick={(e) => handleDelete(e, u.id, u.username)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )} */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}