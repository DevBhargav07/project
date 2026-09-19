import { createContext, useContext, useState, useEffect } from "react";

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

  const isAuthenticated = !!accessToken;

  // Called after a successful login
  const login = ({ access, refresh, username: uname }) => {
    localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
    if (uname) localStorage.setItem("username", uname);

    setAccessToken(access);
    setUsername(uname || "");
  };

  // Called on logout, or when a refresh attempt fails
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    setAccessToken(null);
    setUsername("");
  };

  // Keep multiple tabs in sync (optional nice-to-have)
  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === "access_token" && !e.newValue) {
        setAccessToken(null);
        setUsername("");
      }
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, []);

  return (
    <AuthContext.Provider
      value={{ accessToken, username, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
