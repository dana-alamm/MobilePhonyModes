import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'student' | 'company'
  name: text("name").notNull(),
  demoKey: text("demo_key").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  subscriptionPlan: text("subscription_plan"), // companies: mock plan id
  subscriptionStatus: text("subscription_status").notNull().default("none"), // none | active (simulated)
  subscribedAt: timestamp("subscribed_at"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  selectedTracks: text("selected_tracks").array().notNull().default(sql`ARRAY[]::text[]`),
  officialTrack: text("official_track"),
  reviewConfirmedAt: timestamp("review_confirmed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  track: text("track").notNull(),
  answers: jsonb("answers").$type<number[]>(),
  score: integer("score"),
  passed: boolean("passed"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  attempts: integer("attempts").notNull().default(0),
}, (t) => [uniqueIndex("assessments_user_track_uq").on(t.userId, t.track)]);

export const practiceSessions = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  track: text("track").notNull(),
  questions: jsonb("questions").$type<string[]>().notNull(),
  responses: jsonb("responses").$type<PracticeResponse[]>(),
  status: text("status").notNull().default("in_progress"), // in_progress | completed | expired
  startedAt: timestamp("started_at").notNull().defaultNow(),
  deadlineAt: timestamp("deadline_at").notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => [index("practice_user_idx").on(t.userId)]);

export interface PracticeResponse {
  question: string;
  transcript: string;
  inputMode: "voice" | "typed" | "none";
  skipped: boolean;
  answerSeconds: number;
}

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountJod: integer("amount_jod").notNull(),
  status: text("status").notNull(), // 'simulated_success'
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const officialInterviews = pgTable("official_interviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(), // 'hr' | 'tech'
  track: text("track").notNull(),
  questions: jsonb("questions").$type<string[]>().notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress | completed | expired
  startedAt: timestamp("started_at").notNull().defaultNow(),
  deadlineAt: timestamp("deadline_at").notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  summary: text("summary"),
  feedbackType: text("feedback_type"), // ai_<gemini model> | none | sample
  evalStatus: text("eval_status"), // pending | done | failed | none
  evalError: text("eval_error"),
}, (t) => [uniqueIndex("official_user_stage_uq").on(t.userId, t.stage)]);

export const interviewResponses = pgTable("interview_responses", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => officialInterviews.id, { onDelete: "cascade" }),
  idx: integer("idx").notNull(),
  question: text("question").notNull(),
  presentedAt: timestamp("presented_at").notNull().defaultNow(),
  answeredAt: timestamp("answered_at"),
  transcript: text("transcript"),
  inputMode: text("input_mode"), // voice | typed | none
  answerSeconds: integer("answer_seconds"),
  skipped: boolean("skipped").notNull().default(false),
  repeatCount: integer("repeat_count").notNull().default(0),
}, (t) => [uniqueIndex("responses_interview_idx_uq").on(t.interviewId, t.idx)]);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  track: text("track").notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (t) => [index("attempts_user_idx").on(t.userId)]);

export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("invites_company_student_uq").on(t.companyId, t.studentId)]);

// Chat messages for an invite conversation (stored in the database; no real-time delivery).
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  inviteId: integer("invite_id").notNull().references(() => invites.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(), // 'company' | 'student'
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("messages_invite_idx").on(t.inviteId)]);
