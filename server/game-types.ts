import {
  Board,
  Color,
  CountingState,
  GameResult,
  OukRuleSet,
  Piece,
  PieceType,
  Status,
} from "../src/lib/khmer-chess";

export type GameErrorCode =
  | "NOT_IN_ROOM"
  | "GAME_NOT_READY"
  | "NOT_YOUR_TURN"
  | "INVALID_MOVE"
  | "GAME_ALREADY_FINISHED"
  | "MALFORMED_MOVE"
  | "TIME_OUT";

export interface GameErrorPayload {
  code: GameErrorCode;
  message: string;
}

export interface MoveRequestPayload {
  from: unknown;
  to: unknown;
}

export interface MoveRecord {
  from: number;
  to: number;
  color: Color;
  piece: PieceType;
  captured?: PieceType | null;
}

export interface GameState {
  board: Board;
  turn: Color;
  moveHistory: MoveRecord[];
  moveCount: number;
  status: Status;
  isCheck: boolean;
  result: GameResult | null;
  countingState: CountingState;
  rulesetId: "folk" | "international";
  startedAt: number;
  lastMoveAt?: number;
  clocks: {
    w: number;
    b: number;
  };
  lastTurnTimestamp: number;
  timeControl: {
    type: "standard" | "blitz" | "custom";
    initialSeconds: number;
  };
  afkStrikes: {
    w: number;
    b: number;
  };
  afkEnabled: boolean;
  lastMove?: {
    from: number;
    to: number;
    color: Color;
    piece: PieceType;
    captured?: Piece | null;
  };
}

export interface GameStartedPayload {
  roomId: string;
  roomPin?: string;
  board: Board;
  turn: Color;
  status: Status;
  isCheck?: boolean;
  countingState: CountingState;
  rulesetId: "folk" | "international";
  clocks: {
    w: number;
    b: number;
  };
  lastTurnTimestamp: number;
  afkStrikes?: {
    w: number;
    b: number;
  };
  afkEnabled?: boolean;
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
  clocks: {
    w: number;
    b: number;
  };
  lastTurnTimestamp: number;
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
