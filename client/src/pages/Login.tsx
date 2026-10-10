import { useState } from "react";
import { api, type SessionUser } from "../api";

export default function Login({ onLogin }: { onLogin: (u: SessionUser) => void }) {
  const [role, setRole] = useState<"student" | "company">("student");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: SessionUser }>("/auth/demo", { body: { role, name } });
      onLogin(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="login">
        <h1 className="brand" style={{ fontSize: "1.8rem" }}>MISH SENIOR</h1>
        <p className="muted">
          Prove your skills with assessments and voice interviews. Companies see ranked, role-matched graduates instead of hundreds of CVs.
        </p>
        <form className="card" onSubmit={submit}>
          <div className="notice warn">
            <strong>DEMO LOGIN.</strong> This is a demo sign-in for the hackathon, not LinkedIn or a real account system. Use the same name next time to return to your progress.
          </div>
          <div className="seg" role="group" aria-label="Account type">
            <button type="button" className={role === "student" ? "on" : ""} onClick={() => setRole("student")}>Student</button>
            <button type="button" className={role === "company" ? "on" : ""} onClick={() => setRole("company")}>Company</button>
          </div>
          <div className="field">
            <label htmlFor="name">{role === "student" ? "Your name" : "Company name"}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === "student" ? "e.g. Dana Alamm" : "e.g. Orange Jordan"} autoComplete="off" required minLength={2} maxLength={60} />
          </div>
          {error && <div className="notice error">{error}</div>}
          <button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : `Continue as ${role} (demo)`}</button>
        </form>
      </div>
    </div>
  );
}
