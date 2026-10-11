import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, clearClientState, type SessionUser } from "./api";
import CompanyBell from "./components/CompanyBell";
import NotificationBell from "./components/NotificationBell";
import CompanyMessages from "./pages/CompanyMessages";
import Messages from "./pages/Messages";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import StudentDashboard from "./pages/StudentDashboard";
import Assessment from "./pages/Assessment";
import PracticeInterview from "./pages/PracticeInterview";
import OfficialInterview from "./pages/OfficialInterview";
import CompanyDashboard from "./pages/CompanyDashboard";
import CandidateProfile from "./pages/CandidateProfile";

export default function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api<{ user: SessionUser | null }>("/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null));
  }, []);

  const logout = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST", body: {} }); } finally {
      clearClientState();
      setUser(null);
    }
    navigate("/");
  }, [navigate]);

  // A new session always starts clean: clear stored state before the new account is shown.
  const onAuth = useCallback((u: SessionUser) => {
    clearClientState();
    setUser(u);
  }, []);

  if (user === undefined) return <div className="container muted">Loading…</div>;

  const subscribed = user?.subscriptionStatus === "active";
  const home = user ? (user.role === "student" ? "/student" : subscribed ? "/company" : "/company/pricing") : "/";
  const shell = (el: React.ReactElement, role: "student" | "company", opts: { allowUnsubscribed?: boolean } = {}) =>
    !user ? <Navigate to="/" replace /> : user.role !== role ? <Navigate to={home} replace />
    : role === "company" && !subscribed && !opts.allowUnsubscribed ? <Navigate to="/company/pricing" replace /> : (
      <>
        <header className="topbar">
          <span className="brand">Mish Senior</span>
          <span className="who">
            {user.role === "student" && <NotificationBell />}
            {user.role === "company" && subscribed && <CompanyBell />}
            <span>{user.name} · {user.role}</span>
            <button className="ghost small" onClick={logout}>Log out</button>
          </span>
        </header>
        <main className="container">
          {location.pathname !== home && (
            <button className="ghost small back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(home))}>← Back</button>
          )}
          {el}
        </main>
      </>
    );

  return (
    <Routes key={user?.id ?? "anon"}>
      <Route path="/" element={<Welcome home={user ? home : undefined} />} />
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Auth mode="login" onAuth={onAuth} />} />
      <Route path="/signup/:role" element={user ? <Navigate to={home} replace /> : <Auth mode="signup" onAuth={onAuth} />} />
      <Route path="/student" element={shell(<StudentDashboard />, "student")} />
      <Route path="/student/messages" element={shell(<Messages />, "student")} />
      <Route path="/student/messages/:inviteId" element={shell(<Messages />, "student")} />
      <Route path="/student/assessment/:track" element={shell(<Assessment />, "student")} />
      <Route path="/student/practice" element={shell(<PracticeInterview />, "student")} />
      <Route path="/student/interview/:stage" element={shell(<OfficialInterview />, "student")} />
      <Route path="/company/pricing" element={shell(<Pricing onSubscribed={setUser} />, "company", { allowUnsubscribed: true })} />
      <Route path="/company" element={shell(<CompanyDashboard />, "company")} />
      <Route path="/company/messages/:studentId" element={shell(<CompanyMessages />, "company")} />
      <Route path="/company/candidates/:id" element={shell(<CandidateProfile />, "company")} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
