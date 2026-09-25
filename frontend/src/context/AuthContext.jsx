import { createContext, useContext, useState, useEffect } from "react";


// Decodes a JWT's payload without needing any library.
// Returns null if the token is malformed.
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // On first load, check localStorage to see if a token already exists
  // (this is what keeps the user "logged in" after a page refresh)
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("access_token")
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );

  const [ permissions, setPermissions ] = useState(
    JSON.parse(localStorage.getItem("permissions") || "[]")
  )

  const [ groups,setGroups ] = useState(
    JSON.parse(localStorage.getItem("groups") || "[]")
  )

  const [userId, setUserId] = useState(
    localStorage.getItem("user_id") || null
  );


  const isAuthenticated = !!accessToken;

  // Called after a successful login
  const login = ({ access, refresh, username: uname, permissions: perms, groups: grps, user_id }) => {
    localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
    if (uname) localStorage.setItem("username", uname);
    if (user_id) localStorage.setItem("user_id", user_id);
    localStorage.setItem("permissions", JSON.stringify(perms || []));
    localStorage.setItem("groups", JSON.stringify(grps || []));

    setAccessToken(access);
    setUsername(uname || "");
    setUserId(user_id || null);
    setPermissions(perms || []);
    setGroups(grps || []);
  }

  // Called on logout, or when a refresh attempt fails
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("permissions");
    localStorage.removeItem("groups");
    setAccessToken(null);
    setUsername("");
    setPermissions([]);
    setGroups([]);
  };

  // Re-fetches the current user's permissions/groups from the backend
  // without needing to log in again. Call this after an admin changes
  // someone's groups, or periodically, to keep permissions fresh.
  const refreshPermissions = async () => {
    if (!accessToken) return;
    try {
      // Dynamic import avoids a circular import between AuthContext and api/auth.js
      const { getMyProfile } = await import("../api/auth");
      const response = await getMyProfile();
      const perms = response.data.permissions || [];
      const grps = response.data.groups || [];

      localStorage.setItem("permissions", JSON.stringify(perms));
      localStorage.setItem("groups", JSON.stringify(grps));
      setPermissions(perms);
      setGroups(grps);
    } catch {
      // Silently ignore — if this fails, the user just keeps their
      // last-known permissions until the next successful refresh.
    }
  };
    
  const hasPermission = (codeName) => permissions.includes(codeName);
  const hasGroup = (groupName) => groups.includes(groupName);

  // Keep multiple tabs in sync (optional nice-to-have)
  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === "access_token" && !e.newValue) {
        setAccessToken(null);
        setUsername("");
        setPermissions([]);
        setGroups([]);
      }
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, []);
  useEffect(() => {
    if (!accessToken) return;

    const onFocus= () => refreshPermissions();
    window.addEventListener("focus", onFocus);

    const interval = setInterval(refreshPermissions, 2 * 60 * 1000);




    const payload = decodeJwt(accessToken);
    if (!payload?.exp) return;

    const expiresAtMs = payload.exp * 1000;
    const msUntilExpiry = expiresAtMs - Date.now();

    if (msUntilExpiry <= 0) {
      // already expired (e.g. stale token loaded from localStorage)
      logout();
      return;
    }

    const timer = setTimeout(() => {
      logout();
    }, msUntilExpiry);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer); // cleanup if token changes/unmounts
    }
      
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        username,
        permissions,
        groups,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        hasGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
