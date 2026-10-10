import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export interface Msg { id: number; sender: "company" | "student"; body: string; createdAt: string }

// Shared chat window. `path` serves GET (thread) and POST (send). Refreshes every 5 seconds; no WebSockets.
export default function Chat({ path, me, subtitle, onLoaded }: {
  path: string; me: "company" | "student"; subtitle: string; onLoaded?: () => void;
}) {
  const [name, setName] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  useEffect(() => {
    let alive = true;
    const load = () => api<{ name?: string; company?: string; messages: Msg[] }>(path)
      .then((r) => {
        if (!alive) return;
        setName(r.name ?? r.company ?? "");
        setMsgs((cur) => (r.messages.length === cur.length && r.messages.at(-1)?.id === cur.at(-1)?.id ? cur : r.messages));
        onLoaded?.();
      })
      .catch((e) => alive && setError(e.message));
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [path]);

  useEffect(() => {
    const last = msgs.at(-1)?.id ?? 0;
    if (last !== lastId.current) { lastId.current = last; endRef.current?.scrollIntoView({ block: "end" }); }
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      const r = await api<{ message: Msg }>(path, { method: "POST", body: { body } });
      setMsgs((m) => (m.some((x) => x.id === r.message.id) ? m : [...m, r.message]));
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const display = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
  const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <section className="chat">
      <div className="chat-head">
        <span className="avatar">{display.charAt(0) || "?"}</span>
        <div><strong>{display}</strong><div className="muted small-text">{subtitle}</div></div>
      </div>
      <div className="chat-body">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble-row ${m.sender === me ? "mine" : "theirs"}`}>
            <div className="bubble">
              <p>{m.body}</p>
              <span className="bubble-time">{m.sender === me ? "You" : display} · {time(m.createdAt)}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="notice error">{error}</div>}
      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" maxLength={1000} aria-label="Message" />
        <button type="submit" disabled={!text.trim() || sending}>Send</button>
      </form>
    </section>
  );
}
