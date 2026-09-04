import fs from "node:fs";

const repoFile = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => fs.writeFileSync(path, content);

const leaderboardModule = `import crypto from "crypto";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface PublicLeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string | null;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  gamesPlayed: number;
}

const DEFAULT_RATING = 1200;
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const DEFAULT_FIRESTORE_DATABASE_ID =
  "ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc";

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getFirestoreDatabaseId(): string {
  return process.env.FIRESTORE_DATABASE_ID?.trim() || DEFAULT_FIRESTORE_DATABASE_ID;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) return accessToken;

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: FIRESTORE_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = \`${header}.${claims}\`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), account.private_key);
  const assertion = \`${unsigned}.${base64url(signature)}\`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(\`Google OAuth token request failed (${response.status})\`);

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google OAuth response missing access_token");
  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return accessToken;
}

function readNumber(fields: Record<string, any> | undefined, key: string, fallback: number): number {
  const raw = fields?.[key]?.integerValue ?? fields?.[key]?.doubleValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readString(fields: Record<string, any> | undefined, key: string): string | null {
  const value = fields?.[key]?.stringValue;
  return typeof value === "string" ? value : null;
}

export function sanitizePublicLeaderboardDocument(
  documentName: string,
  fields: Record<string, any> | undefined,
): PublicLeaderboardEntry {
  const rawUid = documentName.split("/").pop() || "";
  let uid = rawUid;
  try {
    uid = decodeURIComponent(rawUid);
  } catch {
    uid = rawUid;
  }
  const rating = readNumber(fields, "rating", DEFAULT_RATING);
  return {
    uid,
    displayName: (readString(fields, "displayName") || "Kỳ thủ").slice(0, 80),
    photoURL: readString(fields, "photoURL")?.slice(0, 2048) || null,
    rating,
    peakRating: readNumber(fields, "peakRating", rating),
    wins: readNumber(fields, "wins", 0),
    losses: readNumber(fields, "losses", 0),
    draws: readNumber(fields, "draws", 0),
    winStreak: readNumber(fields, "winStreak", 0),
    gamesPlayed: readNumber(fields, "gamesPlayed", 0),
  };
}

export async function fetchPublicLeaderboard(requestedLimit = 50): Promise<PublicLeaderboardEntry[]> {
  const account = getServiceAccount();
  if (!account) throw new Error("Leaderboard service account is not configured");

  const databaseId = getFirestoreDatabaseId();
  const token = await getAccessToken(account);
  const limit = Math.max(1, Math.min(100, Math.trunc(Number(requestedLimit) || 50)));
  const url = \`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    account.project_id,
  )}/databases/${encodeURIComponent(databaseId)}/documents:runQuery\`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: \`Bearer ${token}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        orderBy: [{ field: { fieldPath: "rating" }, direction: "DESCENDING" }],
        limit,
      },
    }),
  });
  if (!response.ok) throw new Error(\`Firestore leaderboard query failed (${response.status})\`);

  const rows = (await response.json()) as Array<{
    document?: { name?: string; fields?: Record<string, any> };
  }>;
  return rows
    .map((row) => row.document)
    .filter((doc): doc is { name: string; fields?: Record<string, any> } => Boolean(doc?.name))
    .map((doc) => sanitizePublicLeaderboardDocument(doc.name, doc.fields));
}
`;

write("server/public-leaderboard.ts", leaderboardModule);

let index = repoFile("server/index.ts");
if (!index.includes('from "./public-leaderboard"')) {
  index = index.replace(
    'import { rankedManager } from "./ranked-manager";',
    'import { rankedManager } from "./ranked-manager";\nimport { fetchPublicLeaderboard } from "./public-leaderboard";',
  );
}
if (!index.includes('req.url?.startsWith("/api/leaderboard")')) {
  const anchor = '    if (req.url === "/health" || req.url === "/") {';
  const block = `    if (req.url?.startsWith("/api/leaderboard")) {
      const requestUrl = new URL(req.url, "http://localhost");
      const requestedLimit = Number(requestUrl.searchParams.get("limit") || "50");
      void fetchPublicLeaderboard(requestedLimit)
        .then((players) => {
          if (res.writableEnded) return;
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ players }));
        })
        .catch(() => {
          if (res.writableEnded) return;
          res.writeHead(503, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ error: "LEADERBOARD_UNAVAILABLE" }));
        });
      return;
    }

`;
  if (!index.includes(anchor)) throw new Error("server/index.ts leaderboard anchor not found");
  index = index.replace(anchor, block + anchor);
}
write("server/index.ts", index);

let auth = repoFile("src/lib/auth-manager.ts");
auth = auth
  .replace("  collection,\n", "")
  .replace("  query,\n", "")
  .replace("  orderBy,\n", "")
  .replace("  limit,\n", "")
  .replace("  getDocs,\n", "");

