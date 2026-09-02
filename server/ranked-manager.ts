import crypto from "crypto";
import type { Color } from "../src/lib/khmer-chess";
import type { Room } from "./room-types";
import { serverLogger } from "./logger";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface PlayerStats {
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  gamesPlayed: number;
}

interface EloResult {
  oldRating: number;
  newRating: number;
  delta: number;
}

const DEFAULT_RATING = 1200;
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function firestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function calculateElo(
  playerRating: number,
  opponentRating: number,
  score: 0 | 0.5 | 1,
  gamesPlayed: number,
): EloResult {
  const expected = calculateExpectedScore(playerRating, opponentRating);
  let kFactor = 32;
  if (gamesPlayed < 30) kFactor = 40;
  else if (playerRating > 2000) kFactor = 24;
  const delta = Math.round(kFactor * (score - expected));
  const newRating = Math.max(100, playerRating + delta);
  return { oldRating: playerRating, newRating, delta: newRating - playerRating };
}

class RankedManager {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private locks = new Map<string, Promise<void>>();

  private getServiceAccount(): ServiceAccount | null {
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

  private async getAccessToken(account: ServiceAccount): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

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

    if (!response.ok) {
      throw new Error(`Google OAuth token request failed (${response.status})`);
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error("Google OAuth response missing access_token");

    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return data.access_token;
  }

  private parseStats(fields: Record<string, any> | undefined): PlayerStats {
    const int = (key: string, fallback: number) => {
      const raw = fields?.[key]?.integerValue ?? fields?.[key]?.doubleValue;
      const value = Number(raw);
      return Number.isFinite(value) ? value : fallback;
    };
    const rating = int("rating", DEFAULT_RATING);
    return {
      rating,
      peakRating: int("peakRating", rating),
      wins: int("wins", 0),
      losses: int("losses", 0),
      draws: int("draws", 0),
      winStreak: int("winStreak", 0),
      gamesPlayed: int("gamesPlayed", 0),
    };
  }

  private async readUser(
    projectId: string,
    token: string,
    uid: string,
  ): Promise<{ stats: PlayerStats; fields: Record<string, any> }> {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404) return { stats: this.parseStats(undefined), fields: {} };
    if (!response.ok) throw new Error(`Firestore user read failed (${response.status})`);
    const doc = (await response.json()) as { fields?: Record<string, any> };
    return { stats: this.parseStats(doc.fields), fields: doc.fields || {} };
  }

  private buildUpdatedStats(
    current: PlayerStats,
    outcome: "win" | "loss" | "draw",
    elo: EloResult,
  ): PlayerStats {
    return {
      rating: elo.newRating,
      peakRating: Math.max(current.peakRating, elo.newRating),
      wins: current.wins + (outcome === "win" ? 1 : 0),
      losses: current.losses + (outcome === "loss" ? 1 : 0),
      draws: current.draws + (outcome === "draw" ? 1 : 0),
      winStreak: outcome === "win" ? current.winStreak + 1 : outcome === "loss" ? 0 : current.winStreak,
      gamesPlayed: current.gamesPlayed + 1,
    };
  }

