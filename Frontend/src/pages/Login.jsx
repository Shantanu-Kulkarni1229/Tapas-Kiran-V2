import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api.js";
import { useAuth } from "../auth.jsx";
import { ErrorBox } from "../components/ui.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/chat" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/chat");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <form onSubmit={submit} className="card space-y-3">
        <div className="flex items-center gap-2">
          <img src="/Logo.png" alt="" className="h-10 w-10 object-contain" />
          <h1 className="text-xl font-semibold">Tapas Kiran</h1>
        </div>
        <ErrorBox message={error} />
        <label className="block text-sm">
          Email
          <input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block text-sm">
          Password
          <input className="input mt-1" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
        <p className="text-center text-sm text-slate-600">
          New officer? <Link className="text-blue-700 underline" to="/signup">Request an account</Link>
        </p>
      </form>
    </div>
  );
}
