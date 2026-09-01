import { Board, Color, CountingState, GameResult, Piece, Status } from "./khmer-chess";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type MatchStatus = "idle" | "searching" | "waiting" | "playing" | "finished";

export type OnlineGameMode = "folk" | "international" | "blitz";

export interface OnlinePlayer {
  id: string;
  sessionToken?: string;
  name: string;
  color: Color | null;
}

export interface OnlineRoom {
  id: string;
  pin?: string;
  type: "random" | "private";
  rulesetId?: string;
}

export interface OnlineGameState {
  board: Board;
  turn: Color;
  status: Status;
  isCheck: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  countingState: CountingState;
  rulesetId: string;
  moveCount: number;
  clocks?: {
    w: number;
    b: number;
  };
  lastTurnTimestamp?: number;
  afkStrikes?: {
    w: number;
    b: number;
  };
  afkEnabled?: boolean;
  lastMove?: {
    from: number;
    to: number;
    color: Color;
  };
  opponentConnected?: boolean;
  winner?: Color | "draw" | null;
  reason?: string | null;
  endReason?: string | null;
  result?: GameResult | null;
}

export interface GameStartPayload {
  roomId: string;
  pin?: string;
  sessionToken?: string;
  color: Color;
  opponent: {
    name: string;
    uid?: string;
    photoURL?: string | null;
    connected?: boolean;
    rating?: number;
    isBot?: boolean;
  };
  board: Board;
  turn: Color;
  status: Status;
  isCheck: boolean;
  countingState: CountingState;
  rulesetId: string;
  clocks?: {
    w: number;
    b: number;
  };
  lastTurnTimestamp?: number;
  afkStrikes?: {
    w: number;
    b: number;
  };
  afkEnabled?: boolean;
}

export interface GameReconnectedPayload {
  roomId: string;
  pin?: string;
  sessionToken?: string;
  color: Color;
  opponent: {
    name: string;
    uid?: string;
    photoURL?: string | null;
    connected?: boolean;
    rating?: number;
    isBot?: boolean;
  };
  board: Board;
  turn: Color;
  status: Status;
  isCheck: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  moveCount?: number;
  countingState: CountingState;
  rulesetId: string;
  clocks?: {
    w: number;
    b: number;
  };
  lastTurnTimestamp?: number;
  afkStrikes?: {
    w: number;
    b: number;
  };
  afkEnabled?: boolean;
  lastMove?: {
    from: number;
    to: number;
    color: Color;
  };
}

export interface PlayerStatusPayload {
  color: Color;
  connected: boolean;
  message?: string;
}

export interface GameMovedPayload {
  roomId: string;
  from: number;
  to: number;
  color: Color;
  board: Board;
  turn: Color;
  status: Status;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  moveNumber: number;
  captured: Piece | null;
  result: GameResult | null;
  countingState: CountingState;
  clocks?: {
    w: number;
    b: number;
  };
  lastTurnTimestamp?: number;
  afkStrikes?: {
    w: number;
    b: number;
  };
  afkEnabled?: boolean;
}

export interface GameTurnSkippedPayload {
  roomId: string;
  turn: Color;
  skippedColor: Color;
  afkStrikes: {
    w: number;
    b: number;
  };
  clocks: {
    w: number;
    b: number;
  };
  lastTurnTimestamp: number;
  reason: "afk_skip";
}

export interface GameOverPayload {
  winner: Color | "draw";
  reason: string;
  result?: GameResult | null;
}

export interface DrawOfferedPayload {
  fromColor: Color;
}

export interface RematchOfferedPayload {
  fromColor: Color;
}

export interface ChatMessagePayload {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: Color | null;
  text: string;
  timestamp: number;
}
