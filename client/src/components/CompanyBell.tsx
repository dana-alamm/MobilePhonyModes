import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

interface Note { id: number; body: string; createdAt: string; studentId: number; student: string }
const KEY = "seenCandidateReplies";
const seen = (): number[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

// Lists candidate replies to this company's interview invites (real data from the messages table).
export default function CompanyBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Note[]>([]);
  const [, bump] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const load = () => api<{ notifications: Note[] }>("/company/notifications").then((r) => setList(r.notifications)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [location.pathname]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  const unread = list.filter((n) => !seen().includes(n.id)).length;
  function markAllSeen() {
    localStorage.setItem(KEY, JSON.stringify([...new Set([...seen(), ...list.map((n) => n.id)])]));
    bump((n) => n + 1);
  }
  const preview = (t: string) => (t.length > 70 ? `${t.slice(0, 70)}…` : t);

  return (
    <span className="bell-wrap" ref={ref}>
      <button className="bell" aria-label={`Notifications, ${unread} unread`} onClick={() => { setOpen((o) => !o); if (!open) markAllSeen(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>
      {open && (
        <div className="bell-menu">
          {list.length === 0 && <p className="muted">No replies from candidates yet.</p>}
          {list.map((n) => (
            <button key={n.id} className="bell-item" onClick={() => { setOpen(false); navigate(`/company/candidates/${n.studentId}`); }}>
              <strong>{n.student} replied to your invite</strong>
              <span>{preview(n.body)}</span>
              <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