const methodMarker = "  public async fetchLeaderboard(limitCount = 50): Promise<UserProfile[]> {";
const methodStart = auth.indexOf(methodMarker);
if (methodStart < 0) throw new Error("fetchLeaderboard method not found");
const braceStart = auth.indexOf("{", methodStart);
let depth = 0;
let methodEnd = -1;
for (let i = braceStart; i < auth.length; i++) {
  if (auth[i] === "{") depth += 1;
  if (auth[i] === "}") {
    depth -= 1;
    if (depth === 0) {
      methodEnd = i + 1;
      break;
    }
  }
}
if (methodEnd < 0) throw new Error("fetchLeaderboard closing brace not found");
const newMethod = `  public async fetchLeaderboard(limitCount = 50): Promise<UserProfile[]> {
    try {
      if (typeof window === "undefined") return [];
      const requestedLimit = Math.max(1, Math.min(100, Math.trunc(limitCount || 50)));
      const targetBase =
        (import.meta.env?.VITE_ONLINE_SERVER_URL as string) ||
        (import.meta.env?.VITE_SOCKET_URL as string) ||
        window.location.origin;
      const base = targetBase.replace(/\\/+$/, "");
      const response = await fetch(\`${base}/api/leaderboard?limit=${requestedLimit}\`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(\`Leaderboard request failed (${response.status})\`);
      const payload = (await response.json()) as {
        players?: Array<{
          uid?: string;
          displayName?: string;
          photoURL?: string | null;
          rating?: number;
          peakRating?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          winStreak?: number;
          gamesPlayed?: number;
        }>;
      };
      return (payload.players || []).map((player) => ({
        uid: player.uid || "",
        email: null,
        displayName: player.displayName || "Kỳ thủ",
        photoURL: player.photoURL || null,
        emailVerified: false,
        providerId: "public",
        rating: typeof player.rating === "number" ? player.rating : 1200,
        peakRating:
          typeof player.peakRating === "number"
            ? player.peakRating
            : typeof player.rating === "number"
              ? player.rating
              : 1200,
        wins: typeof player.wins === "number" ? player.wins : 0,
        losses: typeof player.losses === "number" ? player.losses : 0,
        draws: typeof player.draws === "number" ? player.draws : 0,
        winStreak: typeof player.winStreak === "number" ? player.winStreak : 0,
        gamesPlayed: typeof player.gamesPlayed === "number" ? player.gamesPlayed : 0,
        createdAt: 0,
        updatedAt: 0,
      }));
    } catch (err) {
      console.warn("Error fetching public leaderboard:", err);
      return [];
    }
  }`;
auth = auth.slice(0, methodStart) + newMethod + auth.slice(methodEnd);
write("src/lib/auth-manager.ts", auth);

const vercel = JSON.parse(repoFile("vercel.json"));
vercel.rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
if (!vercel.rewrites.some((r) => r?.source === "/api/leaderboard")) {
  const rewrite = {
    source: "/api/leaderboard",
    destination: "https://ouk-khmer-backend-production.up.railway.app/api/leaderboard",
  };
  const onlineIndex = vercel.rewrites.findIndex((r) => r?.source === "/api/online-count");
  if (onlineIndex >= 0) vercel.rewrites.splice(onlineIndex + 1, 0, rewrite);
  else vercel.rewrites.unshift(rewrite);
}
write("vercel.json", JSON.stringify(vercel, null, 2) + "\n");

let security = repoFile("scripts/test-security.ts");
if (!security.includes('from "../server/public-leaderboard"')) {
  const anchor = 'import { ServerLogger } from "../server/logger";';
  security = security.replace(
    anchor,
    anchor + '\nimport { sanitizePublicLeaderboardDocument } from "../server/public-leaderboard";\nimport fs from "node:fs";',
  );
}
if (!security.includes("function testPublicLeaderboardPrivacy()")) {
  const testBlock = `function testPublicLeaderboardPrivacy() {
  const publicEntry = sanitizePublicLeaderboardDocument(
    "projects/p/databases/d/documents/users/uid-private",
    {
      displayName: { stringValue: "Dara" },
      photoURL: { stringValue: "https://example.com/avatar.png" },
      rating: { integerValue: "1510" },
      peakRating: { integerValue: "1560" },
      wins: { integerValue: "9" },
      losses: { integerValue: "3" },
      draws: { integerValue: "2" },
      winStreak: { integerValue: "4" },
      gamesPlayed: { integerValue: "14" },
      email: { stringValue: "private@example.com" },
      emailVerified: { booleanValue: true },
      providerId: { stringValue: "google.com" },
      serverCreatedAt: { timestampValue: "2026-09-04T00:00:00Z" },
    },
  );
  assert.equal(publicEntry.uid, "uid-private");
  assert.equal(publicEntry.displayName, "Dara");
  assert.equal(publicEntry.rating, 1510);
  for (const privateKey of ["email", "emailVerified", "providerId", "serverCreatedAt"]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(publicEntry, privateKey),
      false,
      \`${privateKey} must never appear in the public leaderboard shape\`,
    );
  }

  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.ok(rules.includes("allow read: if isOwner(userId);"));
  assert.ok(!rules.includes("allow read: if true;"), "users collection must not be public-readable");
}

`;
  security = security.replace("function main() {", testBlock + "function main() {");
  security = security.replace(
    "  testMatchmakingCannotSelfMatchByUid();\n",
    "  testMatchmakingCannotSelfMatchByUid();\n  testPublicLeaderboardPrivacy();\n",
  );
}
write("scripts/test-security.ts", security);

console.log("one-time security finish patch applied");
