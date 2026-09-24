import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyProfile } from "../api/auth";
import { FormatDate } from "../components/FormatDate";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();
        setProfile(response.data);
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="page-content">Loading profile...</div>;
  if (!profile) return <div className="page-content">Could not load profile.</div>;

  return (
    <div className="page-content profile-page">
      <h1>My Profile</h1>

      <div className="profile-section">
        <div className="profile-row">
          <span className="profile-label">Username</span>
          <span className="profile-value">{profile.username}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Email</span>
          <span className="profile-value">{profile.email}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Account created</span>
          <span className="profile-value">
            <FormatDate timestamp={profile.created_at} />
          </span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Role</span>
          <span className="profile-value">
            {profile.is_superuser ? "Superuser" : "Standard user"}
          </span>
        </div>
      </div>

      <div className="profile-section">
        <h2>Groups</h2>
        {profile.groups.length === 0 ? (
          <p className="profile-empty">No groups assigned.</p>
        ) : (
          <div className="profile-tags">
            {profile.groups.map((g) => (
              <span key={g} className="profile-tag">{g}</span>
            ))}
          </div>
        )}
      </div>

      <div className="profile-section">
        <h2>Permissions</h2>
        {profile.permissions.length === 0 ? (
          <p className="profile-empty">No permissions assigned.</p>
        ) : (
          <div className="profile-tags">
            {profile.permissions.map((p) => (
              <span key={p} className="profile-tag">{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}