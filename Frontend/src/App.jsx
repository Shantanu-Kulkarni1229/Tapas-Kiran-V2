import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { isAdmin, useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import { Spinner } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Chat from "./pages/Chat.jsx";
import History from "./pages/History.jsx";
import DocGen from "./pages/DocGen.jsx";
import AdminDocuments from "./pages/AdminDocuments.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminStats from "./pages/AdminStats.jsx";

// Guards a group of routes. The backend enforces the same rules; this just avoids showing pages that would fail.
function Protected({ admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin(user)) return <Navigate to="/chat" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route path="/chat" element={<Chat />} />
          <Route path="/history" element={<History />} />
          <Route path="/documents/new" element={<DocGen />} />
          <Route element={<Protected admin />}>
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/stats" element={<AdminStats />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
