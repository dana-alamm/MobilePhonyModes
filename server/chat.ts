import { asc, eq } from "drizzle-orm";
import { db, messages } from "./db.js";

const INTERVIEW_SLOT = "Monday, Oct 12th at 10:00 AM";
export const initialMessage = () =>
  `Hello! We are impressed by your profile and would like to invite you for a formal interview on ${INTERVIEW_SLOT}. Let us know if this time works for you.`;

const list = (inviteId: number) => db.select().from(messages).where(eq(messages.inviteId, inviteId)).orderBy(asc(messages.id));

// Returns the thread, adding the automated first company message if the thread is empty.
export async function threadFor(inviteId: number) {
  const rows = await list(inviteId);
  if (rows.length > 0) return rows;
  await db.insert(messages).values({ inviteId, sender: "company", body: initialMessage() });
  return list(inviteId);
}
