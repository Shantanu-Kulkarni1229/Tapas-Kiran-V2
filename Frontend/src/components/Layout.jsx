import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { isAdmin, useAuth } from "../auth.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const link = ({ isActive }) => `rounded px-3 py-1.5 text-sm ${isActive ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-200"}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <img src="/Logo.png" alt="" className="h-8 w-8 object-contain" />
        <span className="mr-4 font-semibold">Tapas Kiran</span>
        <nav className="flex flex-wrap gap-1">
          <NavLink to="/chat" className={link}>Ask</NavLink>
          <NavLink to="/history" className={link}>History</NavLink>
          <NavLink to="/documents/new" className={link}>Draft a form</NavLink>
          {isAdmin(user) && (
            <>
              <NavLink to="/admin/documents" className={link}>Documents</NavLink>
              <NavLink to="/admin/users" className={link}>Users</NavLink>
              <NavLink to="/admin/stats" className={link}>Stats</NavLink>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
          <span>{user.name} · {user.policeStation}</span>
          <button
            className="btn-secondary"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
