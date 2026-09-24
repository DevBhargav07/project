import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getUserDetail, getAllGroups, updateUserGroups } from "../api/auth";
import { FormatDate } from "../components/FormatDate";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "@/api/errors";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { username: myUsername, permissions, hasPermission } = useAuth();

  const [user, setUser] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManageGroups = hasPermission("change_users");
  const canDelete = hasPermission("delete_users");

  const load = async () => {
    try {
      const [userRes, groupsRes] = await Promise.all([
        getUserDetail(id),
        canManageGroups ? getAllGroups() : Promise.resolve({ data: [] }),
      ]);
      setUser(userRes.data);
      setAllGroups(groupsRes.data);
      setSelectedGroupIds(
        groupsRes.data.filter((g) => userRes.data.groups.includes(g.name)).map((g) => g.id)
      );
    } catch (error) {
      toast.error(getErrorMessage(error.response?.data?.detail , "Failed to load user"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleGroup = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((gid) => gid !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveGroups = async () => {
    setSaving(true);
    try {
      await updateUserGroups(user.id, selectedGroupIds);
      toast.success("Groups updated");
      load();
    } catch (error) {
      toast.error(getErrorMessage(error.response?.data?.detail , "Failed to update groups"));
    } finally {
      setSaving(false);
    }
  };

  // const handleDelete = async () => {
  //   if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
  //   try {
  //     await deleteUser(user.id);
  //     toast.success(`Deleted ${user.username}`);
  //     navigate("/users");
  //   } catch (error) {
  //     toast.error(getErrorMessage(error.response?.data?.detail , "Failed to delete user"));
  //   }
  // };

  if (loading) return <div className="page-content">Loading...</div>;
  if (!user) return <div className="page-content">User not found.</div>;

  return (
    <div className="page-content profile-page">
      <button className="back-link" onClick={() => navigate("/users")}>
        <ArrowLeft size={16} />
        Back to users
      </button>

      <h1>{user.username}</h1>

      <div className="profile-section">
        <div className="profile-row">
          <span className="profile-label">Username</span>
          <span className="profile-value">{user.username}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user.email}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Account created</span>
          <span className="profile-value">
            <FormatDate timestamp={user.created_at} />
          </span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Role</span>
          <span className="profile-value">
            {user.is_superuser ? "Superuser" : "Standard user"}
          </span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Status</span>
          <span className="profile-value">{user.is_active ? "Active" : "Inactive"}</span>
        </div>
      </div>

      <div className="profile-section">
        <h2>Groups</h2>
        {!canManageGroups ? (
          user.groups.length === 0 ? (
            <p className="profile-empty">No groups assigned.</p>
          ) : (
            <div className="profile-tags">
              {user.groups.map((g) => (
                <span key={g} className="profile-tag">{g}</span>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="modal-group-list">
              {allGroups.map((g) => (
                <label key={g.id} className="modal-group-item">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                  />
                  {g.name}
                </label>
              ))}
            </div>
            <button className="modal-btn-primary" onClick={handleSaveGroups} disabled={saving}>
              {saving ? "Saving..." : "Save groups"}
            </button>
          </>
        )}
      </div>

      {/* {canDelete && user.username !== myUsername && (
        <div className="profile-section">
          <button className="danger-btn" onClick={handleDelete}>
            <Trash2 size={16} />
            Delete this user
          </button>
        </div>
      )} */}
    </div>
  );
}