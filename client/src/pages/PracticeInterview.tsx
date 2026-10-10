import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import PreCheck from "../voice/PreCheck";
import QuestionRoom, { type AnswerResult } from "../voice/QuestionRoom";
import type { VoiceCaps } from "../voice/speech";

interface Session { id: number; questions: string[] }

export default function PracticeInterview() {
  const navigate = useNavigate();
  const [caps, setCaps] = useState<VoiceCaps | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<{ question: string; transcript: string; skipped: boolean; inputMode: string }[] | null>(null);
  const [error, setError] = useState("");
  const answers = useRef<AnswerResult[]>([]);

  async function begin(c: VoiceCaps) {
    setCaps(c);
    try {
      setSession(await api<Session>("/student/practice/start", { body: {} }));
    } catch (e) { setError((e as Error).message); }
  }

  async function next(r: AnswerResult) {
    if (!session) return;
    answers.current.push(r);
    if (idx + 1 < session.questions.length) return setIdx(idx + 1);
    try {
      const res = await api<{ responses: any[] }>(`/student/practice/${session.id}/complete`, { body: { responses: answers.current } });
      setDone(res.responses);
    } catch (e) { setError((e as Error).message); }
  }

  if (!caps) {
    return <PreCheck title="Practice session" rules={[
      "3 HR questions and 2 technical questions for your track.",
      "Same voice loop as the official interview: 15 seconds to start, 60 seconds to answer.",
      "Practice sessions are not shown to companies and produce no score.",
    ]} onReady={begin} />;
  }
  if (error) return <><div className="notice error">{error}</div><button onClick={() => navigate("/student")}>Back</button></>;
  if (done) {
    return (
      <div className="card">
        <h1>Practice complete</h1>
        {done.map((d, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <strong>{i + 1}. {d.question}</strong>
            <div className="muted">{d.skipped ? "Skipped" : `${d.inputMode === "typed" ? "Typed" : "Spoken"} answer: ${d.transcript}`}</div>
          </div>
        ))}
        <button onClick={() => navigate("/student")}>Back to dashboard</button>
      </div>
    );
  }
  if (!session) return <p className="muted">Starting practice…</p>;
  return (
    <>
      <h1>Practice session</h1>
      <QuestionRoom
        key={idx}
        question={session.questions[idx]}
        index={idx}
        total={session.questions.length}
        caps={caps}
        repeatsLeft={1}
        onRepeat={async () => true}
        onFinish={next}
      />
    </>
  );
}
