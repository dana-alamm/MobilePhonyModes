import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SessionUser } from "../api";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";

interface Plan { id: string; name: string; priceJod: number; features: string[] }

// Mock paywall: no payment gateway and no card data is collected.
export default function Pricing({ onSubscribed }: { onSubscribed: (u: SessionUser) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [chosen, setChosen] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api<{ plans: Plan[] }>("/company/subscription").then((r) => setPlans(r.plans)).catch((e) => setError(e.message));
  }, []);

  async function simulate() {
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: SessionUser }>("/company/subscribe", { body: { plan: chosen.id } });
      onSubscribed(r.user);
      toast("Payment Successful");
      navigate("/company", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Choose a plan to start hiring</h1>
      <p className="muted">Pick a plan to unlock the candidate dashboard. This is a demonstration: no real payment is taken.</p>
      {error && <div className="notice error">{error}</div>}
      <div className="plans">
        {plans.map((p) => (
          <div key={p.id} className={`plan ${p.id === "premium" ? "featured" : ""}`}>
            <h2>{p.name}</h2>
            <div className="price">{p.priceJod} JOD <small>/ month</small></div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <button className={p.id === "premium" ? "" : "ghost"} onClick={() => { setChosen(p); setError(""); }}>Select {p.name}</button>
          </div>
        ))}
      </div>

      {chosen && (
        <Modal title={`Subscribe to ${chosen.name}`} onClose={() => !busy && setChosen(null)}>
          <div className="notice warn"><strong>Simulated payment.</strong> No card is charged and no card details are collected.</div>
          <dl className="kv" style={{ marginBottom: 16 }}>
            <dt>Plan</dt><dd>{chosen.name}</dd>
            <dt>Amount</dt><dd>{chosen.priceJod} JOD / month (demo)</dd>
          </dl>
          {error && <div className="notice error">{error}</div>}
          <div className="row">
            <button disabled={busy} onClick={simulate}>{busy ? "Processing…" : "Simulate Payment"}</button>
            <button className="ghost" disabled={busy} onClick={() => setChosen(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}
