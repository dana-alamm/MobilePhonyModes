import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

interface Invite { id: number; company: string; createdAt: string }
const KEY = "seenInvites";
const seen = (): number[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
export function markInviteSeen(id: number) {
  const s = seen();
  if (!s.includes(id)) localStorage.setItem(KEY, JSON.stringify([...s, id]));
  window.dispatchEvent(new Event("invites-seen"));
}
export const displayName = (n: string) => (n ? n.charAt(0).toUpperCase() + n.slice(1) : n);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Invite[]>([]);
  const [, bump] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => { api<{ invites: Invite[] }>("/student/invites").then((r) => setList(r.invites)).catch(() => {}); }, [location.pathname]);
  useEffect(() => {
    const h = () => bump((n) => n + 1);
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("invites-seen", h);
    document.addEventListener("mousedown", out);
    return () => { window.removeEventListener("invites-seen", h); document.removeEventListener("mousedown", out); };
  }, []);

  const unread = list.filter((i) => !seen().includes(i.id)).length;
  return (
    <span className="bell-wrap" ref={ref}>
      <button className="bell" aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>
      {open && (
        <div className="bell-menu">
          {list.length === 0 && <p className="muted">No notifications yet.</p>}
          {list.map((i) => (
            <button key={i.id} className="bell-item" onClick={() => { setOpen(false); markInviteSeen(i.id); navigate(`/student/messages/${i.id}`); }}>
              <strong>{displayName(i.company)} invited you to a formal interview.</strong>
              <span className="muted">{new Date(i.createdAt).toLocaleDateString()}{seen().includes(i.id) ? "" : " · New"}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
