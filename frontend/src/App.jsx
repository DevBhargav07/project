import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import Topbar from "./components/Topbar";
import Profile from "./pages/Profile";
import RequirePermission from "./components/RequirePermission";

// Every logged-in page (Dashboard, Users, ...) gets wrapped in this:
// sidebar on the left, page content on the right. Add new protected
// pages by wrapping them the same way in the Routes below.
function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Topbar />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <RequirePermission permission="view_users">
                    <AppLayout>
                      <Users />
                    </AppLayout>
                  </RequirePermission>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all: any unmatched URL shows the 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        {/* Global toast notification container */}
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
