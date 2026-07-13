import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mathStats = sqliteTable("math_stats", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  medals: real("medals").notNull().default(0),
  stars: real("stars").notNull().default(0),
  totalMatches: integer("total_matches").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  fastestAnswerSec: real("fastest_answer_sec"),
  winStreak: integer("win_streak").notNull().default(0),
  wrongBookJson: text("wrong_book_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const readingProgress = sqliteTable(
  "reading_progress",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stopId: integer("stop_id").notNull(),
    notesJson: text("notes_json").notNull().default("[]"),
    shieldsJson: text("shields_json").notNull().default("[]"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.stopId] })],
);
