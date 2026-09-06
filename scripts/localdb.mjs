#!/usr/bin/env node
/**
 * Manage a throwaway local PostgreSQL for development WITHOUT Docker or an
 * installer — it runs the portable EDB binaries as the current user.
 *
 *   node scripts/localdb.mjs start | stop | status
 *
 * Binaries:  ~/.linktoglobe/pgsql/bin      (see scripts/localdb-setup notes)
 * Data dir:  ~/.linktoglobe/data
 * Port:      5432  (matches DATABASE_URL in .env.example)
 *
 * This is a convenience for machines where Docker is unavailable. Production
 * and CI use a real managed PostgreSQL.
 */
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = join(homedir(), ".linktoglobe");
const BIN = join(ROOT, "pgsql", "bin");
const DATA = join(ROOT, "data");
const PORT = "5432";
const USER = "linktoglobe";
const DB = "linktoglobe";

const exe = (name) => join(BIN, process.platform === "win32" ? `${name}.exe` : name);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  return r.status ?? 1;
}

function assertBinaries() {
  if (!existsSync(exe("pg_ctl"))) {
    console.error(`PostgreSQL binaries not found at ${BIN}.`);
    console.error("Download the portable binaries and unzip so that the path above exists:");
    console.error(
      "  https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip",
    );
    process.exit(1);
  }
}

const action = process.argv[2];

if (action === "start") {
  assertBinaries();
  if (!existsSync(join(DATA, "PG_VERSION"))) {
    console.log("Initializing data directory…");
    const pw = join(ROOT, ".pgpw");
    writeFileSync(pw, USER, "utf8");
    const code = run(exe("initdb"), [
      "-D",
      DATA,
      "-U",
      USER,
      `--pwfile=${pw}`,
      "--auth-host=scram-sha-256",
      "--auth-local=trust",
      "-E",
      "UTF8",
    ]);
    rmSync(pw, { force: true });
    if (code !== 0) process.exit(code);
  }
  const status = spawnSync(exe("pg_ctl"), ["-D", DATA, "status"], { encoding: "utf8" });
  if (!/server is running/i.test(status.stdout || "")) {
    console.log("Starting PostgreSQL on port " + PORT + "…");
    run(exe("pg_ctl"), ["-D", DATA, "-o", `-p ${PORT}`, "-l", join(ROOT, "pg.log"), "-w", "start"]);
  }

  // Create the database if it does not exist yet. Use TCP (-h 127.0.0.1) —
  // the default local named-pipe/socket connection is unreliable on Windows.
  const env = { ...process.env, PGPASSWORD: USER };
  const check = spawnSync(
    exe("psql"),
    [
      "-U",
      USER,
      "-h",
      "127.0.0.1",
      "-p",
      PORT,
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname='${DB}'`,
      "postgres",
    ],
    { encoding: "utf8", env },
  );
  if (check.stdout.trim() !== "1") {
    run(exe("createdb"), ["-U", USER, "-h", "127.0.0.1", "-p", PORT, DB], { env });
    console.log(`Created database "${DB}".`);
  }
  console.log(
    "Ready. DATABASE_URL=postgresql://" + USER + ":" + USER + "@localhost:" + PORT + "/" + DB,
  );
} else if (action === "stop") {
  assertBinaries();
  run(exe("pg_ctl"), ["-D", DATA, "-m", "fast", "stop"]);
} else if (action === "status") {
  assertBinaries();
  process.exit(run(exe("pg_ctl"), ["-D", DATA, "status"]));
} else {
  console.log("Usage: node scripts/localdb.mjs start|stop|status");
  process.exit(1);
}
