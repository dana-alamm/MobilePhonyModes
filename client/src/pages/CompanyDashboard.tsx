import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface Cand {
  id: number; name: string; isSample: boolean; officialTrack: string; assessmentScore: number;
  hrStatus: string; techStatus: string; techScore: number | null;
}

export default function CompanyDashboard() {
  const [groups, setGroups] = useState<{ group: string; skills: string[] }[]>([]);
  const [list, setList] = useState<Cand[] | null>(null);
  const [track, setTrack] = useState("");
  const [minScore, setMinScore] = useState(5);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score_desc");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const p = new URLSearchParams({ track, minScore: String(minScore), q, sort });
    api<{ skillGroups: { group: string; skills: string[] }[]; candidates: Cand[] }>(`/company/candidates?${p}`)
      .then((r) => { setGroups(r.skillGroups); setList(r.candidates); })
      .catch((e) => setError(e.message));
  }, [track, minScore, q, sort]);

  return (
    <>
      <h1>Candidates</h1>
      <p className="muted">Only graduates who passed their assessment (5/10 or more) are listed.</p>
      <div className="card">
        <div className="grid">
          <div><label htmlFor="t">Skill</label>
            <select id="t" value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">All skills</option>
              {groups.map((g) => <optgroup key={g.group} label={g.group}>{g.skills.map((t) => <option key={t}>{t}</option>)}</optgroup>)}
            </select></div>
          <div><label htmlFor="m">Minimum assessment score</label>
            <select id="m" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}/10</option>)}
            </select></div>
          <div><label htmlFor="s">Search name / skills</label>
            <input id="s" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. widget, sql" /></div>
          <div><label htmlFor="o">Sort</label>
            <select id="o" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="score_desc">Score: high to low</option>
              <option value="score_asc">Score: low to high</option>
              <option value="name">Name</option>
            </select></div>
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}
      {list && list.length === 0 && <p className="muted">No candidates match these filters.</p>}
      {list && list.length > 0 && (
        <div className="card">
          <table>
            <thead><tr><th>Name</th><th>Skill</th><th>Assessment</th><th>HR</th><th>Technical</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="click" tabIndex={0} onClick={() => navigate(`/company/candidates/${c.id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/company/candidates/${c.id}`)}>
                  <td>{c.name} {c.isSample && <span className="badge yellow">Sample</span>}</td>
                  <td>{c.officialTrack}</td>
                  <td className="accent">{c.assessmentScore}/10</td>
                  <td>{c.hrStatus.replace("_", " ")}</td>
                  <td>{c.techStatus.replace("_", " ")}{c.techScore !== null ? ` · ${c.techScore}/10` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
