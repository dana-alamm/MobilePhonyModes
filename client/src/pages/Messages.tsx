import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { markInviteSeen, displayName } from "../components/NotificationBell";

interface Msg { id: number; sender: "company" | "student"; body: string; createdAt: string }

export default function Messages() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inviteId) {
      api<{ invites: { id: number }[] }>("/student/invites").then((r) => {
        if (r.invites[0]) navigate(`/student/messages/${r.invites[0].id}`, { replace: true });
        else setError("You have no messages yet.");
      }).catch((e) => setError(e.message));
      return;
    }
    api<{ company: string; messages: Msg[] }>(`/student/invites/${inviteId}/messages`)
      .then((r) => { setCompany(r.company); setMsgs(r.messages); markInviteSeen(Number(inviteId)); })
      .catch((e) => setError(e.message));
  }, [inviteId, navigate]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      const r = await api<{ message: Msg }>(`/student/invites/${inviteId}/messages`, { method: "POST", body: { body } });
      setMsgs((m) => [...m, r.message]);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!inviteId) return <p className="muted">{error || "Loading…"}</p>;
  const name = displayName(company);
  const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <section className="chat">
      <div className="chat-head">
        <span className="avatar">{name.charAt(0)}</span>
        <div><strong>{name}</strong><div className="muted small-text">Formal interview invitation</div></div>
      </div>
      <div className="chat-body">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble-row ${m.sender}`}>
            <div className="bubble">
              <p>{m.body}</p>
              <span className="bubble-time">{m.sender === "company" ? name : "You"} · {time(m.createdAt)}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="notice error">{error}</div>}
      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your reply…" maxLength={1000} aria-label="Reply" />
        <button type="submit" disabled={!text.trim() || sending}>Send</button>
      </form>
    </section>
  );
}
