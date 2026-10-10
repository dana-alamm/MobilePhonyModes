import { useEffect, useRef, useState } from "react";
import { getRecognitionCtor, speak, type VoiceCaps } from "./speech";

export interface AnswerResult {
  transcript: string;
  inputMode: "voice" | "typed" | "none";
  skipped: boolean;
  answerSeconds: number;
}

interface Props {
  question: string;
  index: number;
  total: number;
  caps: VoiceCaps;
  repeatsLeft: number;
  /** Asks the server to record a repeat. Resolves true if it was allowed. */
  onRepeat: () => Promise<boolean>;
  onFinish: (r: AnswerResult) => void;
  initiationSeconds?: number;
  answerSeconds?: number;
}

type Phase = "waiting" | "answering" | "finishing";

// One question of the voice loop: read aloud -> 15s to start speaking -> up to 60s answer -> next.
export default function QuestionRoom({
  question, index, total, caps, repeatsLeft: repeatsIn, onRepeat, onFinish,
  initiationSeconds = 15, answerSeconds = 60,
}: Props) {
  const voiceMode = caps.recognition && caps.mic === "granted";
  const [phase, setPhase] = useState<Phase>("waiting");
  const [speaking, setSpeaking] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [initLeft, setInitLeft] = useState(initiationSeconds);
  const [ansLeft, setAnsLeft] = useState(answerSeconds);
  const [transcript, setTranscript] = useState("");
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");
  const [repeatsLeft, setRepeatsLeft] = useState(repeatsIn);
  const [lang, setLang] = useState(caps.lang);
  const langRef = useRef(caps.lang);

  const phaseRef = useRef<Phase>("waiting");
  const finished = useRef(false);
  const speakingRef = useRef(false);
  const transcriptRef = useRef("");
  const baseRef = useRef("");
  const recRef = useRef<any>(null);
  const cancelSpeech = useRef<() => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitStart = useRef(0);
  const speechStart = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  function stopRecognition() {
    const r = recRef.current;
    recRef.current = null;
    if (r) { r.onend = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch { /* already stopped */ } }
  }

  function beginAnswering() {
    if (phaseRef.current !== "waiting") return;
    speechStart.current = Date.now();
    setPhaseBoth("answering");
  }

  function startRecognition() {
    if (!voiceMode || recRef.current || finished.current || speakingRef.current) return;
    const Ctor = getRecognitionCtor();
    const rec = new Ctor();
    rec.lang = langRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const session = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
      const full = `${baseRef.current} ${session}`.trim();
      transcriptRef.current = full;
      setTranscript(full);
      if (full) beginAnswering();
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Microphone access was blocked. Allow the microphone in your browser settings.");
      else if (e.error === "network") setError("Speech recognition lost its network connection. Check your internet connection.");
      else setError(`Speech recognition error: ${e.error}`);
    };
    rec.onend = () => {
      recRef.current = null;
      baseRef.current = transcriptRef.current;
      if (!finished.current && !speakingRef.current && phaseRef.current !== "finishing") setTimeout(startRecognition, 250);
    };
    recRef.current = rec;
    try { rec.start(); } catch { recRef.current = null; }
  }

  function startTimers() {
    if (timerRef.current) return;
    waitStart.current = Date.now();
    setTimerStarted(true);
    timerRef.current = setInterval(() => {
      if (finished.current) return;
      const now = Date.now();
      if (phaseRef.current === "waiting") {
        const left = initiationSeconds - (now - waitStart.current) / 1000;
        setInitLeft(Math.max(0, Math.ceil(left)));
        if (left <= 0) finish("timeout");
      } else if (phaseRef.current === "answering") {
        const left = answerSeconds - (now - speechStart.current) / 1000;
        setAnsLeft(Math.max(0, Math.ceil(left)));
        if (left <= 0) finish("answered");
      }
    }, 200);
  }

  function finish(reason: "answered" | "skip" | "timeout") {
    if (finished.current) return;
    finished.current = true;
    stopRecognition();
    cancelSpeech.current();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhaseBoth("finishing");
    const text = transcriptRef.current.trim();
    const skipped = reason !== "answered" || text === "";
    const seconds = speechStart.current ? Math.min(answerSeconds, Math.round((Date.now() - speechStart.current) / 1000)) : 0;
    const result: AnswerResult = {
      transcript: skipped ? "" : text,
      inputMode: skipped ? "none" : voiceMode ? "voice" : "typed",
      skipped,
      answerSeconds: skipped ? 0 : seconds,
    };
    if (reason === "skip") setBanner("Okay, moving to the next question.");
    else if (reason === "timeout") setBanner(`No answer started within ${initiationSeconds} seconds. Moving to the next question.`);
    else setBanner(text ? "Answer captured. Processing…" : "No speech was detected. Moving on.");
    setTimeout(() => onFinishRef.current(result), reason === "answered" && text ? 400 : 1600);
  }

  useEffect(() => {
    finished.current = false;
    if (caps.synthesis) {
      speakingRef.current = true;
      setSpeaking(true);
      cancelSpeech.current = speak(question, "en-US", () => {
        speakingRef.current = false;
        setSpeaking(false);
        startTimers();
        startRecognition();
      });
    } else {
      startTimers();
      startRecognition();
    }
    return () => {
      finished.current = true;
      stopRecognition();
      cancelSpeech.current();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser speech recognition handles one language at a time, so Arabic + English answers are captured by switching.
  function switchLang(next: string) {
    langRef.current = next;
    setLang(next);
    if (!recRef.current) return;
    stopRecognition();
    baseRef.current = transcriptRef.current;
    if (!speakingRef.current && !finished.current) setTimeout(startRecognition, 250);
  }

  async function repeat() {
    if (repeatsLeft <= 0 || finished.current) return;
    setRepeatsLeft(0); // one repeat per question; the server enforces it too
    let ok = false;
    try { ok = await onRepeat(); } catch { ok = false; }
    if (!ok) { setError("This question can't be repeated again."); return; }
    if (!caps.synthesis) return;
    stopRecognition();
    speakingRef.current = true;
    setSpeaking(true);
    // The response timers keep running while the question is repeated.
    cancelSpeech.current = speak(question, "en-US", () => {
      speakingRef.current = false;
      setSpeaking(false);
      startRecognition();
    });
  }

  const micClass = phase === "finishing" ? "" : speaking ? "speaking" : voiceMode && !error ? "listening" : "off";
  const micLabel = phase === "finishing" ? "Processing"
    : speaking ? "Interviewer speaking"
    : !voiceMode ? "Typed fallback (no microphone)"
    : error ? "Microphone problem"
    : phase === "answering" ? "Recording your answer"
    : "Listening: start speaking";

  return (
    <div className="card active">
      <div className="row between">
        <span className="muted">Question {index + 1} of {total}</span>
        <span className="badge green">{micLabel}</span>
      </div>
      <div className="progress" style={{ marginTop: 10 }}><div style={{ width: `${(index / total) * 100}%` }} /></div>

      <div className="question" aria-live="polite">{question}</div>

      <div className="row" style={{ gap: 20 }}>
        <div className={`mic ${micClass}`} aria-hidden>{voiceMode ? "🎙" : "⌨"}</div>
        <div>
          {phase === "waiting" && timerStarted && <div className={`timer ${initLeft <= 5 ? "low" : ""}`}>{initLeft}s <span className="muted" style={{ fontSize: "0.9rem" }}>to start speaking</span></div>}
          {phase === "waiting" && !timerStarted && <div className="muted">Listen to the question…</div>}
          {phase === "answering" && <div className={`timer ${ansLeft <= 10 ? "low" : ""}`}>{ansLeft}s <span className="muted" style={{ fontSize: "0.9rem" }}>answer time left (max {answerSeconds}s)</span></div>}
          {phase === "finishing" && <div className="muted">{banner}</div>}
        </div>
      </div>

      {!caps.synthesis && <div className="notice warn" style={{ marginTop: 14 }}>Read-aloud isn't supported in this browser. Read the question above.</div>}
      {error && <div className="notice error" style={{ marginTop: 14 }}>{error}</div>}
      {phase === "finishing" && banner && <div className="notice" style={{ marginTop: 14 }}>{banner}</div>}

      {voiceMode ? (
        <>
          <div className="row between" style={{ marginTop: 16 }}>
            <label style={{ margin: 0 }}>Live transcript from browser speech recognition (not an audio recording)</label>
            <select aria-label="Speaking language" value={lang} onChange={(e) => switchLang(e.target.value)} style={{ width: "auto" }} disabled={phase === "finishing"}>
              <option value="en-US">Speaking: English</option>
              <option value="ar-JO">Speaking: العربية</option>
            </select>
          </div>
          <p className="fine" style={{ margin: "6px 0" }}>Mixing Arabic and English? Switch the language above when you change language. Everything you say is added to the same answer.</p>
          <div className="transcript" dir="auto" aria-live="polite">{transcript || <span className="muted">Waiting for you to speak…</span>}</div>
        </>
      ) : (
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="typed">TYPED FALLBACK (not a spoken answer)</label>
          <textarea id="typed" rows={4} dir="auto" placeholder="You can type in Arabic, English, or both." value={transcript} disabled={phase === "finishing"} onChange={(e) => {
            transcriptRef.current = e.target.value;
            setTranscript(e.target.value);
            if (e.target.value.trim()) beginAnswering();
          }} />
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost" disabled={repeatsLeft <= 0 || phase === "finishing" || speaking} onClick={repeat}>
          Repeat question ({repeatsLeft} left)
        </button>
        <button className="ghost" disabled={phase === "finishing"} onClick={() => finish("skip")}>Skip question</button>
        <button disabled={phase === "finishing" || transcript.trim() === ""} onClick={() => finish("answered")}>
          {voiceMode ? "Done answering" : "Submit typed answer"}
        </button>
      </div>
    </div>
  );
}
