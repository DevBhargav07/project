import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  getGroupsDetailed,
  createGroup,
  deleteGroup,
  getAllPermissions,
  createPermission,
} from "../api/auth";
import { getErrorMessage } from "@/api/errors";

export default function GroupsAdmin() {
  const [groups, setGroups] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPermIds, setNewGroupPermIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [newPerm, setNewPerm] = useState({ codename: "", name: "", model_name: "", description: "" });
  const [creatingPerm, setCreatingPerm] = useState(false);

  const load = async () => {
    try {
      const [groupsRes, permsRes] = await Promise.all([
        getGroupsDetailed(),
        getAllPermissions(),
      ]);
      setGroups(groupsRes.data);
      setAllPermissions(permsRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load groups/permissions"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleNewGroupPerm = (permId) => {
    setNewGroupPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreatingGroup(true);
    try {
      await createGroup(newGroupName.trim(), newGroupPermIds);
      toast.success(`Group "${newGroupName}" created`);
      setNewGroupName("");
      setNewGroupPermIds([]);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error.response?.data?.detail, "Failed to create group"));
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`)) return;
    try {
      await deleteGroup(groupId);
      toast.success(`Deleted "${groupName}"`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (error) {
      toast.error(getErrorMessage(error.response?.data?.detail, "Failed to delete group"));
    }
  };

  const handleCreatePermission = async () => {
    if (!newPerm.codename.trim() || !newPerm.name.trim() || !newPerm.model_name.trim()) {
      toast.error("Codename, name, and model name are required");
      return;
    }
    setCreatingPerm(true);
    try {
      await createPermission(
        newPerm.codename.trim(),
        newPerm.name.trim(),
        newPerm.model_name.trim(),
        newPerm.description.trim() || null
      );
      toast.success(`Permission "${newPerm.codename}" created`);
      setNewPerm({ codename: "", name: "", model_name: "", description: "" });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error.response?.data?.detail, "Failed to create permission"));
    } finally {
      setCreatingPerm(false);
    }
  };

  if (loading) return <div className="page-content">Loading...</div>;

  return (
    <div className="page-content">
      <h1>Groups & Permissions</h1>

      {/* Existing groups */}
      <div className="profile-section">
        <h2>Existing groups</h2>
        {groups.length === 0 ? (
          <p className="profile-empty">No groups yet.</p>
        ) : (
          <div className="admin-group-list">
            {groups.map((g) => (
              <div key={g.id} className="admin-group-card">
                <div className="admin-group-card-header">
                  <strong>{g.name}</strong>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete group"
                    onClick={() => handleDeleteGroup(g.id, g.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {g.permissions.length === 0 ? (
                  <p className="profile-empty">No permissions</p>
                ) : (
                  <div className="profile-tags">
                    {g.permissions.map((p) => (
                      <span key={p} className="profile-tag">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create a new group */}
      <div className="profile-section">
        <h2>Create a new group</h2>
        <input
          type="text"
          placeholder="Group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="admin-input"
        />
        <div className="modal-group-list" style={{ marginTop: 12 }}>
          {allPermissions.map((p) => (
            <label key={p.id} className="modal-group-item">
              <input
                type="checkbox"
                checked={newGroupPermIds.includes(p.id)}
                onChange={() => toggleNewGroupPerm(p.id)}
              />
              {p.codename}
            </label>
          ))}
        </div>
        <button className="modal-btn-primary" onClick={handleCreateGroup} disabled={creatingGroup}>
          <Plus size={16} />
          {creatingGroup ? "Creating..." : "Create group"}
        </button>
      </div>

      {/* Create a new permission */}
      <div className="profile-section">
        <h2>Create a new permission</h2>
        <input
          type="text"
          placeholder="Codename (e.g. view_reports)"
          value={newPerm.codename}
          onChange={(e) => setNewPerm({ ...newPerm, codename: e.target.value })}
          className="admin-input"
        />
        <input
          type="text"
          placeholder="Display name (e.g. Can view reports)"
          value={newPerm.name}
          onChange={(e) => setNewPerm({ ...newPerm, name: e.target.value })}
          className="admin-input"
        />
        <input
          type="text"
          placeholder="Model name (e.g. reports)"
          value={newPerm.model_name}
          onChange={(e) => setNewPerm({ ...newPerm, model_name: e.target.value })}
          className="admin-input"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newPerm.description}
          onChange={(e) => setNewPerm({ ...newPerm, description: e.target.value })}
          className="admin-input"
        />
        <button className="modal-btn-primary" onClick={handleCreatePermission} disabled={creatingPerm}>
          <Plus size={16} />
          {creatingPerm ? "Creating..." : "Create permission"}
        </button>
      </div>
    </div>
  );
}