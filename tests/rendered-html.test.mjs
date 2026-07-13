import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("declares one shared remote D1 binding", async () => {
  const config = JSON.parse(await readProjectFile("wrangler.jsonc"));
  const [database] = config.d1_databases;

  assert.equal(config.name, "abby-talks");
  assert.equal(database.binding, "DB");
  assert.equal(database.database_name, "abby-talks");
  assert.match(database.database_id, /^[0-9a-f-]{36}$/);
  assert.equal(database.remote, true);
  assert.equal(database.migrations_dir, "drizzle");
});

test("keeps Dad and Abby as the only selectable profiles", async () => {
  const [roles, cover, games] = await Promise.all([
    readProjectFile("lib/roles.ts"),
    readProjectFile("app/page.tsx"),
    readProjectFile("app/games/page.tsx"),
  ]);

  assert.match(roles, /\["dad", "abby"\] as const/);
  assert.match(cover, /选择你的角色/);
  assert.match(cover, /router\.push\(`\/games\?role=\$\{role\}`\)/);
  assert.match(games, /parseRole\(searchParams\.get\("role"\)\)/);
  assert.match(games, /\?role=\$\{role\}/);
});

test("defines server-backed math and reading persistence", async () => {
  const [schema, mathRoute, readingRoute, migration] = await Promise.all([
    readProjectFile("db/schema.ts"),
    readProjectFile("app/api/profiles/[role]/math/route.ts"),
    readProjectFile("app/api/profiles/[role]/reading/route.ts"),
    readProjectFile("drizzle/0000_fuzzy_mathemanic.sql"),
  ]);

  assert.match(schema, /sqliteTable\("profiles"/);
  assert.match(schema, /sqliteTable\("math_stats"/);
  assert.match(schema, /"reading_progress"/);
  assert.match(mathRoute, /ON CONFLICT\(profile_id\) DO UPDATE/);
  assert.match(readingRoute, /db\.batch\(statements\)/);
  assert.match(migration, /VALUES \('dad', 'Dad'\)/);
  assert.match(migration, /VALUES \('abby', 'Abby'\)/);
});
