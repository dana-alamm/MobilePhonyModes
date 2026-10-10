import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, type SessionUser } from "./api";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import Assessment from "./pages/Assessment";
import PracticeInterview from "./pages/PracticeInterview";
import OfficialInterview from "./pages/OfficialInterview";
import CompanyDashboard from "./pages/CompanyDashboard";
import CandidateProfile from "./pages/CandidateProfile";

export default function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    api<{ user: SessionUser | null }>("/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null));
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST", body: {} });
    setUser(null);
    navigate("/login");
  }, [navigate]);

  if (user === undefined) return <div className="container muted">Loading…</div>;

  const home = user ? (user.role === "student" ? "/student" : "/company") : "/login";
  const shell = (el: React.ReactElement, role: "student" | "company") =>
    !user ? <Navigate to="/login" replace /> : user.role !== role ? <Navigate to={home} replace /> : (
      <>
        <header className="topbar">
          <span className="brand">MISH SENIOR</span>
          <span className="who">
            <span>{user.name} · {user.role}</span>
            <button className="ghost small" onClick={logout}>Log out</button>
          </span>
        </header>
        <main className="container">{el}</main>
      </>
    );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login onLogin={setUser} />} />
      <Route path="/student" element={shell(<StudentDashboard />, "student")} />
      <Route path="/student/assessment/:track" element={shell(<Assessment />, "student")} />
      <Route path="/student/practice" element={shell(<PracticeInterview />, "student")} />
      <Route path="/student/interview/:stage" element={shell(<OfficialInterview />, "student")} />
      <Route path="/company" element={shell(<CompanyDashboard />, "company")} />
      <Route path="/company/candidates/:id" element={shell(<CandidateProfile />, "company")} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
