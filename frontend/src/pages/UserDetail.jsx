import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check } from "lucide-react";
import {
  getUserDetail,
  getAllGroups,
  updateUserGroups,
  updateUserBasic,
  updateUserActiveStatus,
  updateUserSuperuserStatus,
} from "../api/auth";
import { FormatDate } from "../components/FormatDate";
import { useAuth } from "../context/AuthContext";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId: myUserId, hasPermission, groups: myGroups } = useAuth();

  const [user, setUser] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingGroups, setSavingGroups] = useState(false);

  const [editingBasic, setEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({ username: "", email: "" });
  const [savingBasic, setSavingBasic] = useState(false);

  const [savingActive, setSavingActive] = useState(false);
  const [savingSuperuser, setSavingSuperuser] = useState(false);

  // From the earlier is_superuser you're storing at login — if you
  // haven't already, this reads it the same way userId is read.
  const isSuperuser = localStorage.getItem("is_superuser") === "true";

  const canManageGroups = hasPermission("change_users");
  const canEditBasic = hasPermission("change_users");
  const isOwnPage = String(myUserId) === String(id);

  const load = async () => {
    try {
      const [userRes, groupsRes] = await Promise.all([
        getUserDetail(id),
        canManageGroups ? getAllGroups() : Promise.resolve({ data: [] }),
      ]);
      setUser(userRes.data);
      setBasicForm({ username: userRes.data.username, email: userRes.data.email });
      setAllGroups(groupsRes.data);
      setSelectedGroupIds(
        groupsRes.data.filter((g) => userRes.data.groups.includes(g.name)).map((g) => g.id)
      );
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load user");
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
    setSavingGroups(true);
    try {
      await updateUserGroups(user.id, selectedGroupIds);
      toast.success("Groups updated");
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update groups");
    } finally {
      setSavingGroups(false);
    }
  };

  const handleSaveBasic = async () => {
    setSavingBasic(true);
    try {
      await updateUserBasic(user.id, basicForm.username, basicForm.email);
      toast.success("User details updated");
      setEditingBasic(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user");
    } finally {
      setSavingBasic(false);
    }
  };

  const handleToggleActive = async () => {
    const next = !user.is_active;
    const label = next ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} ${user.username}?`)) return;

    setSavingActive(true);
    try {
      await updateUserActiveStatus(user.id, next);
      toast.success(`User ${next ? "activated" : "deactivated"}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    } finally {
      setSavingActive(false);
    }
  };

  const handleToggleSuperuser = async () => {
    const next = !user.is_superuser;
    const label = next ? "grant superuser to" : "revoke superuser from";
    if (!window.confirm(`Are you sure you want to ${label} ${user.username}?`)) return;

    setSavingSuperuser(true);
    try {
      await updateUserSuperuserStatus(user.id, next);
      toast.success(`Superuser status ${next ? "granted" : "revoked"}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update superuser status");
    } finally {
      setSavingSuperuser(false);
    }
  };

  if (loading) return <div className="page-content">Loading...</div>;
  if (!user) return <div className="page-content">User not found.</div>;

  return (
    <div className="page-content profile-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </button>

      <h1>{isOwnPage ? "My Profile" : user.username}</h1>

      <div className="profile-section">
        <div className="profile-section-header">
          <h2>Details</h2>
          {canEditBasic && !editingBasic && (
            <button className="icon-btn" title="Edit details" onClick={() => setEditingBasic(true)}>
              <Pencil size={15} />
            </button>
          )}
        </div>

        {!editingBasic ? (
          <>
            <div className="profile-row">
              <span className="profile-label">Username</span>
              <span className="profile-value">{user.username}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user.email}</span>
            </div>
          </>
        ) : (
          <div className="profile-edit-form">
            <input
              type="text"
              className="admin-input"
              value={basicForm.username}
              onChange={(e) => setBasicForm({ ...basicForm, username: e.target.value })}
              placeholder="Username"
            />
            <input
              type="email"
              className="admin-input"
              value={basicForm.email}
              onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
              placeholder="Email"
            />
            <div className="profile-edit-actions">
              <button type="button" className="modal-btn-primary" onClick={handleSaveBasic} disabled={savingBasic}>
                <Check size={15} />
                {savingBasic ? "Saving..." : "Save"}
              </button>
              <button
                className="modal-btn-secondary"
                onClick={() => {
                  setEditingBasic(false);
                  setBasicForm({ username: user.username, email: user.email });
                }}
              >
                <X size={15} />
                Cancel
              </button>
            </div>
          </div>
        )}

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
            {isSuperuser && !isOwnPage && (
              <button
                className="status-toggle-link"
                onClick={handleToggleSuperuser}
                disabled={savingSuperuser}
              >
                {user.is_superuser ? "Revoke" : "Grant"}
              </button>
            )}
          </span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Status</span>
          <span className="profile-value">
            {user.is_active ? "Active" : "Inactive"}
            {isSuperuser && !isOwnPage && (
              <button
                className="status-toggle-link"
                onClick={handleToggleActive}
                disabled={savingActive}
              >
                {user.is_active ? "Deactivate" : "Activate"}
              </button>
            )}
          </span>
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
            <button className="modal-btn-primary" onClick={handleSaveGroups} disabled={savingGroups}>
              {savingGroups ? "Saving..." : "Save groups"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}