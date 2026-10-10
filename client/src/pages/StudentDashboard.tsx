import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import SkillCombobox from "../components/SkillCombobox";

interface State {
  selectedTracks: string[];
  reviewConfirmed: boolean;
  invites: { id: number; company: string; createdAt: string }[];
  assessments: { track: string; status: string; score: number | null; passed: boolean | null; attempts: number; questionSet: string; canRetake: boolean }[];
  allAssessmentsDone: boolean;
  officialTrack: string | null;
  officialScore: number | null;
  passed: boolean;
  passMark: number;
  recommendations: { title: string; topics: string[]; url: string }[];
  practice: { used: number; allowed: number; remaining: number; priceJod: number; freeLimit: number };
  official: { stage: "hr" | "tech"; status: string; score: number | null; summary: string | null; evalStatus: string | null }[];
}

const statusBadge = (s: string) =>
  s === "completed" ? <span className="badge green">completed</span>
  : s === "expired" ? <span className="badge yellow">time limit reached</span>
  : s === "in_progress" ? <span className="badge yellow">in progress</span>
  : <span className="badge">not started</span>;

export default function StudentDashboard() {
  const [s, setS] = useState<State | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [payKey, setPayKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const st = await api<State>("/student/state");
    setS(st);
    setPicked(st.selectedTracks);
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  if (!s) return <p className="muted">{error || "Loading…"}</p>;

  const started = s.assessments.some((a) => a.status !== "not_started");
  const rolesLocked = started;
  const failed = s.allAssessmentsDone && !s.passed;
  const anyRetakeable = s.assessments.some((a) => a.canRetake);

  async function confirmReview(checked: boolean) {
    if (!checked) return;
    setError("");
    try { await api("/student/review-confirm", { body: {} }); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function retake(track: string) {
    setError("");
    setBusy(true);
    try {
      await api(`/student/assessments/${encodeURIComponent(track)}/retake`, { body: {} });
      navigate(`/student/assessment/${encodeURIComponent(track)}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  async function saveRoles() {
    setError("");
    setBusy(true);
    try {
      await api("/student/tracks", { method: "PUT", body: { tracks: picked } });
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function pay() {
    setBusy(true);
    setPayMsg("");
    try {
      const r = await api<{ message: string }>("/student/payments/mock", { body: { idempotencyKey: payKey } });
      setPayMsg(r.message);
      setPayKey(crypto.randomUUID());
      await load();
    } catch (e) { setPayMsg((e as Error).message); } finally { setBusy(false); }
  }

  const hr = s.official.find((o) => o.stage === "hr")!;
  const tech = s.official.find((o) => o.stage === "tech")!;
  const hrDone = hr.status !== "not_started" && hr.status !== "in_progress";
  const unlocked = s.allAssessmentsDone && s.passed;

  return (
    <>
      <h1>Your journey</h1>
      {error && <div className="notice error">{error}</div>}

      <section className={`card ${!rolesLocked ? "active" : ""}`}>
        <h2><span className="step">01</span>Choose your specialization (1 or 2)</h2>
        <SkillCombobox selected={picked} onChange={setPicked} disabled={rolesLocked} />
        <p className="muted" style={{ margin: "12px 0" }}>
          {rolesLocked ? "Skills are locked once you start an assessment." : "You can only choose skills from the list. The assessment and interviews score you honestly, and companies see those scores."}
        </p>
        {!rolesLocked && (
          <button disabled={busy || picked.length === 0 || JSON.stringify(picked) === JSON.stringify(s.selectedTracks)} onClick={saveRoles}>Save specialization</button>
        )}
      </section>

      <section className={`card ${s.selectedTracks.length && !s.allAssessmentsDone ? "active" : ""} ${!s.selectedTracks.length ? "locked" : ""}`}>
        <h2><span className="step">02</span>Assessments (text only, 10 questions, 15 min each)</h2>
        {!s.selectedTracks.length && <p className="muted">Save your specialization first.</p>}
        {s.assessments.map((a) => (
          <div key={a.track} className="row between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <strong>{a.track}</strong> {statusBadge(a.status)} {a.attempts > 1 && <span className="badge">attempt {a.attempts}</span>}
              {a.score !== null && <span style={{ marginLeft: 10 }} className={a.passed ? "accent" : ""}>{a.score}/10</span>}
            </div>
            {a.canRetake && (
              <button className="small" disabled={busy} onClick={() => retake(a.track)}>Retake Assessment</button>
            )}
            {a.status !== "completed" && (
              <button className="small" onClick={() => navigate(`/student/assessment/${encodeURIComponent(a.track)}`)}>
                {a.status === "in_progress" ? "Resume" : "Start"}
              </button>
            )}
          </div>
        ))}
        {s.allAssessmentsDone && (
          <div style={{ marginTop: 16 }}>
            <p className="muted">Pass mark: {s.passMark}/10. The higher score becomes your official skill (ties go to the one you listed first).</p>
            <div className={`score ${s.passed ? "" : "fail"}`}>{s.officialScore}/10 · {s.officialTrack}</div>
            {s.passed ? (
              <p className="accent">Passed. Practice and official interviews are unlocked.</p>
            ) : (
              <>
                <div className="notice error">
                  You scored below {s.passMark}/10, so interviews stay locked for now. This is only a snapshot of today's knowledge. Review these areas and keep building your skills.
                </div>
                <h3>Suggested learning (links to Udemy topic pages; nothing is purchased or unlocked here)</h3>
                {s.recommendations.map((r) => (
                  <div key={r.title} style={{ marginBottom: 10 }}>
                    <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                    <div className="muted">Review: {r.topics.join(" · ")}</div>
                  </div>
                ))}
                <label className="check">
                  <input type="checkbox" checked={s.reviewConfirmed} disabled={s.reviewConfirmed} onChange={(e) => confirmReview(e.target.checked)} />
                  I confirm I have reviewed the recommended materials.
                </label>
                {s.reviewConfirmed && anyRetakeable && <p className="accent">Thanks. Use the Retake Assessment button above to try again. You need {s.passMark}/10 or more to unlock the voice interview.</p>}
                <p className="fine">The retake button appears after you confirm. Voice interviews stay locked until you pass.</p>
              </>
            )}
          </div>
        )}
      </section>

      <section className={`card ${unlocked ? "active" : "locked"}`}>
        <h2><span className="step">03</span>Practice interviews (voice)</h2>
        {!unlocked ? <p className="muted">Pass your assessment (5/10 or more) to unlock.</p> : (
          <>
            <p>Each practice session = 3 HR + 2 technical questions, answered by voice. Free sessions used: {Math.min(s.practice.used, s.practice.freeLimit)}/{s.practice.freeLimit}. Sessions remaining: <strong className="accent">{s.practice.remaining}</strong>.</p>
            <div className="row">
              <button disabled={s.practice.remaining <= 0} onClick={() => navigate("/student/practice")}>Start practice session</button>
              {s.practice.remaining <= 0 && <button className="ghost" onClick={() => { setPayOpen(true); setPayMsg(""); }}>Unlock one more · {s.practice.priceJod} JOD</button>}
            </div>
            {payOpen && s.practice.remaining <= 0 && (
              <div className="notice warn" style={{ marginTop: 14 }}>
                <strong>SIMULATED PAYMENT.</strong> No real card or money is involved. Confirming records a demo transaction and unlocks exactly one practice session.
                <div className="row" style={{ marginTop: 10 }}>
                  <button disabled={busy} onClick={pay}>Pay {s.practice.priceJod} JOD (demo)</button>
                  <button className="ghost" onClick={() => setPayOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
            {payMsg && <div className={`notice ${payMsg.startsWith("Payment") ? "" : "error"}`} style={{ marginTop: 14 }}>{payMsg}</div>}
          </>
        )}
      </section>

      <section className={`card ${unlocked ? "active" : "locked"}`}>
        <h2><span className="step">04</span>Official voice interviews (one attempt each)</h2>
        {!unlocked ? <p className="muted">Unlocks after you pass the assessment.</p> : (
          <>
            <div className="notice">
              Voice is required. Your answers can be in Arabic, English or both. After the interview, the text of your answers is sent to OpenAI (GPT-4o-mini) for scoring and feedback; no audio or personal details are sent. Each question is read aloud; you have <strong>15 seconds</strong> to start speaking and <strong>60 seconds</strong> to answer. Each question can be repeated once. The HR interview has a strict <strong>10-minute</strong> total limit that does not reset if you refresh.
            </div>
            {[{ o: hr, label: "HR interview", locked: false }, { o: tech, label: `Technical interview (${s.officialTrack})`, locked: !hrDone }].map(({ o, label, locked }) => (
              <div key={o.stage} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="row between">
                  <div><strong>{label}</strong> {statusBadge(o.status)} {o.score !== null && <span className="accent">{o.score}/10</span>}</div>
                  {(o.status === "not_started" || o.status === "in_progress") && (
                    <button className="small" disabled={locked} onClick={() => navigate(`/student/interview/${o.stage}`)}>
                      {o.status === "in_progress" ? "Resume" : "Begin"}
                    </button>
                  )}
                </div>
                {locked && <div className="muted">Finish the HR interview first.</div>}
                {o.evalStatus === "failed" && <div className="notice error" style={{ marginTop: 8 }}>The AI evaluation did not finish. <a href={`/student/interview/${o.stage}`} onClick={(e) => { e.preventDefault(); navigate(`/student/interview/${o.stage}`); }}>Open the result page to retry.</a></div>}
                {o.summary && <p style={{ marginTop: 8 }}>{o.summary}</p>}
              </div>
            ))}
          </>
        )}
      </section>

      {s.invites.length > 0 && (
        <section className="card active">
          <h2>Interview invitations</h2>
          {s.invites.map((i) => (
            <p key={i.id}><strong>{i.company}</strong> invited you to a formal interview <span className="muted">({new Date(i.createdAt).toLocaleDateString()})</span></p>
          ))}
        </section>
      )}

      {unlocked && (
        <section className="card">
          <h2><span className="step">05</span>Your profile</h2>
          <dl className="kv">
            <dt>Official skill</dt><dd>{s.officialTrack}</dd>
            <dt>Assessment</dt><dd>{s.assessments.map((a) => `${a.track}: ${a.score}/10`).join(" · ")}</dd>
            <dt>HR interview</dt><dd>{hr.status}{hr.score !== null ? ` · ${hr.score}/10` : ""}</dd>
            <dt>Technical interview</dt><dd>{tech.status}{tech.score !== null ? ` · ${tech.score}/10` : ""}</dd>
            <dt>Visible to companies</dt><dd>Yes: your name, track, scores and interview summaries (not transcripts).</dd>
          </dl>
        </section>
      )}
    </>
  );
}
