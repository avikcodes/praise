/**
 * PostgreSQL Database Backup and Restore Utility for Praise Core.
 * Executes transaction-consistent, clean SQL dumps and restores via pg_dump/psql,
 * with automatic detection for Docker Compose environments and standalone servers.
 */
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Parses a standard PostgreSQL connection URL or individual environment variables.
 */
export function getDatabaseConfig() {
  // Attempt to parse .env file if DATABASE_URL or POSTGRES_PASSWORD not currently loaded
  loadEnvFileIfPresent();

  const databaseUrl = process.env.DATABASE_URL;
  let user = process.env.POSTGRES_USER || "praise";
  let password = process.env.POSTGRES_PASSWORD || "";
  let host = process.env.POSTGRES_HOST || "localhost";
  let port = process.env.POSTGRES_PORT || "5432";
  let database = process.env.POSTGRES_DB || "praise";

  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      if (parsed.protocol.startsWith("postgres")) {
        user = decodeURIComponent(parsed.username || user);
        password = decodeURIComponent(parsed.password || password);
        host = parsed.hostname || host;
        port = parsed.port || port;
        database = (parsed.pathname || "").replace(/^\//, "") || database;
      }
    } catch {
      // Ignore URL parse error if invalid format
    }
  }

  return {
    databaseUrl,
    user,
    password,
    host,
    port,
    database,
  };
}

/**
 * Loads key-value pairs from .env into process.env if not already set.
 */
function loadEnvFileIfPresent() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore .env read errors
  }
}

/**
 * Checks whether Docker Compose is running with an active 'db' (PostgreSQL) container.
 */
