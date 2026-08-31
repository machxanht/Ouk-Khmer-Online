import { MatchmakingPlayer, OnlineGameMode } from "./room-types";
import { serverLogger } from "./logger";

export class MatchmakingManager {
  private queue: MatchmakingPlayer[] = [];

  /**
   * Add a player to matchmaking queue.
   * If a compatible player with the same mode is available, pairs them immediately.
   */
  public joinQueue(
    socketId: string,
    name: string = "Player",
    rulesetId: "folk" | "international" = "folk",
    timeControlOption?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
    modeOption?: OnlineGameMode,
    authMeta?: { uid?: string; photoURL?: string | null; emailVerified?: boolean },
  ):
    | { matched: false; queueSize: number }
    | {
        matched: true;
        p1: MatchmakingPlayer;
        p2: MatchmakingPlayer;
        rulesetId: "folk" | "international";
        timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds: number };
      } {
    // Resolve mode
    const mode: OnlineGameMode =
      modeOption ||
      (timeControlOption?.type === "blitz" || timeControlOption?.initialSeconds === 300
        ? "blitz"
        : rulesetId === "international"
          ? "international"
          : "folk");

    const resolvedRulesetId: "folk" | "international" = mode === "folk" ? "folk" : "international";

    const resolvedTimeControl =
      mode === "blitz"
        ? { type: "blitz" as const, initialSeconds: 300 }
        : { type: "standard" as const, initialSeconds: 3600 };

    // 1. Prevent duplicate socket queuing
    const existingIndex = this.queue.findIndex((p) => p.socketId === socketId);
    if (existingIndex !== -1) {
      serverLogger.info("MATCHMAKING_JOIN", {
        socketId,
        playerName: name,
        details: { mode, duplicate: true },
      });
      return {
        matched: false,
        queueSize: this.queue.filter((p) => (p.mode || p.rulesetId) === mode).length,
      };
    }

    // 2. Look for an existing opponent waiting with the same mode
    const opponentIndex = this.queue.findIndex(
      (p) =>
        (p.mode || (p.rulesetId === "international" ? "international" : "folk")) === mode &&
        p.socketId !== socketId,
    );

    if (opponentIndex !== -1) {
      const p1 = this.queue.splice(opponentIndex, 1)[0];
      const p2: MatchmakingPlayer = {
        socketId,
        uid: authMeta?.uid,
        name: name.trim() || "Player",
        photoURL: authMeta?.photoURL,
        rulesetId: resolvedRulesetId,
        mode,
        timeControl: resolvedTimeControl,
        joinedAt: Date.now(),
      };

      serverLogger.info("MATCHMAKING_MATCHED", {
        details: {
          mode,
          player1: { socketId: p1.socketId, name: p1.name, uid: p1.uid },
          player2: { socketId: p2.socketId, name: p2.name, uid: p2.uid },
        },
      });

      return {
        matched: true,
        p1,
        p2,
        rulesetId: resolvedRulesetId,
        timeControl: resolvedTimeControl,
      };
    }

    // 3. If no match yet, add player to queue
    const player: MatchmakingPlayer = {
      socketId,
      uid: authMeta?.uid,
      name: name.trim() || "Player",
      photoURL: authMeta?.photoURL,
      rulesetId: resolvedRulesetId,
      mode,
      timeControl: resolvedTimeControl,
      joinedAt: Date.now(),
    };
    this.queue.push(player);

    const qSize = this.queue.filter((p) => (p.mode || p.rulesetId) === mode).length;

    serverLogger.info("MATCHMAKING_JOIN", {
      socketId,
      playerName: player.name,
      details: { mode, queueSize: qSize },
    });

    return {
      matched: false,
      queueSize: qSize,
    };
  }

  /**
   * Remove a player from queue.
   */
  public leaveQueue(socketId: string): boolean {
    const index = this.queue.findIndex((p) => p.socketId === socketId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      serverLogger.info("MATCHMAKING_LEAVE", {
        socketId,
        playerName: removed.name,
        details: { mode: removed.mode },
      });
      return true;
    }
    return false;
  }

  public isInQueue(socketId: string): boolean {
    return this.queue.some((p) => p.socketId === socketId);
  }

  public getQueueSize(target?: "folk" | "international" | OnlineGameMode): number {
    if (target) {
      return this.queue.filter((p) => (p.mode || p.rulesetId) === target).length;
    }
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }
}

export const matchmakingManager = new MatchmakingManager();
