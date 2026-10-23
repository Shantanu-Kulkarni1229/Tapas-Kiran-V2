import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { ErrorBox } from "../components/ui.jsx";

const FIELDS = [
  ["name", "Full name", "text"],
  ["email", "Email", "email"],
  ["password", "Password (min 8 characters)", "password"],
  ["phoneNumber", "Phone (10 digits, optional)", "text"],
  ["district", "District", "text"],
  ["taluka", "Taluka", "text"],
  ["policeStation", "Police station", "text"],
];

export default function Signup() {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Empty optional fields are dropped so the backend validation doesn't see "".
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v));
      await api.post("/auth/signup", body);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="card mx-auto mt-16 max-w-sm space-y-3 text-sm">
        <p>Your request was sent. A station admin must approve your account before you can log in.</p>
        <Link className="text-blue-700 underline" to="/login">Back to login</Link>
      </div>
    );

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <form onSubmit={submit} className="card space-y-3">
        <h1 className="text-xl font-semibold">Request an account</h1>
        <ErrorBox message={error} />
        {FIELDS.map(([key, label, type]) => (
          <label key={key} className="block text-sm">
            {label}
            <input className="input mt-1" type={type} required={!["taluka", "phoneNumber"].includes(key)} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <button className="btn w-full" disabled={busy}>{busy ? "Sending..." : "Send request"}</button>
        <p className="text-center text-sm"><Link className="text-blue-700 underline" to="/login">Back to login</Link></p>
      </form>
    </div>
  );
}
