import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type SessionUser } from "../api";
import PasswordInput from "../components/PasswordInput";
import SkillCombobox from "../components/SkillCombobox";

export default function Auth({ mode, onAuth }: { mode: "login" | "signup"; onAuth: (u: SessionUser) => void }) {
  const role = useParams().role === "company" ? "company" : "student";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const noun = role === "student" ? "graduate" : "company";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (signup) {
      if (password.length < 8) return setError("Use at least 8 characters for your password.");
      if (password !== confirm) return setError("Passwords do not match.");
    }
    setBusy(true);
    try {
      const r = signup
        ? await api<{ user: SessionUser }>("/auth/register", { body: { role, name, email, password, ...(role === "student" ? { skills } : {}) } })
        : await api<{ user: SessionUser }>("/auth/login", { body: { email, password } });
      onAuth(r.user);
      navigate(r.user.role === "student" ? "/student" : r.user.subscriptionStatus === "active" ? "/company" : "/company/pricing", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-top">
        <span className="brand">Mish Senior</span>
        <Link to="/">← Back to welcome</Link>
      </div>
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>{signup ? `Create your ${noun} account` : `Sign in to Mish Senior`}</h1>
        <p className="sub">
          {signup
            ? role === "student" ? "A clearer path from graduation to your first IT role." : "Find verified junior IT talent faster."
            : "Welcome back. Enter your email and password."}
        </p>
        {error && <div className="notice error" role="alert">{error}</div>}

        {signup && (
          <div className="field">
            <label htmlFor="name">{role === "student" ? "Full name" : "Company name"}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === "student" ? "Ahmad Omar" : "Acme Technologies"} autoComplete={role === "student" ? "name" : "organization"} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role === "student" ? "ahmad.omar@example.com" : "hr@acme.com"} autoComplete="email" required />
        </div>
        {signup ? (
          <div className="form-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
        )}

        {signup && <p className="fine">Use at least 8 characters for your password.</p>}
        {signup && role === "student" && (
          <div className="field">
            <label>Choose your specialization</label>
            <SkillCombobox selected={skills} onChange={setSkills} />
          </div>
        )}
        <button type="submit" className="full" disabled={busy}>
          {busy ? "Please wait…" : signup ? `→ Create ${noun} account` : "→ Sign in"}
        </button>
        <div className="auth-alt">
          {signup ? "Already have an account?" : "New to Mish Senior?"}
          <Link to={signup ? "/login" : `/signup/${role}`}>{signup ? "Sign in" : `Create a ${noun} account`}</Link>
        </div>
      </form>
    </>
  );
}
