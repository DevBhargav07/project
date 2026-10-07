import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getRegions, getMyVisibility, updateMyVisibility } from "../api/auth";

export default function VisibilitySettings() {
  const [regions, setRegions] = useState([]);
  const [visibility, setVisibility] = useState("nobody");
  const [selectedRegionIds, setSelectedRegionIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const [regionsRes, visRes] = await Promise.all([
          getRegions(),
          getMyVisibility(),
        ]);
        if (!ignore) {
          setRegions(regionsRes.data);
          setVisibility(visRes.data.visibility);
          setSelectedRegionIds(visRes.data.regions.map((r) => r.id));
        }
      } catch (error) {
        if (!ignore) toast.error("Failed to load visibility settings");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, []);

  const toggleRegion = (regionId) => {
    setSelectedRegionIds((prev) =>
      prev.includes(regionId) ? prev.filter((id) => id !== regionId) : [...prev, regionId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMyVisibility(visibility, selectedRegionIds);
      toast.success("Visibility updated");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update visibility");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-content">Loading...</div>;

  return (
    <div className="page-content profile-page">
      <h1>Chat Visibility</h1>

      <div className="profile-section">
        <h2>Who can see you</h2>
        <div className="modal-group-list">
          <label className="modal-group-item">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "everyone"}
              onChange={() => setVisibility("everyone")}
            />
            Everyone
          </label>
          <label className="modal-group-item">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "region"}
              onChange={() => setVisibility("region")}
            />
            Only people in selected regions
          </label>
          <label className="modal-group-item">
            <input
              type="radio"
              name="visibility"
              checked={visibility === "nobody"}
              onChange={() => setVisibility("nobody")}
            />
            Nobody (invisible)
          </label>
        </div>

        {visibility === "region" && (
          <div className="profile-section">
            <h2>Select regions</h2>
            <div className="modal-group-list">
              {regions.map((r) => (
                <label key={r.id} className="modal-group-item">
                  <input
                    type="checkbox"
                    checked={selectedRegionIds.includes(r.id)}
                    onChange={() => toggleRegion(r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save visibility"}
        </button>
      </div>
    </div>
  );
}