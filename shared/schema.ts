import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'student' | 'company'
  name: text("name").notNull(),
  demoKey: text("demo_key").notNull().unique(),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  selectedTracks: text("selected_tracks").array().notNull().default(sql`ARRAY[]::text[]`),
  officialTrack: text("official_track"),
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
  feedbackType: text("feedback_type"), // 'rule_based'
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