  private async persistResult(
    account: ServiceAccount,
    room: Room,
    winner: Color | "draw",
    reason: string,
  ): Promise<void> {
    if (room.isBotRoom) return;

    const white = room.players.w;
    const black = room.players.b;
    if (!white?.uid || !black?.uid) return;

    const token = await this.getAccessToken(account);
    const [whiteDoc, blackDoc] = await Promise.all([
      this.readUser(account.project_id, token, white.uid),
      this.readUser(account.project_id, token, black.uid),
    ]);

    const whiteScore: 0 | 0.5 | 1 = winner === "draw" ? 0.5 : winner === "w" ? 1 : 0;
    const blackScore: 0 | 0.5 | 1 = winner === "draw" ? 0.5 : winner === "b" ? 1 : 0;
    const whiteOutcome = winner === "draw" ? "draw" : winner === "w" ? "win" : "loss";
    const blackOutcome = winner === "draw" ? "draw" : winner === "b" ? "win" : "loss";

    const whiteElo = calculateElo(
      whiteDoc.stats.rating,
      blackDoc.stats.rating,
      whiteScore,
      whiteDoc.stats.gamesPlayed,
    );
    const blackElo = calculateElo(
      blackDoc.stats.rating,
      whiteDoc.stats.rating,
      blackScore,
      blackDoc.stats.gamesPlayed,
    );

    const whiteNext = this.buildUpdatedStats(whiteDoc.stats, whiteOutcome, whiteElo);
    const blackNext = this.buildUpdatedStats(blackDoc.stats, blackOutcome, blackElo);
    const now = Date.now();
    const matchId = `${room.id}_${now}`;
    const base = `projects/${account.project_id}/databases/(default)/documents`;

    const statsFields = (stats: PlayerStats) => ({
      rating: firestoreValue(stats.rating),
      peakRating: firestoreValue(stats.peakRating),
      wins: firestoreValue(stats.wins),
      losses: firestoreValue(stats.losses),
      draws: firestoreValue(stats.draws),
      winStreak: firestoreValue(stats.winStreak),
      gamesPlayed: firestoreValue(stats.gamesPlayed),
      serverUpdatedAtMs: firestoreValue(now),
    });

    const writes = [
      {
        update: {
          name: `${base}/users/${white.uid}`,
          fields: { ...whiteDoc.fields, ...statsFields(whiteNext) },
        },
      },
      {
        update: {
          name: `${base}/users/${black.uid}`,
          fields: { ...blackDoc.fields, ...statsFields(blackNext) },
        },
      },
      {
        update: {
          name: `${base}/match_history/${matchId}`,
          fields: {
            roomId: firestoreValue(room.id),
            whiteUid: firestoreValue(white.uid),
            blackUid: firestoreValue(black.uid),
            whiteName: firestoreValue(white.name),
            blackName: firestoreValue(black.name),
            winner: firestoreValue(winner),
            reason: firestoreValue(reason),
            rulesetId: firestoreValue(room.rulesetId),
            startedAt: firestoreValue(room.gameState?.startedAt || room.createdAt),
            finishedAt: firestoreValue(now),
            moveCount: firestoreValue(room.gameState?.moveCount || 0),
            whiteRatingBefore: firestoreValue(whiteElo.oldRating),
            whiteRatingAfter: firestoreValue(whiteElo.newRating),
            whiteRatingDelta: firestoreValue(whiteElo.delta),
            blackRatingBefore: firestoreValue(blackElo.oldRating),
            blackRatingAfter: firestoreValue(blackElo.newRating),
            blackRatingDelta: firestoreValue(blackElo.delta),
          },
        },
      },
    ];

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/databases/(default)/documents:commit`;
    const response = await fetch(commitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    });

    if (!response.ok) {
      throw new Error(`Firestore authoritative rank commit failed (${response.status})`);
    }

    serverLogger.info("GAME_OVER", {
      roomId: room.id,
      details: {
        rankedPersisted: true,
        whiteUid: white.uid,
        blackUid: black.uid,
        whiteRating: whiteNext.rating,
        blackRating: blackNext.rating,
      },
    });
  }

  public async finalize(
    room: Room,
    winner: Color | "draw",
    reason: string,
  ): Promise<void> {
    const account = this.getServiceAccount();
    if (!account) {
      serverLogger.warn("ERROR", {
        roomId: room.id,
        details: {
          message: "Rank persistence skipped: FIREBASE_SERVICE_ACCOUNT_JSON is not configured",
        },
      });
      return;
    }

    const uids = [room.players.w?.uid, room.players.b?.uid].filter(Boolean).sort().join(":");
    if (!uids || room.isBotRoom) return;

    const previous = this.locks.get(uids) || Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => this.persistResult(account, room, winner, reason))
      .catch((err) => {
        serverLogger.error("ERROR", {
          roomId: room.id,
          details: { message: "Authoritative rank persistence failed", error: String(err) },
        });
      })
      .finally(() => {
        if (this.locks.get(uids) === current) this.locks.delete(uids);
      });

    this.locks.set(uids, current);
    await current;
  }
}

export const rankedManager = new RankedManager();
