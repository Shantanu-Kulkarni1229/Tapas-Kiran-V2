import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Async, ErrorBox } from "../components/ui.jsx";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get("/users")
      .then((r) => setUsers(r.data.users))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (id, patch) => {
    setError("");
    try {
      await api.patch(`/users/${id}`, patch);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const resetPassword = (u) => {
    const newPassword = window.prompt(`New password for ${u.name} (min 8 characters):`);
    if (newPassword) update(u._id, { newPassword });
  };

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Users</h1>
      <ErrorBox message={error} />
      <Async loading={loading} empty={users.length === 0} emptyText="No users.">
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-2">Name</th><th className="p-2">Station</th><th className="p-2">Role</th><th className="p-2">Logins</th><th className="p-2">Last login</th><th className="p-2">Status</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-slate-100">
                  <td className="p-2">{u.name}<div className="text-xs text-slate-500">{u.email}</div></td>
                  <td className="p-2">{u.policeStation}, {u.district}</td>
                  <td className="p-2">
                    {me.role === "super_admin" && u._id !== me.id ? (
                      <select className="input w-auto" value={u.role} onChange={(e) => update(u._id, { role: e.target.value })}>
                        <option value="officer">officer</option>
                        <option value="station_admin">station_admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    ) : u.role}
                  </td>
                  <td className="p-2">{u.loginCount}</td>
                  <td className="p-2">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
                  <td className="p-2">{u.active ? "active" : <span className="text-amber-700">pending / disabled</span>}</td>
                  <td className="space-x-1 p-2 text-right whitespace-nowrap">
                    {u._id !== me.id && (
                      <>
                        <button className="btn-secondary" onClick={() => update(u._id, { active: !u.active })}>{u.active ? "Disable" : "Approve"}</button>
                        <button className="btn-secondary" onClick={() => resetPassword(u)}>Reset password</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </div>
  );
}
