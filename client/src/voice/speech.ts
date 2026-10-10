export type MicStatus = "granted" | "denied" | "unavailable";

export interface VoiceCaps {
  recognition: boolean;
  synthesis: boolean;
  mic: MicStatus;
  lang: string;
}

export function getRecognitionCtor(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export async function detectCaps(lang: string): Promise<VoiceCaps> {
  const recognition = !!getRecognitionCtor();
  const synthesis = "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  let mic: MicStatus = "unavailable";
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      mic = "granted";
    } catch (e) {
      mic = (e as DOMException).name === "NotAllowedError" ? "denied" : "unavailable";
    }
  }
  return { recognition, synthesis, mic, lang };
}

export function speak(text: string, lang: string, onEnd: () => void): () => void {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  let done = false;
  const finish = () => { if (!done) { done = true; onEnd(); } };
  u.onend = finish;
  u.onerror = finish;
  // Some browsers never fire onend; fall back to an estimate so the interview cannot stall.
  const fallback = setTimeout(finish, Math.max(4000, text.length * 90));
  window.speechSynthesis.speak(u);
  return () => { done = true; clearTimeout(fallback); window.speechSynthesis.cancel(); };
}
