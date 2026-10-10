import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";

interface Iv { status: string; score: number | null; summary: string | null; feedbackType: string | null; evalStatus: string | null }

export default function CandidateProfile() {
  const id = useParams().id;
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api<{ candidate: any; inviteMessage: string }>(`/company/candidates/${id}`).then((r) => { setC(r.candidate); setMessage(r.inviteMessage); }).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="notice error">{error}</div>;
  if (!c) return <p className="muted">Loading…</p>;

  async function send() {
    setSending(true);
    try {
      await api(`/company/candidates/${id}/invite`, { body: {} });
      setC((x: any) => ({ ...x, invited: true }));
      setOpen(false);
      toast("Invitation sent successfully to the candidate.");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally { setSending(false); }
  }

  const block = (title: string, iv: Iv | null) => (
    <div className="card">
      <h2>{title}</h2>
      {!iv ? <p className="muted">Not taken yet.</p> : (
        <>
          <p><span className="badge">{iv.status.replace("_", " ")}</span> {iv.score !== null && <span className="accent">Score {iv.score}/10</span>}</p>
          {iv.evalStatus === "failed" || iv.evalStatus === "pending"
            ? <p className="muted">AI evaluation is not available for this interview yet.</p>
            : <p>{iv.summary ?? "No summary available."}</p>}
          <p className="muted">{iv.feedbackType?.startsWith("ai_") ? "AI-generated evaluation (OpenAI (GPT-4o-mini)) of the candidate's answers." : iv.feedbackType === "sample" ? "Sample data for demonstration." : ""}</p>
        </>
      )}
    </div>
  );

  return (
    <>
      <p><Link to="/company">← Back to candidates</Link></p>
      <div className="row between">
        <h1>{c.name} {c.isSample && <span className="badge yellow">Sample profile</span>}</h1>
        {c.invited
          ? <button disabled>Invite Sent</button>
          : <button onClick={() => setOpen(true)}>Send Interview Invite</button>}
      </div>
      {open && (
        <Modal title="Send interview invite" onClose={() => !sending && setOpen(false)}>
          <label htmlFor="msg">Message to {c.name}</label>
          <textarea id="msg" readOnly value={message} dir="auto" />
          <p className="fine">Demo feature: the invite is saved to the candidate's dashboard. No email or live chat is sent.</p>
          <div className="row">
            <button disabled={sending} onClick={send}>{sending ? "Sending…" : "Send Message"}</button>
            <button className="ghost" disabled={sending} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
      <div className="card">
        <dl className="kv">
          <dt>Official skill</dt><dd>{c.officialTrack}</dd>
          <dt>Assessment score</dt><dd className="accent">{c.assessmentScore}/10</dd>
          <dt>All assessments</dt><dd>{c.assessments.map((a: any) => `${a.track}: ${a.score}/10`).join(" · ")}</dd>
        </dl>
      </div>
      {block("HR interview", c.hr)}
      {block(`Technical interview (${c.officialTrack})`, c.tech)}
    </>
  );
}
