import { Color } from "../src/lib/khmer-chess";
import { GameState } from "./game-types";

export type PlayerColor = "w" | "b";

export type RoomType = "random" | "private";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface PlayerInfo {
  socketId: string;
  sessionToken?: string;
  uid?: string;
  name: string;
  photoURL?: string | null;
  emailVerified?: boolean;
  color: PlayerColor;
  joinedAt: number;
  connected?: boolean;
  disconnectedAt?: number | null;
  isBot?: boolean;
  rating?: number;
}

export type OnlineGameMode = "folk" | "international" | "blitz";

export interface Room {
  id: string;
  type: RoomType;
  pin?: string; // 6-digit PIN for private rooms
  status: RoomStatus;
  rulesetId: "folk" | "international";
  timeControl?: {
    type: "standard" | "blitz" | "custom";
    initialSeconds: number;
  };
  timerHandle?: NodeJS.Timeout | null;
  drawOfferedBy?: PlayerColor | null;
  rematchRequestedBy?: Set<PlayerColor>;
  players: {
    w: PlayerInfo | null;
    b: PlayerInfo | null;
  };
  gameState?: GameState;
  createdAt: number;
  isBotRoom?: boolean;
  botTurnTimer?: NodeJS.Timeout | null;
}

export interface MatchmakingPlayer {
  socketId: string;
  uid?: string;
  name: string;
  photoURL?: string | null;
  rulesetId: "folk" | "international";
  mode?: OnlineGameMode;
  timeControl?: {
    type: "standard" | "blitz" | "custom";
    initialSeconds: number;
  };
  joinedAt: number;
  isBot?: boolean;
  rating?: number;
}
