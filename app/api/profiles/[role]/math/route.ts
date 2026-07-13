import { getD1 } from "@/db";
import { defaultStats } from "@/lib/storage";
import { parseRole } from "@/lib/roles";
import type { Stats, WrongQuestion } from "@/lib/types";

type MathStatsRow = {
  medals: number;
  stars: number;
  total_matches: number;
  total_questions: number;
  correct_answers: number;
  attempts: number;
  fastest_answer_sec: number | null;
  win_streak: number;
  wrong_book_json: string;
};

function safeWrongBook(value: unknown): WrongQuestion[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is WrongQuestion => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      typeof record.question === "string" &&
      typeof record.correctAnswer === "string" &&
      typeof record.userAnswer === "string" &&
      typeof record.createdAt === "string" &&
      typeof record.mastered === "boolean"
    );
  });
}

function parseWrongBookJson(value: string): WrongQuestion[] {
  try {
    return safeWrongBook(JSON.parse(value));
  } catch {
    return [];
  }
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown) {
  return Math.max(0, Math.floor(finiteNumber(value)));
}

function normalizeStats(value: unknown): Stats {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fastest = input.fastestAnswerSec;

  return {
    medals: Math.max(0, finiteNumber(input.medals)),
    stars: Math.max(0, finiteNumber(input.stars)),
    totalMatches: nonNegativeInteger(input.totalMatches),
    totalQuestions: nonNegativeInteger(input.totalQuestions),
    correctAnswers: nonNegativeInteger(input.correctAnswers),
    attempts: nonNegativeInteger(input.attempts),
    fastestAnswerSec:
      fastest === null ? null : Math.max(0, finiteNumber(fastest, 0)) || null,
    winStreak: nonNegativeInteger(input.winStreak),
    wrongBook: safeWrongBook(input.wrongBook),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const role = parseRole((await params).role);
  if (!role) return Response.json({ error: "Unknown profile" }, { status: 404 });

  const row = await getD1()
    .prepare(
      `SELECT medals, stars, total_matches, total_questions, correct_answers, attempts,
              fastest_answer_sec, win_streak, wrong_book_json
       FROM math_stats WHERE profile_id = ?`,
    )
    .bind(role)
    .first<MathStatsRow>();

  if (!row) return Response.json({ stats: defaultStats });

  return Response.json({
    stats: {
      medals: row.medals,
      stars: row.stars,
      totalMatches: row.total_matches,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      attempts: row.attempts,
      fastestAnswerSec: row.fastest_answer_sec,
      winStreak: row.win_streak,
      wrongBook: parseWrongBookJson(row.wrong_book_json),
    } satisfies Stats,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const role = parseRole((await params).role);
  if (!role) return Response.json({ error: "Unknown profile" }, { status: 404 });

  const payload = (await request.json()) as { stats?: unknown };
  const stats = normalizeStats(payload.stats);

  await getD1()
    .prepare(
      `INSERT INTO math_stats (
         profile_id, medals, stars, total_matches, total_questions, correct_answers,
         attempts, fastest_answer_sec, win_streak, wrong_book_json, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(profile_id) DO UPDATE SET
         medals = excluded.medals,
         stars = excluded.stars,
         total_matches = excluded.total_matches,
         total_questions = excluded.total_questions,
         correct_answers = excluded.correct_answers,
         attempts = excluded.attempts,
         fastest_answer_sec = excluded.fastest_answer_sec,
         win_streak = excluded.win_streak,
         wrong_book_json = excluded.wrong_book_json,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      role,
      stats.medals,
      stats.stars,
      stats.totalMatches,
      stats.totalQuestions,
      stats.correctAnswers,
      stats.attempts,
      stats.fastestAnswerSec,
      stats.winStreak,
      JSON.stringify(stats.wrongBook),
    )
    .run();

  return Response.json({ stats });
}