export function isDockerComposeDatabaseRunning() {
  try {
    const output = execSync("docker compose ps db --format json", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return output.toLowerCase().includes("running") || output.toLowerCase().includes("healthy");
  } catch {
    // Fallback check with plain ps
    try {
      const rawPs = execSync("docker compose ps", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      return rawPs.includes("praise-db") || (rawPs.includes("db") && rawPs.includes("running"));
    } catch {
      return false;
    }
  }
}

/**
 * Checks whether the host system has `pg_dump` binary installed and accessible.
 */
export function isPgDumpAvailable() {
  try {
    execSync("pg_dump --version", { stdio: ["pipe", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether the host system has `psql` binary installed and accessible.
 */
export function isPsqlAvailable() {
  try {
    execSync("psql --version", { stdio: ["pipe", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Dumps the PostgreSQL database into a standard SQL script buffer.
 * 
 * Flags used:
 * - `--clean`: Drop database objects before recreating them.
 * - `--if-exists`: Avoid errors when dropping non-existent tables.
 * - `--no-owner`: Do not output commands to set ownership (enables cross-user portability).
 * - `--no-privileges`: Do not output grant/revoke commands.
 * 
 * @param {object} options
 * @param {boolean} [options.preferDocker]
 * @returns {Promise<{ sql: string, method: string, detectedTables: string[], recordCounts: Record<string, number> }>}
 */
export async function dumpDatabase(options = {}) {
  const config = getDatabaseConfig();
  const useDocker = options.preferDocker || isDockerComposeDatabaseRunning();

  let sqlOutput = "";
  let method = "";

  if (useDocker) {
    method = "docker-compose";
    sqlOutput = await new Promise((resolve, reject) => {
      const cmdArgs = [
        "compose",
        "exec",
        "-T",
        "db",
        "pg_dump",
        "-U",
        config.user,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-d",
        config.database,
      ];

      const proc = spawn("docker", cmdArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => reject(new Error(`Failed to execute docker compose: ${err.message}`)));
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump in Docker container failed with exit code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  } else if (isPgDumpAvailable()) {
    method = "host-pg_dump";
    sqlOutput = await new Promise((resolve, reject) => {
      const args = [
        "-h",
        config.host,
        "-p",
        config.port,
        "-U",
        config.user,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-d",
        config.database,
      ];

      const env = { ...process.env, PGPASSWORD: config.password };
      const proc = spawn("pg_dump", args, {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => reject(new Error(`Failed to execute pg_dump: ${err.message}`)));
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump failed with exit code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  } else {
    throw new Error(
      "Unable to backup database: neither a running Docker Compose 'db' container nor local 'pg_dump' utility was found.\n" +
      "Make sure Praise containers are running ('docker compose up -d') or install the PostgreSQL client tools."
    );
  }

  // Parse SQL to collect summary statistics and table inspection
  const inspection = inspectSqlDump(sqlOutput);

  return {
    sql: sqlOutput,
    method,
    detectedTables: inspection.tables,
    recordCounts: inspection.counts,
  };
}

/**
 * Restores a SQL dump buffer into the PostgreSQL database.
 * 
 * @param {string | Buffer} sqlData
 * @param {object} options
 * @param {boolean} [options.preferDocker]
 */
export async function restoreDatabase(sqlData, options = {}) {
  const config = getDatabaseConfig();
  const useDocker = options.preferDocker || isDockerComposeDatabaseRunning();
  const sqlString = Buffer.isBuffer(sqlData) ? sqlData.toString("utf8") : sqlData;

  if (useDocker) {
    return new Promise((resolve, reject) => {
      const cmdArgs = [
        "compose",
        "exec",
        "-T",
        "db",
        "psql",
        "-U",
        config.user,
        "-d",
        config.database,
      ];

      const proc = spawn("docker", cmdArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";

      proc.stdin.write(sqlString);
      proc.stdin.end();

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => reject(new Error(`Failed to execute docker compose psql: ${err.message}`)));
      proc.on("close", (code) => {
        // Note: psql can output notices to stderr (e.g. table does not exist, skipping)
        if (code !== 0) {
          reject(new Error(`psql restore failed in Docker container with exit code ${code}: ${stderr}`));
        } else {
          resolve({ method: "docker-compose", success: true });
        }
      });
    });
  } else if (isPsqlAvailable()) {
    return new Promise((resolve, reject) => {
      const args = [
        "-h",
        config.host,
        "-p",
        config.port,
        "-U",
        config.user,
        "-d",
        config.database,
      ];

      const env = { ...process.env, PGPASSWORD: config.password };
      const proc = spawn("psql", args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";

      proc.stdin.write(sqlString);
      proc.stdin.end();

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => reject(new Error(`Failed to execute psql: ${err.message}`)));
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`psql restore failed with exit code ${code}: ${stderr}`));
        } else {
          resolve({ method: "host-psql", success: true });
        }
      });
    });
  } else {
    throw new Error(
      "Unable to restore database: neither a running Docker Compose 'db' container nor local 'psql' utility was found.\n" +
      "Make sure Praise containers are running ('docker compose up -d') or install PostgreSQL client tools."
    );
  }
}

/**
 * Inspects SQL dump text to extract created tables, row insertions, and referenced media keys.
 * 
 * @param {string} sql
 */
export function inspectSqlDump(sql) {
  const tables = new Set();
  const counts = {};

  // Find CREATE TABLE statements: CREATE TABLE [IF NOT EXISTS] "public"."users" or CREATE TABLE users
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["\w]+\.)?["']?(\w+)["']?\s*\(/gi;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    tables.add(tableName);
    counts[tableName] = 0;
  }

  // Count INSERT statements per table
  const insertRegex = /INSERT\s+INTO\s+(?:["\w]+\.)?["']?(\w+)["']?/gi;
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    counts[tableName] = (counts[tableName] || 0) + 1;
  }

  // Count COPY FROM statements per table
  const copyRegex = /COPY\s+(?:["\w]+\.)?["']?(\w+)["']?\s*\([^)]*\)\s+FROM\s+stdin;/gi;
  while ((match = copyRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    // In pg_dump COPY format, rows follow until \.
    const startIdx = match.index + match[0].length;
    const endIdx = sql.indexOf("\n\\.", startIdx);
    if (endIdx !== -1) {
      const dataBlock = sql.slice(startIdx, endIdx).trim();
      const rows = dataBlock ? dataBlock.split("\n").length : 0;
      counts[tableName] = (counts[tableName] || 0) + rows;
    }
  }

  // Find referenced media asset paths (urls or local paths)
  const referencedMediaPaths = [];
  // MediaAsset inserts typically contain URLs like /api/media/... or paths like 2026/...
  const mediaAssetStatementRegex = /INSERT\s+INTO\s+(?:["\w]+\.)?["']?media_assets["']?[^;]+;/gi;
  while ((match = mediaAssetStatementRegex.exec(sql)) !== null) {
    const fullStatement = match[0];
    const stringLiterals = [...fullStatement.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const lit of stringLiterals) {
      if (
        lit.includes("/api/media/") ||
        lit.endsWith(".webm") ||
        lit.endsWith(".mp4") ||
        lit.endsWith(".jpg") ||
        lit.endsWith(".jpeg") ||
        lit.endsWith(".png") ||
        lit.endsWith(".webp") ||
        lit.endsWith(".wav") ||
        lit.endsWith(".mp3")
      ) {
        referencedMediaPaths.push(lit);
      }
    }
  }

  // Also check COPY media_assets FROM stdin;
  const mediaCopyRegex = /COPY\s+(?:["\w]+\.)?["']?media_assets["']?\s*\([^)]*\)\s+FROM\s+stdin;/gi;
  while ((match = mediaCopyRegex.exec(sql)) !== null) {
    const startIdx = match.index + match[0].length;
    const endIdx = sql.indexOf("\n\\.", startIdx);
    if (endIdx !== -1) {
      const dataBlock = sql.slice(startIdx, endIdx).trim();
      const tokens = dataBlock.split(/\s+/);
      for (const token of tokens) {
        if (
          token.includes("/api/media/") ||
          token.endsWith(".webm") ||
          token.endsWith(".mp4") ||
          token.endsWith(".jpg") ||
          token.endsWith(".jpeg") ||
          token.endsWith(".png") ||
          token.endsWith(".webp") ||
          token.endsWith(".wav") ||
          token.endsWith(".mp3")
        ) {
          referencedMediaPaths.push(token);
        }
      }
    }
  }

  return {
    tables: Array.from(tables).sort(),
    counts,
    referencedMediaPaths,
  };
}
