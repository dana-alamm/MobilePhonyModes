import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import PreCheck from "../voice/PreCheck";
import QuestionRoom, { type AnswerResult } from "../voice/QuestionRoom";
import type { VoiceCaps } from "../voice/speech";

interface IState {
  id: number;
  stage: string;
  status: string;
  total: number;
  currentIdx: number;
  question: string | null;
  repeatCount?: number;
  maxRepeats?: number;
  deadlineAt: string;
  serverNow: string;
  score?: number | null;
  summary?: string | null;
  evalStatus?: string | null;
  evalError?: string | null;
}

export default function OfficialInterview() {
  const stage = useParams().stage ?? "hr";
  const navigate = useNavigate();
  const [caps, setCaps] = useState<VoiceCaps | null>(null);
  const [state, setState] = useState<IState | null>(null);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const offset = useRef(0);
  const label = stage === "hr" ? "HR" : "Technical";
  const minutes = stage === "hr" ? 10 : 15;

  function apply(s: IState) {
    offset.current = Date.now() - new Date(s.serverNow).getTime();
    setState(s);
  }

  async function begin(c: VoiceCaps) {
    setCaps(c);
    try {
      apply(await api<IState>(`/interviews/${stage}/start`, { body: {} }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!state || state.status !== "in_progress") return;
    const deadline = new Date(state.deadlineAt).getTime();
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((deadline - (Date.now() - offset.current)) / 1000));
      setLeft(r);
      if (r === 0) {
        clearInterval(t);
        api<IState>(`/interviews/${state.id}`).then(apply).catch((e) => setError(e.message));
      }
    }, 500);
    return () => clearInterval(t);
  }, [state?.id, state?.status]);

  const [retrying, setRetrying] = useState(false);
  async function retryEval() {
    if (!state) return;
    setRetrying(true);
    setError("");
    try { apply(await api<IState>(`/interviews/${state.id}/evaluate`, { body: {} })); }
    catch (e) { setError((e as Error).message); }
    finally { setRetrying(false); }
  }

  // Poll while another request is still producing the evaluation.
  useEffect(() => {
    if (!state || state.status === "in_progress" || state.evalStatus !== "pending") return;
    const t = setTimeout(() => api<IState>(`/interviews/${state.id}`).then(apply).catch((e) => setError(e.message)), 2000);
    return () => clearTimeout(t);
  }, [state]);

  async function onFinish(r: AnswerResult) {
    if (!state) return;
    try {
      apply(await api<IState>(`/interviews/${state.id}/answer`, { body: { idx: state.currentIdx, ...r } }));
    } catch (e) {
      if (e instanceof ApiError && e.data?.state) apply(e.data.state);
      setError((e as Error).message);
    }
  }

  async function onRepeat() {
    if (!state) return false;
    try {
      await api(`/interviews/${state.id}/repeat`, { body: {} });
      return true;
    } catch {
      return false;
    }
  }

  if (!caps) {
    return (
      <PreCheck
        title={`${label} interview (official, one attempt)`}
        rules={[
          "Each question is read aloud, then you have 15 seconds to begin speaking.",
          "You can speak for up to 60 seconds per question; the mic then cuts off and moves on.",
          "Each question can be repeated once. Skipping moves straight to the next question.",
          `The ${label} interview has a strict ${minutes}-minute total limit enforced by the server. Refreshing does not reset it.`,
          "Your words are transcribed by your browser's speech recognition. No audio is recorded or stored.",
        ]}
        notice="After the interview, the text of your answers (spoken transcript or typed text, with the questions) is sent to OpenAI (GPT-4o-mini) to produce your score and feedback. Your name, email and audio are not sent. OpenAI processing may be subject to its own data terms."
        onReady={begin}
      />
    );
  }
  if (error && !state) return <><div className="notice error">{error}</div><button onClick={() => navigate("/student")}>Back</button></>;
  if (!state) return <p className="muted">Starting interview…</p>;

  if (state.status !== "in_progress") {
    const ev = state.evalStatus;
    return (
      <div className="card">
        <h1>{label} interview {state.status === "expired" ? "ended (time limit reached)" : "complete"}</h1>
        {error && <div className="notice warn">{error}</div>}
        {ev === "pending" && <p className="muted">Your answers are being evaluated by AI. This usually takes a few seconds…</p>}
        {ev === "failed" && (
          <>
            <div className="notice error">The AI evaluation could not be completed: {state.evalError ?? "unknown error"}. Your answers are saved, so you can try again.</div>
            <button disabled={retrying} onClick={retryEval}>{retrying ? "Evaluating…" : "Retry evaluation"}</button>{" "}
          </>
        )}
        {(ev === "done" || ev === "none") && (
          <>
            <div className="score">{state.score ?? 0}/10</div>
            <p>{state.summary}</p>
            <p className="muted">{ev === "done" ? "AI evaluation by OpenAI GPT-4o-mini of your answer text, scoring accuracy and communication." : "No evaluation was produced."} Companies see this score and summary, never your transcripts.</p>
          </>
        )}
        <button className={ev === "failed" ? "ghost" : ""} onClick={() => navigate("/student")}>Back to dashboard</button>
      </div>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <>
      <div className="row between">
        <h1>{label} interview</h1>
        <div className={`timer ${left < 60 ? "low" : ""}`} aria-label="Total time remaining">{mm}:{ss} <span className="muted" style={{ fontSize: "0.8rem" }}>total left</span></div>
      </div>
      {error && <div className="notice warn">{error}</div>}
      {state.question && (
        <QuestionRoom
          key={`${state.id}-${state.currentIdx}`}
          question={state.question}
          index={state.currentIdx}
          total={state.total}
          caps={caps}
          repeatsLeft={Math.max(0, (state.maxRepeats ?? 1) - (state.repeatCount ?? 0))}
          onRepeat={onRepeat}
          onFinish={onFinish}
        />
      )}
    </>
  );
}
