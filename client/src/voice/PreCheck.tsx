import { useState } from "react";
import { detectCaps, type VoiceCaps } from "./speech";

export default function PreCheck({ title, rules, notice, onReady }: { title: string; rules: string[]; notice?: string; onReady: (caps: VoiceCaps) => void }) {
  const [lang, setLang] = useState("en-US");
  const [caps, setCaps] = useState<VoiceCaps | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setCaps(await detectCaps(lang === "mixed" ? "ar-JO" : lang));
    setBusy(false);
  }

  const voiceOk = caps && caps.recognition && caps.mic === "granted";

  return (
    <div className="card active">
      <h1>{title}</h1>
      <ul>{rules.map((r) => <li key={r}>{r}</li>)}</ul>
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="lang">Speaking language</label>
        <select id="lang" value={lang} onChange={(e) => { setLang(e.target.value); setCaps(null); }}>
          <option value="en-US">English</option>
          <option value="ar-JO">Arabic (العربية)</option>
          <option value="mixed">Arabic + English (switch while answering)</option>
        </select>
        <p className="fine" style={{ marginTop: 6 }}>Browser speech recognition understands one language at a time, and accuracy varies by browser and accent. For mixed answers, use the language switch in the room, or type in Arabic and English together.</p>
      </div>
      {notice && <div className="notice warn">{notice}</div>}
      {!caps && <button disabled={busy} onClick={check}>{busy ? "Checking…" : "Check microphone & voice support"}</button>}
      {caps && (
        <>
          <dl className="kv" style={{ marginBottom: 14 }}>
            <dt>Microphone</dt><dd>{caps.mic === "granted" ? <span className="accent">allowed</span> : caps.mic === "denied" ? <span style={{ color: "var(--danger)" }}>permission denied</span> : <span style={{ color: "var(--danger)" }}>not available</span>}</dd>
            <dt>Speech recognition</dt><dd>{caps.recognition ? <span className="accent">supported</span> : <span style={{ color: "var(--danger)" }}>not supported in this browser</span>}</dd>
            <dt>Read-aloud (speech)</dt><dd>{caps.synthesis ? <span className="accent">supported</span> : <span style={{ color: "var(--warn)" }}>not supported (questions shown as text only)</span>}</dd>
          </dl>
          {!voiceOk && (
            <div className="notice warn">
              Voice answers can't be captured here{caps.mic === "denied" ? " because microphone permission was denied. Allow the microphone in your browser's site settings and re-check." : caps.recognition ? "." : ". Use a Chromium-based browser such as Chrome or Edge for spoken answers."}
              {" "}You can continue with a clearly labeled <strong>typed fallback</strong>. Typed answers are stored as typed, never as spoken.
            </div>
          )}
          <div className="row">
            <button onClick={() => onReady(caps)}>{voiceOk ? "Enter voice room" : "Continue with typed fallback"}</button>
            <button className="ghost" onClick={check}>Re-check</button>
          </div>
        </>
      )}
    </div>
  );
}
