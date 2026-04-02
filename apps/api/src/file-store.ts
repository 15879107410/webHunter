import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import type { AnalysisInputSnapshot, AnalysisResult, AuthUser, BookmarkRecord, ResearchCard } from "@webhunter/shared";

type StoreUser = {
  id: string;
  email: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
};

type StoreSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type JsonRow<T> = {
  data: string;
} & Record<string, string | null>;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataPathCandidates = [
  path.resolve(process.cwd(), "apps/api/data/webhunter.sqlite"),
  path.resolve(process.cwd(), "data/webhunter.sqlite"),
  path.resolve(currentDir, "../data/webhunter.sqlite"),
  path.resolve(currentDir, "../../../../data/webhunter.sqlite")
];
const dbPath = dataPathCandidates.find((candidate) => existsSync(candidate)) ?? dataPathCandidates[0];
const legacyStorePathCandidates = [
  path.resolve(process.cwd(), "apps/api/data/store.json"),
  path.resolve(process.cwd(), "data/store.json"),
  path.resolve(currentDir, "../data/store.json"),
  path.resolve(currentDir, "../../../../data/store.json")
];
const legacyStorePath = legacyStorePathCandidates.find((candidate) => existsSync(candidate)) ?? null;

let db: SqliteDatabase | null = null;
let initPromise: Promise<void> | null = null;

function canonicalizeSiteUrl(siteUrl: string) {
  try {
    const url = new URL(siteUrl);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }
    url.hostname = url.hostname.replace(/^www\./i, "");
    const normalized = url.toString().replace(/\/$/, "");
    return normalized;
  } catch {
    return siteUrl;
  }
}

function canonicalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function deriveDisplayName(email: string) {
  const localPart = canonicalizeEmail(email).split("@")[0] ?? "user";
  return localPart.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim() || "User";
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function toAuthUser(user: StoreUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function unwrapBookmarkRecord(row: JsonRow<BookmarkRecord>) {
  return JSON.parse(row.data) as BookmarkRecord;
}

function unwrapResearchCard(row: JsonRow<ResearchCard>) {
  return JSON.parse(row.data) as ResearchCard;
}

function unwrapAnalysisResult(row: JsonRow<AnalysisResult>) {
  return JSON.parse(row.data) as AnalysisResult;
}

function unwrapAnalysisInput(row: JsonRow<AnalysisInputSnapshot>) {
  return JSON.parse(row.data) as AnalysisInputSnapshot;
}

function initDatabaseSchema() {
  const database = getDb();
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      site_url TEXT NOT NULL,
      site_domain TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_results_owner ON analysis_results(owner_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_results_url ON analysis_results(site_url);

    CREATE TABLE IF NOT EXISTS analysis_inputs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      site_url TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_inputs_owner ON analysis_inputs(owner_id);

    CREATE TABLE IF NOT EXISTS recent_analysis (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      data TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recent_analysis_owner ON recent_analysis(owner_id);
    CREATE INDEX IF NOT EXISTS idx_recent_analysis_domain ON recent_analysis(domain);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      data TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookmarks_owner ON bookmarks(owner_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);
  `);
}

function getDomainFromUrl(siteUrl: string) {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./i, "");
  } catch {
    return siteUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? siteUrl;
  }
}

function isDatabaseEmpty() {
  const database = getDb();
  const tables = ["users", "sessions", "analysis_results", "analysis_inputs", "recent_analysis", "bookmarks"];
  return tables.every((table) => {
    const row = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
    return row.count === 0;
  });
}

async function migrateLegacyStoreIfNeeded() {
  if (!legacyStorePath) {
    return;
  }

  if (!isDatabaseEmpty()) {
    return;
  }

  const raw = await fs.readFile(legacyStorePath, "utf8");
  const legacyStore = JSON.parse(raw) as {
    analysisResults?: Record<string, AnalysisResult>;
    analysisInputs?: Record<string, AnalysisInputSnapshot>;
    recentAnalysis?: ResearchCard[];
    bookmarks?: BookmarkRecord[];
    users?: StoreUser[];
    sessions?: StoreSession[];
  };

  const database = getDb();
  const importTx = database.transaction(() => {
    for (const user of legacyStore.users ?? []) {
      database
        .prepare(
          `
            INSERT INTO users (id, email, display_name, password_salt, password_hash, created_at)
            VALUES (@id, @email, @displayName, @passwordSalt, @passwordHash, @createdAt)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              display_name = excluded.display_name,
              password_salt = excluded.password_salt,
              password_hash = excluded.password_hash,
              created_at = excluded.created_at
          `
        )
        .run(user);
    }

    for (const session of legacyStore.sessions ?? []) {
      database
        .prepare(
          `
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES (@token, @userId, @createdAt, @expiresAt)
            ON CONFLICT(token) DO UPDATE SET
              user_id = excluded.user_id,
              created_at = excluded.created_at,
              expires_at = excluded.expires_at
          `
        )
        .run(session);
    }

    for (const result of Object.values(legacyStore.analysisResults ?? {})) {
      database
        .prepare(
          `
            INSERT INTO analysis_results (id, owner_id, site_url, site_domain, data, updated_at)
            VALUES (@id, @ownerId, @siteUrl, @siteDomain, @data, @updatedAt)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = excluded.owner_id,
              site_url = excluded.site_url,
              site_domain = excluded.site_domain,
              data = excluded.data,
              updated_at = excluded.updated_at
          `
        )
        .run({
          id: result.id,
          ownerId: normalizeOwnerId(result.ownerId),
          siteUrl: result.siteUrl,
          siteDomain: getDomainFromUrl(result.siteUrl),
          data: JSON.stringify(result),
          updatedAt: result.meta?.analyzedAt ?? new Date().toISOString()
        });
    }

    for (const [id, input] of Object.entries(legacyStore.analysisInputs ?? {})) {
      database
        .prepare(
          `
            INSERT INTO analysis_inputs (id, owner_id, site_url, data, updated_at)
            VALUES (@id, @ownerId, @siteUrl, @data, @updatedAt)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = excluded.owner_id,
              site_url = excluded.site_url,
              data = excluded.data,
              updated_at = excluded.updated_at
          `
        )
        .run({
          id,
          ownerId: normalizeOwnerId(input.ownerId),
          siteUrl: input.siteUrl,
          data: JSON.stringify(input),
          updatedAt: new Date().toISOString()
        });
    }

    legacyStore.recentAnalysis?.forEach((item, index) => {
      database
        .prepare(
          `
            INSERT INTO recent_analysis (id, owner_id, domain, data, saved_at)
            VALUES (@id, @ownerId, @domain, @data, @savedAt)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = excluded.owner_id,
              domain = excluded.domain,
              data = excluded.data,
              saved_at = excluded.saved_at
          `
        )
        .run({
          id: item.id,
          ownerId: normalizeOwnerId(item.ownerId),
          domain: item.domain,
          data: JSON.stringify(item),
          savedAt: item.analyzedAt ?? new Date(Date.now() - index * 1000).toISOString()
        });
    });

    for (const item of legacyStore.bookmarks ?? []) {
      database
        .prepare(
          `
            INSERT INTO bookmarks (id, owner_id, domain, data, saved_at)
            VALUES (@id, @ownerId, @domain, @data, @savedAt)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = excluded.owner_id,
              domain = excluded.domain,
              data = excluded.data,
              saved_at = excluded.saved_at
          `
        )
        .run({
          id: item.id,
          ownerId: normalizeOwnerId(item.ownerId),
          domain: item.domain,
          data: JSON.stringify(item),
          savedAt: new Date().toISOString()
        });
    }
  });

  importTx();
}

async function initializeDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      db = new Database(dbPath);
      initDatabaseSchema();
      await migrateLegacyStoreIfNeeded();
    })();
  }

  await initPromise;
}

function normalizeOwnerId(ownerId?: string | null) {
  return ownerId?.trim() || "";
}

function replaceAnalysisInput(id: string, input: AnalysisInputSnapshot) {
  const database = getDb();
  database
    .prepare(
      `
        INSERT INTO analysis_inputs (id, owner_id, site_url, data, updated_at)
        VALUES (@id, @ownerId, @siteUrl, @data, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          owner_id = excluded.owner_id,
          site_url = excluded.site_url,
          data = excluded.data,
          updated_at = excluded.updated_at
      `
    )
    .run({
      id,
      ownerId: normalizeOwnerId(input.ownerId),
      siteUrl: input.siteUrl,
      data: JSON.stringify(input),
      updatedAt: new Date().toISOString()
    });
}

function replaceAnalysis(result: AnalysisResult) {
  const database = getDb();
  database
    .prepare(
      `
        INSERT INTO analysis_results (id, owner_id, site_url, site_domain, data, updated_at)
        VALUES (@id, @ownerId, @siteUrl, @siteDomain, @data, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          owner_id = excluded.owner_id,
          site_url = excluded.site_url,
          site_domain = excluded.site_domain,
          data = excluded.data,
          updated_at = excluded.updated_at
      `
    )
    .run({
      id: result.id,
      ownerId: normalizeOwnerId(result.ownerId),
      siteUrl: result.siteUrl,
      siteDomain: new URL(result.siteUrl).hostname.replace(/^www\./, ""),
      data: JSON.stringify(result),
      updatedAt: new Date().toISOString()
    });
}

function replaceRecentAnalysis(item: ResearchCard) {
  const database = getDb();
  database
    .prepare(
      `
        INSERT INTO recent_analysis (id, owner_id, domain, data, saved_at)
        VALUES (@id, @ownerId, @domain, @data, @savedAt)
        ON CONFLICT(id) DO UPDATE SET
          owner_id = excluded.owner_id,
          domain = excluded.domain,
          data = excluded.data,
          saved_at = excluded.saved_at
      `
    )
    .run({
      id: item.id,
      ownerId: normalizeOwnerId(item.ownerId),
      domain: item.domain,
      data: JSON.stringify(item),
      savedAt: new Date().toISOString()
    });
}

function replaceBookmark(bookmark: BookmarkRecord) {
  const database = getDb();
  database
    .prepare(
      `
        INSERT INTO bookmarks (id, owner_id, domain, data, saved_at)
        VALUES (@id, @ownerId, @domain, @data, @savedAt)
        ON CONFLICT(id) DO UPDATE SET
          owner_id = excluded.owner_id,
          domain = excluded.domain,
          data = excluded.data,
          saved_at = excluded.saved_at
      `
    )
    .run({
      id: bookmark.id,
      ownerId: normalizeOwnerId(bookmark.ownerId),
      domain: bookmark.domain,
      data: JSON.stringify(bookmark),
      savedAt: new Date().toISOString()
    });
}

export function createPasswordRecord(password: string) {
  const salt = randomBytes(16).toString("hex");
  return {
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt)
  };
}

export function verifyPassword(password: string, passwordSalt: string, passwordHash: string) {
  const hash = hashPassword(password, passwordSalt);
  const current = Buffer.from(hash, "hex");
  const expected = Buffer.from(passwordHash, "hex");
  return current.length === expected.length && timingSafeEqual(current, expected);
}

export async function createUser(email: string, password: string) {
  await initializeDatabase();
  const normalizedEmail = canonicalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return null;
  }

  const now = new Date().toISOString();
  const passwordRecord = createPasswordRecord(password);
  const user: StoreUser = {
    id: randomBytes(12).toString("hex"),
    email: normalizedEmail,
    displayName: deriveDisplayName(normalizedEmail),
    createdAt: now,
    ...passwordRecord
  };

  getDb()
    .prepare(
      `
        INSERT INTO users (id, email, display_name, password_salt, password_hash, created_at)
        VALUES (@id, @email, @displayName, @passwordSalt, @passwordHash, @createdAt)
      `
    )
    .run(user);

  return toAuthUser(user);
}

export async function findUserByEmail(email: string) {
  await initializeDatabase();
  const normalizedEmail = canonicalizeEmail(email);
  const user = getDb()
    .prepare(
      `
        SELECT id, email, display_name as displayName, password_salt as passwordSalt, password_hash as passwordHash, created_at as createdAt
        FROM users
        WHERE email = ?
        LIMIT 1
      `
    )
    .get(normalizedEmail) as StoreUser | undefined;

  return user ?? null;
}

export async function getUserById(id: string) {
  await initializeDatabase();
  const user = getDb()
    .prepare(
      `
        SELECT id, email, display_name as displayName, password_salt as passwordSalt, password_hash as passwordHash, created_at as createdAt
        FROM users
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(id) as StoreUser | undefined;

  return user ?? null;
}

export async function createSession(userId: string) {
  await initializeDatabase();
  const now = new Date();
  const session: StoreSession = {
    token: randomBytes(24).toString("hex"),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString()
  };

  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  database
    .prepare(
      `
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (@token, @userId, @createdAt, @expiresAt)
      `
    )
    .run(session);

  return session;
}

export async function getUserBySessionToken(token: string) {
  await initializeDatabase();
  const now = Date.now();
  const session = getDb()
    .prepare(
      `
        SELECT token, user_id as userId, created_at as createdAt, expires_at as expiresAt
        FROM sessions
        WHERE token = ?
        LIMIT 1
      `
    )
    .get(token) as StoreSession | undefined;

  if (!session || Date.parse(session.expiresAt) <= now) {
    return null;
  }

  const user = await getUserById(session.userId);
  return user ? toAuthUser(user) : null;
}

export async function deleteSession(token: string) {
  await initializeDatabase();
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function getAnalysisResults() {
  await initializeDatabase();
  const rows = getDb().prepare("SELECT data FROM analysis_results").all() as JsonRow<AnalysisResult>[];
  return Object.fromEntries(rows.map((row) => {
    const item = unwrapAnalysisResult(row);
    return [item.id, item];
  }));
}

export async function getAnalysisResultsForUser(userId: string) {
  await initializeDatabase();
  const rows = getDb().prepare("SELECT data FROM analysis_results WHERE owner_id = ?").all(userId) as JsonRow<AnalysisResult>[];
  return Object.fromEntries(rows.map((row) => {
    const item = unwrapAnalysisResult(row);
    return [item.id, item];
  }));
}

export async function findAnalysisBySiteUrl(siteUrl: string) {
  await initializeDatabase();
  const target = canonicalizeSiteUrl(siteUrl);
  const item = getDb()
    .prepare(
      `
        SELECT data
        FROM analysis_results
        WHERE site_url = ?
        LIMIT 1
      `
    )
    .get(target) as JsonRow<AnalysisResult> | undefined;
  return item ? unwrapAnalysisResult(item) : null;
}

export async function findAnalysisBySiteUrlForUser(userId: string, siteUrl: string) {
  await initializeDatabase();
  const target = canonicalizeSiteUrl(siteUrl);
  const item = getDb()
    .prepare(
      `
        SELECT data
        FROM analysis_results
        WHERE owner_id = ? AND site_url = ?
        LIMIT 1
      `
    )
    .get(userId, target) as JsonRow<AnalysisResult> | undefined;
  return item ? unwrapAnalysisResult(item) : null;
}

export async function getRecentAnalysis() {
  await initializeDatabase();
  const rows = getDb().prepare("SELECT data FROM recent_analysis ORDER BY saved_at DESC").all() as JsonRow<ResearchCard>[];
  return rows.map(unwrapResearchCard);
}

export async function getRecentAnalysisForUser(userId: string) {
  await initializeDatabase();
  const rows = getDb()
    .prepare("SELECT data FROM recent_analysis WHERE owner_id = ? ORDER BY saved_at DESC")
    .all(userId) as JsonRow<ResearchCard>[];
  return rows.map(unwrapResearchCard);
}

export async function getAnalysisInput(id: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare(
      `
        SELECT data
        FROM analysis_inputs
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(id) as JsonRow<AnalysisInputSnapshot> | undefined;
  return row ? unwrapAnalysisInput(row) : null;
}

export async function getAnalysisInputForUser(userId: string, id: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare(
      `
        SELECT data
        FROM analysis_inputs
        WHERE id = ? AND owner_id = ?
        LIMIT 1
      `
    )
    .get(id, userId) as JsonRow<AnalysisInputSnapshot> | undefined;
  return row ? unwrapAnalysisInput(row) : null;
}

export async function getBookmarks() {
  await initializeDatabase();
  const rows = getDb().prepare("SELECT data FROM bookmarks ORDER BY saved_at DESC").all() as JsonRow<BookmarkRecord>[];
  return rows.map(unwrapBookmarkRecord);
}

export async function getBookmarksForUser(userId: string) {
  await initializeDatabase();
  const rows = getDb()
    .prepare("SELECT data FROM bookmarks WHERE owner_id = ? ORDER BY saved_at DESC")
    .all(userId) as JsonRow<BookmarkRecord>[];
  return rows.map(unwrapBookmarkRecord);
}

export async function upsertAnalysis(result: AnalysisResult) {
  await initializeDatabase();
  replaceAnalysis(result);
}

export async function upsertAnalysisInput(id: string, input: AnalysisInputSnapshot) {
  await initializeDatabase();
  replaceAnalysisInput(id, input);
}

export async function pushRecentAnalysis(item: ResearchCard) {
  await initializeDatabase();
  const ownerId = normalizeOwnerId(item.ownerId);
  const database = getDb();
  database.prepare("DELETE FROM recent_analysis WHERE id = ? OR (owner_id = ? AND domain = ?)").run(item.id, ownerId, item.domain);
  replaceRecentAnalysis(item);
  const count = database.prepare("SELECT COUNT(*) as count FROM recent_analysis WHERE owner_id = ?").get(ownerId) as { count: number };
  if (count.count > 20) {
    const overflow = count.count - 20;
    database
      .prepare(
        `
          DELETE FROM recent_analysis
          WHERE id IN (
            SELECT id FROM recent_analysis
            WHERE owner_id = ?
            ORDER BY saved_at ASC
            LIMIT ?
          )
        `
      )
      .run(ownerId, overflow);
  }
}

export async function addBookmark(bookmark: BookmarkRecord) {
  await initializeDatabase();
  replaceBookmark(bookmark);
}

export async function updateBookmark(id: string, patch: Partial<BookmarkRecord>) {
  await initializeDatabase();
  const row = getDb()
    .prepare(
      `
        SELECT data
        FROM bookmarks
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(id) as JsonRow<BookmarkRecord> | undefined;

  if (!row) {
    return null;
  }

  const current = unwrapBookmarkRecord(row);
  const next: BookmarkRecord = {
    ...current,
    ...patch,
    id: current.id
  };
  replaceBookmark(next);
  return next;
}

export async function removeBookmark(id: string) {
  await initializeDatabase();
  const result = getDb().prepare("DELETE FROM bookmarks WHERE id = ?").run(id);
  return result.changes > 0;
}
