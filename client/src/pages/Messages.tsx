import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import Chat from "../components/Chat";
import { markInviteSeen } from "../components/NotificationBell";

export default function Messages() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (inviteId) return;
    api<{ invites: { id: number }[] }>("/student/invites").then((r) => {
      if (r.invites[0]) navigate(`/student/messages/${r.invites[0].id}`, { replace: true });
      else setError("You have no messages yet.");
    }).catch((e) => setError(e.message));
  }, [inviteId, navigate]);

  if (!inviteId) return <p className="muted">{error || "Loading…"}</p>;
  return <Chat path={`/student/invites/${inviteId}/messages`} me="student" subtitle="Formal interview invitation" onLoaded={() => markInviteSeen(Number(inviteId))} />;
}
