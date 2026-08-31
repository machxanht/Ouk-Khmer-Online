export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogEvent =
  | "MATCHMAKING_JOIN"
  | "MATCHMAKING_LEAVE"
  | "MATCHMAKING_MATCH"
  | "MATCHMAKING_MATCHED"
  | "ROOM_CREATE"
  | "ROOM_JOIN"
  | "GAME_START"
  | "MOVE_ACCEPTED"
  | "MOVE_REJECTED"
  | "TIMEOUT"
  | "AFK_STRIKE"
  | "DISCONNECT"
  | "RECONNECT"
  | "DRAW_OFFER"
  | "DRAW_ACCEPT"
  | "DRAW_DECLINE"
  | "RESIGN"
  | "REMATCH_REQUEST"
  | "REMATCH_OFFER"
  | "REMATCH_START"
  | "REMATCH_DECLINE"
  | "GAME_OVER"
  | "ROOM_CLEANUP"
  | "PLAYER_LEFT"
  | "SOCKET_CONNECT"
  | "TEST_SANITIZE"
  | "BULK_TEST"
  | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: LogEvent;
  roomId?: string;
  socketId?: string;
  color?: "w" | "b";
  playerName?: string;
  details?: Record<string, unknown>;
}

export class ServerLogger {
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize: number = 2000;
  private enabled: boolean = true;
  private minLevel: LogLevel = "INFO";

  private readonly levelWeights: Record<LogLevel, number> = {
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
  };

  constructor(options?: { maxBufferSize?: number; minLevel?: LogLevel; enabled?: boolean }) {
    if (options?.maxBufferSize) this.maxBufferSize = options.maxBufferSize;
    if (options?.minLevel) this.minLevel = options.minLevel;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return this.levelWeights[level] >= this.levelWeights[this.minLevel];
  }

  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(details)) {
      if (
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("key")
      ) {
        sanitized[key] = typeof val === "string" ? `${val.slice(0, 4)}***` : "[REDACTED]";
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  public log(
    level: LogLevel,
    event: LogEvent,
    data: Omit<LogEntry, "timestamp" | "level" | "event">,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      roomId: data.roomId,
      socketId: data.socketId,
      color: data.color,
      playerName: data.playerName,
      details: this.sanitizeDetails(data.details),
    };

    // Store in circular buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Output to stdout / stderr if level matches
    if (this.shouldLog(level)) {
      const roomTag = entry.roomId ? ` [${entry.roomId}]` : "";
      const socketTag = entry.socketId ? ` [${entry.socketId.slice(0, 8)}]` : "";
      const colorTag = entry.color ? ` [${entry.color.toUpperCase()}]` : "";
      const detailsStr =
        entry.details && Object.keys(entry.details).length > 0
          ? ` ${JSON.stringify(entry.details)}`
          : "";

      const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.event}]${roomTag}${socketTag}${colorTag}${detailsStr}`;

      if (level === "ERROR") {
        console.error(formatted);
      } else if (level === "WARN") {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }

    return entry;
  }

  public info(event: LogEvent, data: Omit<LogEntry, "timestamp" | "level" | "event">): LogEntry {
    return this.log("INFO", event, data);
  }

  public warn(event: LogEvent, data: Omit<LogEntry, "timestamp" | "level" | "event">): LogEntry {
    return this.log("WARN", event, data);
  }

  public error(event: LogEvent, data: Omit<LogEntry, "timestamp" | "level" | "event">): LogEntry {
    return this.log("ERROR", event, data);
  }

  public debug(event: LogEvent, data: Omit<LogEntry, "timestamp" | "level" | "event">): LogEntry {
    return this.log("DEBUG", event, data);
  }

  /**
   * Retrieves the full chronological event trace for a specific room.
   */
  public getRoomTrace(roomId: string): LogEntry[] {
    return this.logBuffer.filter((e) => e.roomId === roomId);
  }

  public getLogsByRoom(roomId: string): LogEntry[] {
    return this.getRoomTrace(roomId);
  }

  /**
   * Retrieves log entries, optionally filtered by event.
   */
  public getLogs(event?: LogEvent): LogEntry[] {
    if (event) {
      return this.logBuffer.filter((e) => e.event === event);
    }
    return [...this.logBuffer];
  }

  /**
   * Retrieves the most recent log entries.
   */
  public getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logBuffer.slice(-limit);
  }

  /**
   * Clears the log buffer (useful for testing).
   */
  public clear(): void {
    this.logBuffer = [];
  }
}

export const serverLogger = new ServerLogger();
