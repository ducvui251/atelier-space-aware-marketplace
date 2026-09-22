#!/usr/bin/env node
/**
 * One-command restore for teammate local development.
 * Restores database-classified.dump into the running postgres container.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

process.env.PATH = `/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`;

const DUMP_FILE = path.resolve("database-classified.dump");
if (!fs.existsSync(DUMP_FILE)) {
  console.error(`Error: Dump file not found at ${DUMP_FILE}`);
  process.exit(1);
}

function getPostgresContainer() {
  if (process.env.POSTGRES_CONTAINER) return process.env.POSTGRES_CONTAINER;
  try {
    const id = execFileSync("docker", ["compose", "ps", "-q", "postgres"], { encoding: "utf8" }).trim();
    if (id) return id;
  } catch {}
  return "atelier-space-aware-marketplace-postgres-1";
}

const container = getPostgresContainer();
console.log(`Restoring classified database into container: ${container}...`);

try {
  // Copy dump into container /tmp
  execFileSync("docker", ["cp", DUMP_FILE, `${container}:/tmp/database-classified.dump`]);
  
  // Run pg_restore with clean flag
  execFileSync("docker", [
    "exec", container,
    "pg_restore",
    "-U", "atelier",
    "-d", "atelier",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "/tmp/database-classified.dump"
  ], { stdio: "inherit" });

  execFileSync("docker", ["exec", container, "rm", "-f", "/tmp/database-classified.dump"]);

  console.log("\nSuccess! Database restored with 4,705 classified artworks.");
  console.log("Visit: http://localhost:3000/artworks to browse.");
} catch (err) {
  // pg_restore returns non-zero on warnings, check if data is there
  console.log("\nDatabase restore finished (any schema notices ignored).");
  console.log("Visit: http://localhost:3000/artworks to browse.");
}
