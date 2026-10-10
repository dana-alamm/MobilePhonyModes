import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

interface Started {
  track: string;
  deadlineAt: string;
  serverNow: string;
  questions: { q: string; options: string[] }[];
}

export default function Assessment() {
  const track = decodeURIComponent(useParams().track ?? "");
  const navigate = useNavigate();
  const [data, setData] = useState<Started | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; late: boolean } | null>(null);
  const submitting = useRef(false);
  const offset = useRef(0);

  useEffect(() => {
    api<Started>(`/student/assessments/${encodeURIComponent(track)}/start`, { body: {} })
      .then((d) => {
        offset.current = Date.now() - new Date(d.serverNow).getTime();
        setData(d);
        setAnswers(new Array(d.questions.length).fill(-1));
      })
      .catch((e) => setError(e.message));
  }, [track]);

  async function submit(final: number[]) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      setResult(await api(`/student/assessments/${encodeURIComponent(track)}/submit`, { body: { answers: final } }));
    } catch (e) {
      setError((e as Error).message);
      submitting.current = false;
    }
  }

  useEffect(() => {
    if (!data || result) return;
    const deadline = new Date(data.deadlineAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - (Date.now() - offset.current)) / 1000));
      setLeft(remaining);
      if (remaining === 0) submit(answers);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [data, result, answers]);

  if (error && !data) return <><div className="notice error">{error}</div><button onClick={() => navigate("/student")}>Back</button></>;
  if (!data) return <p className="muted">Loading assessment…</p>;

  if (result) {
    return (
      <div className="card">
        <h1>{track}: result</h1>
        <div className={`score ${result.passed ? "" : "fail"}`}>{result.score}/{result.total}</div>
        <p>{result.passed ? "You passed (5/10 needed)." : "Below the 5/10 pass mark."}{result.late ? " (Submitted after the time limit, so it was not scored.)" : ""}</p>
        <button onClick={() => navigate("/student")}>Back to dashboard</button>
      </div>
    );
  }

  const q = data.questions[idx];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const answeredCount = answers.filter((a) => a >= 0).length;

  return (
    <>
      <div className="row between">
        <h1>{track} assessment</h1>
        <div className={`timer ${left < 60 ? "low" : ""}`} aria-label="Time remaining">{mm}:{ss}</div>
      </div>
      <div className="progress" aria-hidden><div style={{ width: `${((idx + 1) / data.questions.length) * 100}%` }} /></div>
      <p className="muted" style={{ marginTop: 8 }}>Question {idx + 1} of {data.questions.length} · {answeredCount} answered · text only, no microphone needed</p>
      <div className="card">
        <h2>{q.q}</h2>
        {q.options.map((o, i) => (
          <button key={i} className={`choice ${answers[idx] === i ? "selected" : ""}`} onClick={() => setAnswers((a) => a.map((v, k) => (k === idx ? i : v)))}>
            {String.fromCharCode(65 + i)}. {o}
          </button>
        ))}
      </div>
      {error && <div className="notice error">{error}</div>}
      <div className="row between">
        <button className="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
        {idx < data.questions.length - 1
          ? <button onClick={() => setIdx(idx + 1)}>Next</button>
          : <button onClick={() => { if (answeredCount < data.questions.length && !confirm(`${data.questions.length - answeredCount} question(s) unanswered. Submit anyway?`)) return; submit(answers); }}>Submit assessment</button>}
      </div>
    </>
  );
}
