import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

interface Iv { status: string; score: number | null; summary: string | null }

export default function CandidateProfile() {
  const id = useParams().id;
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ candidate: any }>(`/company/candidates/${id}`).then((r) => setC(r.candidate)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="notice error">{error}</div>;
  if (!c) return <p className="muted">Loading…</p>;

  const block = (title: string, iv: Iv | null) => (
    <div className="card">
      <h2>{title}</h2>
      {!iv ? <p className="muted">Not taken yet.</p> : (
        <>
          <p><span className="badge">{iv.status.replace("_", " ")}</span> {iv.score !== null && <span className="accent">Score {iv.score}/10</span>}</p>
          <p>{iv.summary ?? "No summary available."}</p>
          <p className="muted">Rule-based summary from word counts and keyword matching. Not AI analysis.</p>
        </>
      )}
    </div>
  );

  return (
    <>
      <p><Link to="/company">← Back to candidates</Link></p>
      <h1>{c.name} {c.isSample && <span className="badge yellow">Sample profile</span>}</h1>
      <div className="card">
        <dl className="kv">
          <dt>Official track</dt><dd>{c.officialTrack}</dd>
          <dt>Assessment score</dt><dd className="accent">{c.assessmentScore}/10</dd>
          <dt>All assessments</dt><dd>{c.assessments.map((a: any) => `${a.track}: ${a.score}/10`).join(" · ")}</dd>
        </dl>
      </div>
      {block("HR interview", c.hr)}
      {block(`Technical interview (${c.officialTrack})`, c.tech)}
    </>
  );
}
