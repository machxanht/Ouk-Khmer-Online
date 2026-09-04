import crypto from "crypto";

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
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), account.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status})`);

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
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    account.project_id,
  )}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
  if (!response.ok) throw new Error(`Firestore leaderboard query failed (${response.status})`);

  const rows = (await response.json()) as Array<{
    document?: { name?: string; fields?: Record<string, any> };
  }>;
  return rows
    .map((row) => row.document)
    .filter((doc): doc is { name: string; fields?: Record<string, any> } => Boolean(doc?.name))
    .map((doc) => sanitizePublicLeaderboardDocument(doc.name, doc.fields));
}
