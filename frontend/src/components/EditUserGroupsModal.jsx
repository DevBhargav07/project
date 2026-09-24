import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { getAllGroups, updateUserGroups } from "../api/auth";
import { getErrorMessage } from "@/api/errors";

export default function EditUserGroupsModal({ user, onClose, onSaved }) {
  const [allGroups, setAllGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await getAllGroups();
        setAllGroups(response.data);
        // Pre-check whichever groups this user is already in.
        // user.groups is a list of group NAMES from the users list endpoint,
        // so we match by name against the full group list to get their ids.
        const preselected = response.data
          .filter((g) => user.groups?.includes(g.name))
          .map((g) => g.id);
        setSelectedIds(preselected);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load groups"));
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [user]);

  const toggleGroup = (groupId) => {
    setSelectedIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserGroups(user.id, selectedIds);
      toast.success(`Updated groups for ${user.username}`);
      onSaved();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to update groups";
      toast.error(getErrorMessage(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit groups — {user.username}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p>Loading groups...</p>
        ) : allGroups.length === 0 ? (
          <p>No groups exist yet.</p>
        ) : (
          <div className="modal-group-list">
            {allGroups.map((g) => (
              <label key={g.id} className="modal-group-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                {g.name}
              </label>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}