import { useState } from "react";

// Demo-only: the badge and message are static to simulate a received company invite.
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  return (
    <span className="bell-wrap">
      <button className="bell" aria-label={`Notifications, ${count} unread (demo)`} onClick={() => { setOpen((o) => !o); setCount(0); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && <span className="bell-badge">{count}</span>}
      </button>
      {open && (
        <div className="bell-menu" role="status">
          <strong>Interview invite</strong>
          <p className="muted">A company invited you to an interview. (Demo notification)</p>
        </div>
      )}
    </span>
  );
}
