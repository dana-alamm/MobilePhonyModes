import { useParams } from "react-router-dom";
import Chat from "../components/Chat";

export default function CompanyMessages() {
  const { studentId } = useParams();
  return <Chat path={`/company/chats/${studentId}/messages`} me="company" subtitle="Candidate" />;
}
