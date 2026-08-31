import {
  advanceCounting,
  applyMove,
  Color,
  computeGameResult,
  getRuleSet,
  inCheck,
  INITIAL_COUNTING_STATE,
  initialBoard,
  legalMoves,
  OukRuleSet,
  RULESETS,
  status,
} from "../src/lib/khmer-chess";
import { GameErrorPayload, GameMovedPayload, GameState } from "./game-types";

export function getAfkWindowMs(strikes: number): number {
  if (strikes <= 0) return 120_000; // AFK #1: 2 minutes
  if (strikes === 1) return 120_000; // AFK #2: 2 minutes
  return 60_000; // AFK #3: 1 minute
}

export function createInitialGameState(
  rulesetId: "folk" | "international" = "folk",
  timeControlOption?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
): GameState {
  const ruleset: OukRuleSet = getRuleSet(rulesetId);
  const board = initialBoard();
  const initialStatus = status(board, "w", ruleset);
  const isInitialCheck = inCheck(board, "w", ruleset);
  const now = Date.now();
  const initialSeconds =
    timeControlOption?.initialSeconds ?? (timeControlOption?.type === "blitz" ? 300 : 3600);
  const initialMs = initialSeconds * 1000;

  // AFK Penalty applies ONLY to Traditional (Folk 60m) and International Standard 60m (never Blitz 5m).
  const isBlitz = timeControlOption?.type === "blitz" || initialSeconds <= 300;
  const afkEnabled = !isBlitz;

  return {
    board,
    turn: "w",
    moveHistory: [],
    moveCount: 0,
    status: initialStatus,
    isCheck: isInitialCheck,
    result: null,
    countingState: { ...INITIAL_COUNTING_STATE },
    rulesetId: ruleset.id,
    startedAt: now,
    clocks: {
      w: initialMs,
      b: initialMs,
    },
    lastTurnTimestamp: now,
    timeControl: {
      type: timeControlOption?.type ?? (isBlitz ? "blitz" : "standard"),
      initialSeconds,
    },
    afkStrikes: {
      w: 0,
      b: 0,
    },
    afkEnabled,
  };
}

