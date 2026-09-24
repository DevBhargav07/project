import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { getAllUsers } from "../api/auth";
import { FormatDate } from "../components/FormatDate";
import { useAuth } from "../context/AuthContext";
import EditUserGroupsModal from "../components/EditUserGroupsModal";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const { hasPermission } = useAuth();

  const canEdit = hasPermission("change_users");
  const canDelete = hasPermission("delete_users");

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to load users";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // const handleDelete = async (userId, username) => {
  //   if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;

  //   try {
  //     await deleteUser(userId);
  //     toast.success(`Deleted ${username}`);
  //     setUsers((prev) => prev.filter((u) => u.id !== userId));
  //   } catch (error) {
  //     const message = error.response?.data?.detail || "Failed to delete user";
  //     toast.error(message);
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
              {(canEdit || canDelete) && <th>Actions</th>}
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
                {(canEdit || canDelete) && (
                  <td className="users-actions">
                    {canEdit && (
                        <button
                          className="icon-btn"
                          title="Edit user"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    {/* {canDelete && (
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Delete user"
                        onClick={() => handleDelete(u.id, u.username)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )} */}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editingUser && (
      <EditUserGroupsModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={fetchUsers}
      />
    )}
    </div>
  );
}