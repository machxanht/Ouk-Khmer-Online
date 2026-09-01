import { useCallback, useEffect, useRef, useState } from "react";
import { onlineClient } from "../lib/online-client";
import { authManager } from "../lib/auth-manager";
import {
  ChatMessagePayload,
  ConnectionStatus,
  DrawOfferedPayload,
  GameMovedPayload,
  GameOverPayload,
  GameReconnectedPayload,
  GameStartPayload,
  GameTurnSkippedPayload,
  MatchStatus,
  OnlineGameMode,
  OnlineGameState,
  OnlinePlayer,
  OnlineRoom,
  PlayerStatusPayload,
  RematchOfferedPayload,
} from "../lib/online-types";
import { Color } from "../lib/khmer-chess";

interface StoredMatchSession {
  roomId: string;
  sessionToken?: string;
  color?: Color;
  name: string;
}

const SESSION_STORAGE_KEY = "ouk_online_active_session";

function saveSession(session: StoredMatchSession) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

function loadSession(): StoredMatchSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function useSimpleOnlineGame(defaultPlayerName: string = "Người chơi") {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [player, setPlayer] = useState<OnlinePlayer>({
    id: "",
    name: defaultPlayerName,
    color: null,
  });
  const [opponent, setOpponent] = useState<{
    name: string;
    uid?: string;
    photoURL?: string | null;
    connected?: boolean;
  } | null>(null);
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [gameState, setGameState] = useState<OnlineGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);

  // Draw Offer State
  const [drawOfferSent, setDrawOfferSent] = useState<boolean>(false);
  const [drawOfferReceived, setDrawOfferReceived] = useState<boolean>(false);
  const [drawDeclinedNotice, setDrawDeclinedNotice] = useState<boolean>(false);

  // Rematch State
  const [rematchOfferSent, setRematchOfferSent] = useState<boolean>(false);
  const [rematchOfferReceived, setRematchOfferReceived] = useState<boolean>(false);
  const [rematchDeclinedNotice, setRematchDeclinedNotice] = useState<boolean>(false);

  // Opponent connection notice
  const [opponentNotice, setOpponentNotice] = useState<string | null>(null);

  const matchStatusRef = useRef<MatchStatus>(matchStatus);
  matchStatusRef.current = matchStatus;

  const roomRef = useRef<OnlineRoom | null>(room);
  roomRef.current = room;

  // Initialize socket listeners & session resume
  useEffect(() => {
    const socket = onlineClient.connect();

    if (socket.connected) {
      setConnectionStatus("connected");
      setPlayer((p) => ({ ...p, id: socket.id || "" }));
    }

    const unsubConnect = onlineClient.on("connect", () => {
      setConnectionStatus("connected");
      setPlayer((p) => ({ ...p, id: onlineClient.getSocketId() || "" }));
      setError(null);

      // Auto-reconnect if session exists
      const saved = loadSession();
      if (saved && saved.roomId) {
        onlineClient.reconnectGame(saved.roomId, saved.sessionToken, saved.color);
      }
    });

    const unsubDisconnect = onlineClient.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    const unsubConnectError = onlineClient.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    const unsubSearching = onlineClient.on("matchmaking:searching", (data) => {
      setMatchStatus("searching");
      setQueueSize(data.queueSize);
      setError(null);
    });

    const unsubLeft = onlineClient.on("matchmaking:left", () => {
      setMatchStatus("idle");
      setQueueSize(0);
    });

    const unsubCreated = onlineClient.on("room:created", (data) => {
      setMatchStatus("waiting");
      setRoom({
        id: data.roomId,
        pin: data.pin,
        type: "private",
      });
      setPlayer((p) => ({ ...p, color: "w" }));
      setError(null);
    });

    const unsubRoomError = onlineClient.on("room:error", (data) => {
      setError(data.message);
    });

    const unsubStart = onlineClient.on("game:start", (data: GameStartPayload) => {
      setMatchStatus("playing");
      setRoom({
        id: data.roomId,
        pin: data.pin,
        type: data.pin ? "private" : "random",
      });
      setPlayer((p) => ({ ...p, color: data.color }));
      setOpponent(data.opponent);
      setGameState({
        board: data.board,
        turn: data.turn,
        status: data.status,
        isCheck: data.isCheck,
        countingState: data.countingState,
        rulesetId: data.rulesetId,
        clocks: data.clocks,
        lastTurnTimestamp: data.lastTurnTimestamp,
        afkStrikes: data.afkStrikes,
        afkEnabled: data.afkEnabled,
        moveCount: 0,
      });
      setMessages([]);
      setDrawOfferSent(false);
      setDrawOfferReceived(false);
      setDrawDeclinedNotice(false);
      setRematchOfferSent(false);
      setRematchOfferReceived(false);
      setRematchDeclinedNotice(false);
      setOpponentNotice(null);
      setError(null);

      // Persist active match session for device resume
      saveSession({
        roomId: data.roomId,
        sessionToken: data.sessionToken,
        color: data.color,
        name: player.name,
      });
    });

    const unsubReconnected = onlineClient.on("game:reconnected", (data: GameReconnectedPayload) => {
      setMatchStatus("playing");
      setRoom({
        id: data.roomId,
        pin: data.pin,
        type: data.pin ? "private" : "random",
      });
      setPlayer((p) => ({ ...p, color: data.color }));
      setOpponent(data.opponent);
      setGameState({
        board: data.board,
        turn: data.turn,
        status: data.status,
        isCheck: data.isCheck,
        countingState: data.countingState,
        rulesetId: data.rulesetId,
        clocks: data.clocks,
        lastTurnTimestamp: data.lastTurnTimestamp,
        afkStrikes: data.afkStrikes,
        afkEnabled: data.afkEnabled,
        lastMove: data.lastMove,
      });
      setOpponentNotice(null);
      setError(null);

      saveSession({
        roomId: data.roomId,
        sessionToken: data.sessionToken,
        color: data.color,
        name: player.name,
      });
    });

    const unsubPlayerStatus = onlineClient.on("player:status", (data: PlayerStatusPayload) => {
      setOpponent((prev) => (prev ? { ...prev, connected: data.connected } : prev));
      if (!data.connected) {
        setOpponentNotice(data.message || "Đối thủ đang kết nối lại...");
      } else {
        setOpponentNotice(null);
      }
    });

    const unsubMoved = onlineClient.on("game:moved", (data: GameMovedPayload) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          board: data.board,
          turn: data.turn,
          status: data.status,
          isCheck: data.isCheck,
          isCheckmate: data.isCheckmate,
          isStalemate: data.isStalemate,
          countingState: data.countingState,
          moveCount: data.moveNumber,
          clocks: data.clocks ?? prev.clocks,
          lastTurnTimestamp: data.lastTurnTimestamp ?? prev.lastTurnTimestamp,
          afkStrikes: data.afkStrikes ?? prev.afkStrikes,
          afkEnabled: data.afkEnabled ?? prev.afkEnabled,
          lastMove: {
            from: data.from,
            to: data.to,
            color: data.color,
          },
          result: data.result,
        };
      });
      setError(null);
    });

    const unsubTurnSkipped = onlineClient.on(
      "game:turn_skipped",
      (data: GameTurnSkippedPayload) => {
        setGameState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            turn: data.turn,
            afkStrikes: data.afkStrikes,
            clocks: data.clocks ?? prev.clocks,
            lastTurnTimestamp: data.lastTurnTimestamp ?? prev.lastTurnTimestamp,
          };
        });
        setError(null);
      },
    );

    const unsubGameError = onlineClient.on("game:error", (data) => {
      if (data.code === "RECONNECT_FAILED") {
        clearSession();
      }
      setError(data.message);
    });

    const unsubGameOver = onlineClient.on("game:over", (data: GameOverPayload) => {
      setMatchStatus("finished");
      clearSession();
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          winner: data.winner,
          reason: data.reason,
          endReason: data.reason,
          result: data.result,
        };
      });
      setDrawOfferSent(false);
      setDrawOfferReceived(false);
      setOpponentNotice(null);

      // Record ELO & match stats for online game
      if (playerColor) {
        const isWin = data.winner === playerColor;
        const isDraw = data.winner === "draw";
        const outcome = isWin ? "win" : isDraw ? "draw" : "loss";
        const opponentRating = opponent?.rating || 1200;
        authManager.recordOnlineMatchResult(outcome, opponentRating).catch((err) => {
          console.warn("Failed to record online match ELO:", err);
        });
      }
    });

    const unsubDrawOffered = onlineClient.on("game:draw_offered", (_data: DrawOfferedPayload) => {
      setDrawOfferReceived(true);
    });

    const unsubDrawDeclined = onlineClient.on("game:draw_declined", () => {
      setDrawOfferSent(false);
      setDrawDeclinedNotice(true);
      setTimeout(() => setDrawDeclinedNotice(false), 4000);
    });

    const unsubRematchOffered = onlineClient.on(
      "game:rematch_offered",
      (_data: RematchOfferedPayload) => {
        setRematchOfferReceived(true);
      },
    );

    const unsubRematchDeclined = onlineClient.on("game:rematch_declined", () => {
      setRematchOfferSent(false);
      setRematchDeclinedNotice(true);
      setTimeout(() => setRematchDeclinedNotice(false), 4000);
    });

    const unsubPlayerLeft = onlineClient.on("player:left", (data) => {
      setError(data.message);
    });

    const unsubChatMessage = onlineClient.on("chat:message", (data: ChatMessagePayload) => {
      setMessages((prev) => [...prev, data]);
    });

    // Page visibility / unlock / resume handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const saved = loadSession();
        if (saved && saved.roomId) {
          onlineClient.connect();
          onlineClient.reconnectGame(saved.roomId, saved.sessionToken, saved.color);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubConnect();
      unsubDisconnect();
      unsubConnectError();
      unsubSearching();
      unsubLeft();
      unsubCreated();
      unsubRoomError();
      unsubStart();
      unsubReconnected();
      unsubPlayerStatus();
      unsubMoved();
      unsubTurnSkipped();
      unsubGameError();
      unsubGameOver();
      unsubDrawOffered();
      unsubDrawDeclined();
      unsubRematchOffered();
      unsubRematchDeclined();
      unsubPlayerLeft();
      unsubChatMessage();
    };
  }, []);

  const startMatchmaking = useCallback(
    async (
      name?: string,
      rulesetId: "folk" | "international" = "folk",
      mode?: OnlineGameMode,
      timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
    ) => {
      const playerName = name || player.name;
      setPlayer((p) => ({ ...p, name: playerName }));
      setError(null);
      setMatchStatus("searching");
      const token = await authManager.getIdToken().catch(() => undefined);
      onlineClient.joinMatchmaking(playerName, rulesetId, mode, timeControl, token);
    },
    [player.name],
  );

  const cancelMatchmaking = useCallback(() => {
    onlineClient.leaveMatchmaking();
    setMatchStatus("idle");
    setQueueSize(0);
  }, []);

  const createPrivateRoom = useCallback(
    async (
      name?: string,
      rulesetId: "folk" | "international" = "folk",
      mode?: OnlineGameMode,
      timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
    ) => {
      const playerName = name || player.name;
      setPlayer((p) => ({ ...p, name: playerName }));
      setError(null);
      setMatchStatus("waiting");
      const token = await authManager.getIdToken().catch(() => undefined);
      onlineClient.createPrivateRoom(playerName, rulesetId, mode, timeControl, token);
    },
    [player.name],
  );

  const joinPrivateRoom = useCallback(
    async (pin: string, name?: string) => {
      const playerName = name || player.name;
      setPlayer((p) => ({ ...p, name: playerName }));
      setError(null);
      const token = await authManager.getIdToken().catch(() => undefined);
      onlineClient.joinPrivateRoom(pin, playerName, token);
    },
    [player.name],
  );

  const makeMove = useCallback((from: number, to: number) => {
    setError(null);
    onlineClient.sendMove(from, to);
  }, []);

  const resign = useCallback(() => {
    clearSession();
    onlineClient.resign();
  }, []);

  const offerDraw = useCallback(() => {
    setDrawOfferSent(true);
    onlineClient.offerDraw();
  }, []);

  const acceptDraw = useCallback(() => {
    setDrawOfferReceived(false);
    onlineClient.acceptDraw();
  }, []);

  const declineDraw = useCallback(() => {
    setDrawOfferReceived(false);
    onlineClient.declineDraw();
  }, []);

  const requestRematch = useCallback(() => {
    setRematchOfferSent(true);
    onlineClient.requestRematch();
  }, []);

  const declineRematch = useCallback(() => {
    setRematchOfferReceived(false);
    onlineClient.declineRematch();
  }, []);

  const sendMessage = useCallback((text: string) => {
    onlineClient.sendChat(text);
  }, []);

  const resetToMenu = useCallback(() => {
    clearSession();
    onlineClient.leaveGame();
    setMatchStatus("idle");
    setRoom(null);
    setOpponent(null);
    setGameState(null);
    setMessages([]);
    setDrawOfferSent(false);
    setDrawOfferReceived(false);
    setDrawDeclinedNotice(false);
    setRematchOfferSent(false);
    setRematchOfferReceived(false);
    setRematchDeclinedNotice(false);
    setOpponentNotice(null);
    setError(null);
  }, []);

  return {
    connectionStatus,
    matchStatus,
    player,
    opponent,
    opponentNotice,
    room,
    gameState,
    error,
    queueSize,
    messages,
    drawOfferSent,
    drawOfferReceived,
    drawDeclinedNotice,
    rematchOfferSent,
    rematchOfferReceived,
    rematchDeclinedNotice,
    startMatchmaking,
    cancelMatchmaking,
    createPrivateRoom,
    joinPrivateRoom,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
    declineRematch,
    sendMessage,
    resetToMenu,
  };
}