export function validateAndExecuteMove(params: {
  gameState: GameState;
  playerColor: Color;
  rawFrom: unknown;
  rawTo: unknown;
}):
  | { success: true; state: GameState; movedPayload: Omit<GameMovedPayload, "roomId"> }
  | { success: false; error: GameErrorPayload; timeout?: boolean } {
  const { gameState, playerColor, rawFrom, rawTo } = params;

  // 1. Check if game is already finished
  if (
    gameState.result !== null ||
    gameState.status === "checkmate" ||
    gameState.status === "stalemate" ||
    gameState.status === "timeout" ||
    gameState.status === "king_captured"
  ) {
    return {
      success: false,
      error: {
        code: "GAME_ALREADY_FINISHED",
        message: "Game is already completed.",
      },
    };
  }

  // 2. Check player's turn
  if (playerColor !== gameState.turn) {
    return {
      success: false,
      error: {
        code: "NOT_YOUR_TURN",
        message: `It is not your turn. Current turn: ${gameState.turn.toUpperCase()}`,
      },
    };
  }

  // 3. Server-authoritative clock check
  const now = Date.now();
  const elapsed = Math.max(0, now - gameState.lastTurnTimestamp);
  const remainingMs = gameState.clocks[playerColor] - elapsed;

  if (remainingMs <= 0) {
    gameState.clocks[playerColor] = 0;
    const opponentColor: Color = playerColor === "w" ? "b" : "w";
    const timeoutResult = computeGameResult({
      rawStatus: "timeout",
      turn: playerColor,
      resignedPlayer: null,
      timedOutPlayer: playerColor,
      countDrawReached: false,
      countingState: gameState.countingState,
    });
    gameState.result = timeoutResult;
    gameState.status = "timeout";

    return {
      success: false,
      timeout: true,
      error: {
        code: "TIME_OUT",
        message: `Player ${playerColor.toUpperCase()} ran out of time.`,
      },
    };
  }

  // Check AFK window if enabled
  if (gameState.afkEnabled) {
    const currentStrikes = gameState.afkStrikes?.[playerColor] || 0;
    const afkWindow = getAfkWindowMs(currentStrikes);
    if (elapsed >= afkWindow) {
      if (currentStrikes >= 2) {
        gameState.afkStrikes[playerColor] = 3;
        gameState.status = "timeout";
        const timeoutResult = computeGameResult({
          rawStatus: "timeout",
          turn: playerColor,
          resignedPlayer: null,
          timedOutPlayer: playerColor,
          countDrawReached: false,
          countingState: gameState.countingState,
        });
        gameState.result = timeoutResult;
        return {
          success: false,
          timeout: true,
          error: {
            code: "AFK_TIMEOUT",
            message: `Player ${playerColor.toUpperCase()} exceeded AFK window.`,
          },
        };
      } else {
        return {
          success: false,
          error: {
            code: "AFK_TURN_SKIPPED",
            message: "Thời gian lượt đi đã hết. Lượt đi đã được chuyển cho đối thủ.",
          },
        };
      }
    }
  }

  // 4. Validate coordinates format (must be integer between 0 and 63)
  if (
    typeof rawFrom !== "number" ||
    typeof rawTo !== "number" ||
    !Number.isInteger(rawFrom) ||
    !Number.isInteger(rawTo) ||
    rawFrom < 0 ||
    rawFrom > 63 ||
    rawTo < 0 ||
    rawTo > 63
  ) {
    return {
      success: false,
      error: {
        code: "MALFORMED_MOVE",
        message: "Move coordinates must be integer indices between 0 and 63.",
      },
    };
  }

  const from = rawFrom;
  const to = rawTo;

  // 5. Validate piece ownership at 'from' square
  const piece = gameState.board[from];
  if (!piece) {
    return {
      success: false,
      error: {
        code: "INVALID_MOVE",
        message: "No piece at the selected source square.",
      },
    };
  }

  if (piece.color !== playerColor) {
    return {
      success: false,
      error: {
        code: "INVALID_MOVE",
        message: "Cannot move opponent's piece.",
      },
    };
  }

  // 6. Validate move according to ruleset
  const ruleset: OukRuleSet = getRuleSet(gameState.rulesetId);
  const validDestinations = legalMoves(gameState.board, from, ruleset);

  if (!validDestinations.includes(to)) {
    return {
      success: false,
      error: {
        code: "INVALID_MOVE",
        message: `Move from square ${from} to ${to} is illegal according to Khmer Chess rules.`,
      },
    };
  }

  // 7. Deduct elapsed time and execute move
  gameState.clocks[playerColor] = Math.max(0, remainingMs);
  const capturedPiece = gameState.board[to];
  const newBoard = applyMove(gameState.board, from, to);
  const nextTurn: Color = playerColor === "w" ? "b" : "w";

  const isKingCaptured = capturedPiece && capturedPiece.type === "k";

  // Advance Mij counting if active (unless terminal King capture)
  const newCounting = isKingCaptured
    ? gameState.countingState
    : advanceCounting(gameState.countingState, playerColor);
  const nextStatus = isKingCaptured ? "king_captured" : status(newBoard, nextTurn, ruleset);
  const inCheckNext = isKingCaptured ? false : inCheck(newBoard, nextTurn, ruleset);
  const countDrawReached =
    !isKingCaptured && newCounting.type !== "none" && newCounting.count >= newCounting.limit;

  const gameResult = isKingCaptured
    ? { winner: playerColor, reason: "king_capture" as const }
    : computeGameResult({
        rawStatus: nextStatus,
        turn: nextTurn,
        resignedPlayer: null,
        timedOutPlayer: null,
        countDrawReached,
        countingState: newCounting,
      });

  // Mutate game state
  if (gameState.afkEnabled && gameState.afkStrikes) {
    gameState.afkStrikes[playerColor] = 0; // RESET RULE: timely move resets strike to 0
  }
  gameState.board = newBoard;
  gameState.turn = nextTurn;
  gameState.moveCount += 1;
  gameState.status = nextStatus;
  gameState.isCheck = inCheckNext;
  gameState.result = gameResult;
  gameState.countingState = newCounting;
  gameState.lastMoveAt = now;
  gameState.lastTurnTimestamp = now;
  gameState.lastMove = {
    from,
    to,
    color: playerColor,
    piece: piece.type,
    captured: capturedPiece,
  };
  gameState.moveHistory.push({
    from,
    to,
    color: playerColor,
    piece: piece.type,
    captured: capturedPiece ? capturedPiece.type : null,
  });

  return {
    success: true,
    state: gameState,
    movedPayload: {
      from,
      to,
      color: playerColor,
      board: newBoard,
      turn: nextTurn,
      status: nextStatus,
      isCheck: inCheckNext,
      isCheckmate: nextStatus === "checkmate",
      isStalemate: nextStatus === "stalemate",
      moveNumber: gameState.moveCount,
      captured: capturedPiece,
      result: gameResult,
      countingState: newCounting,
      clocks: { ...gameState.clocks },
      lastTurnTimestamp: gameState.lastTurnTimestamp,
      afkStrikes: { ...gameState.afkStrikes },
      afkEnabled: gameState.afkEnabled,
    },
  };
}
