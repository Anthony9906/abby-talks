import { getD1 } from "@/db";
import { parseRole } from "@/lib/roles";

const STOP_COUNT = 10;
const SHIELDS_PER_STOP = 25;

type ReadingRow = {
  stop_id: number;
  notes_json: string;
  shields_json: string;
};

type StopProgress = {
  notes: string[];
  shields: boolean[];
};

function emptyStop(): StopProgress {
  return {
    notes: [],
    shields: Array.from({ length: SHIELDS_PER_STOP }, () => false),
  };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeStop(value: unknown): StopProgress {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const notes = Array.isArray(input.notes)
    ? input.notes.filter((note): note is string => typeof note === "string").slice(0, 200)
    : [];
  const shields = Array.from(
    { length: SHIELDS_PER_STOP },
    (_, index) => Boolean(Array.isArray(input.shields) && input.shields[index]),
  );

  return { notes, shields };
}

function emptyProgress() {
  return Object.fromEntries(
    Array.from({ length: STOP_COUNT }, (_, index) => [index + 1, emptyStop()]),
  ) as Record<number, StopProgress>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const role = parseRole((await params).role);
  if (!role) return Response.json({ error: "Unknown profile" }, { status: 404 });

  const result = await getD1()
    .prepare(
      "SELECT stop_id, notes_json, shields_json FROM reading_progress WHERE profile_id = ? ORDER BY stop_id",
    )
    .bind(role)
    .all<ReadingRow>();
  const progress = emptyProgress();

  for (const row of result.results) {
    if (row.stop_id < 1 || row.stop_id > STOP_COUNT) continue;
    progress[row.stop_id] = normalizeStop({
      notes: safeJson(row.notes_json),
      shields: safeJson(row.shields_json),
    });
  }

  return Response.json({ progress });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const role = parseRole((await params).role);
  if (!role) return Response.json({ error: "Unknown profile" }, { status: 404 });

  const payload = (await request.json()) as { progress?: unknown };
  const input =
    payload.progress && typeof payload.progress === "object"
      ? (payload.progress as Record<string, unknown>)
      : {};
  const progress = emptyProgress();
  const db = getD1();
  const statements = Array.from({ length: STOP_COUNT }, (_, index) => {
    const stopId = index + 1;
    const stop = normalizeStop(input[String(stopId)]);
    progress[stopId] = stop;

    return db
      .prepare(
        `INSERT INTO reading_progress (profile_id, stop_id, notes_json, shields_json, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(profile_id, stop_id) DO UPDATE SET
           notes_json = excluded.notes_json,
           shields_json = excluded.shields_json,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(role, stopId, JSON.stringify(stop.notes), JSON.stringify(stop.shields));
  });

  await db.batch(statements);
  return Response.json({ progress });
}
