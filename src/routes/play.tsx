import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Flag,
  Home,
  Hourglass,
  Layers,
  Lightbulb,
  Palette,
  PlayCircle,
  Repeat,
  RotateCcw,
  Scroll,
  Settings2,
  Shield,
  Swords,
  Timer,
  Trophy,
  Undo2,
  Users,
  Volume1,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { CapturedRow, ChessBoard } from "../components/ChessBoard";
import { KbachDivider } from "../components/KhmerOrnament";
import { useI18n } from "../lib/i18n";
import {
  BOARD_THEMES,
  PIECE_STYLES,
  useSettings,
  type BoardTheme,
  type PieceStyle,
} from "../lib/settings";
import { authManager } from "../lib/auth-manager";
import {
  GLYPHS,
  applyMove,
  findKing,
  getRuleSet,
  initialBoard,
  legalMoves,
  status,
  computeGameResult,
  canStartBoardHonorCounting,
  canStartPieceHonorCounting,
  startBoardHonorCounting,
  startPieceHonorCounting,
  advanceCounting,
  INITIAL_COUNTING_STATE,
  type Board,
  type Color,
  type CountingState,
  type RuleSetId,
  type TimeControl,
  type OukRuleSet,
  type GameResult,
} from "../lib/khmer-chess";
import { audioManager } from "../lib/audio";
import type { AIWorkerRequest, AIWorkerResponse } from "../workers/ai.worker";

export const Route = createFileRoute("/play")({
  validateSearch: (search: Record<string, unknown>): { mode?: "ai" | "local" } => {
    return {
      mode: (search.mode as "ai" | "local") || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Play Ouk Chatrang — Authentic Cambodian Chess" },
      {
        name: "description",
        content:
          "Play authentic Cambodian Ouk Chatrang against AI or a friend with Folk or International tournament rules, opening leaps, and honor counting.",
      },
      { property: "og:title", content: "Play Ouk Chatrang — Authentic Cambodian Chess" },
      {
        property: "og:description",
        content:
          "Authentic Cambodian Ouk Chatrang rules, Folk & International tournament modes, AI difficulty tiers, and local two-player mode.",
      },
    ],
  }),
  component: PlayPage,
});

const LEVELS = [
  { depth: 1, key: "novice" },
  { depth: 2, key: "apprentice" },
  { depth: 3, key: "master" },
  { depth: 4, key: "grandmaster" },
] as const;

type Mode = "ai" | "local";
type MatchStatus =
  | "setup"
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw_by_count"
  | "timeout"
  | "resigned";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

declare global {
  interface Window {
    AndroidBridge?: {
      setMatchActive: (active: boolean) => void;
    };
  }
}

function PlayPage() {
  const { t } = useI18n();
  const settings = useSettings();
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Offline mode is active by default to guarantee instant, seamless play
  const [started, setStarted] = useState(true);
  const [mode, setMode] = useState<Mode>(search?.mode ?? "ai");
  const [depth, setDepth] = useState(2);

  useEffect(() => {
    if (search?.mode) {
      setMode(search.mode);
    }
  }, [search?.mode]);

  // Setup Stage Selections
  const [selectedRulesetId, setSelectedRulesetId] = useState<RuleSetId>(
    settings.defaultRuleset ?? "folk",
  );
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>("standard");

  // Active Match Configuration & Locked State
  const [matchRulesetId, setMatchRulesetId] = useState<RuleSetId>("folk");
  const [matchTimeControl, setMatchTimeControl] = useState<TimeControl>("standard");
  const activeRuleset = useMemo<OukRuleSet>(() => getRuleSet(matchRulesetId), [matchRulesetId]);

  const [history, setHistory] = useState<Board[]>([initialBoard()]);
  const [turn, setTurn] = useState<Color>("w");
  const [selected, setSelected] = useState<number | null>(null);
  const [touchLocked, setTouchLocked] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<number[]>([]);
  const [checkSplashTrigger, setCheckSplashTrigger] = useState(0);

  // Clocks for match
  const [clocks, setClocks] = useState<{ w: number; b: number }>({ w: 3600, b: 3600 });
  const [timedOutPlayer, setTimedOutPlayer] = useState<Color | null>(null);

  // Cambodian Match & Counting State
  const [countingState, setCountingState] = useState<CountingState>(INITIAL_COUNTING_STATE);
  const [resignedPlayer, setResignedPlayer] = useState<Color | null>(null);
  const [countDrawReached, setCountDrawReached] = useState(false);
  const [kingCapturedWinner, setKingCapturedWinner] = useState<Color | null>(null);

  // Popovers and Modals
  const [showResignModal, setShowResignModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState((search?.mode ?? "ai") === "ai");
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [showPiecePopover, setShowPiecePopover] = useState(false);
  const [showThemePopover, setShowThemePopover] = useState(false);

  const volumePopoverRef = useRef<HTMLDivElement>(null);
  const piecePopoverRef = useRef<HTMLDivElement>(null);
  const themePopoverRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(target)) {
        setShowVolumePopover(false);
      }
      if (piecePopoverRef.current && !piecePopoverRef.current.contains(target)) {
        setShowPiecePopover(false);
      }
      if (themePopoverRef.current && !themePopoverRef.current.contains(target)) {
        setShowThemePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Audio BGM lifecycle
  useEffect(() => {
    if (started && settings.bgmTrack !== "off") {
      audioManager.startBgm();
    } else {
      audioManager.stopBgm();
    }
    return () => {
      audioManager.stopBgm();
    };
  }, [started, settings.bgmTrack]);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const currentRequestIdRef = useRef(0);

  const board = history[history.length - 1]!;
  const rawState = useMemo(() => status(board, turn, activeRuleset), [board, turn, activeRuleset]);

  const gameResult: GameResult | null = useMemo(() => {
    if (!started) return null;
    return computeGameResult({
      rawStatus: rawState,
      turn,
      resignedPlayer,
      timedOutPlayer,
      countDrawReached,
      countingState,
      kingCapturedWinner,
    });
  }, [
    started,
    rawState,
    turn,
    resignedPlayer,
    timedOutPlayer,
    countDrawReached,
    countingState,
    kingCapturedWinner,
  ]);

  const isTerminal = gameResult !== null;

  const matchStatus: MatchStatus = useMemo(() => {
    if (!started) return "setup";
    if (kingCapturedWinner) return "checkmate";
    if (resignedPlayer) return "resigned";
    if (timedOutPlayer) return "timeout";
    if (countDrawReached) return "draw_by_count";
    if (rawState === "king_captured") return "checkmate";
    if (rawState === "checkmate") {
      if (countingState.type === "board" && countingState.countingPlayer === turn) {
        return "draw_by_count";
      }
      return "checkmate";
    }
    if (rawState === "stalemate") return "stalemate";
    if (rawState === "check") return "check";
    return "playing";
  }, [
    started,
    kingCapturedWinner,
    resignedPlayer,
    timedOutPlayer,
    countDrawReached,
    rawState,
    countingState,
    turn,
  ]);

  // Android Bridge integration
  useEffect(() => {
    const isOngoing = started && !isTerminal;
    if (typeof window !== "undefined" && window.AndroidBridge?.setMatchActive) {
      window.AndroidBridge.setMatchActive(isOngoing);
    }
    return () => {
      if (typeof window !== "undefined" && window.AndroidBridge?.setMatchActive) {
        window.AndroidBridge.setMatchActive(false);
      }
    };
  }, [started, isTerminal]);

  useEffect(() => {
    const handleAndroidBack = () => {
      if (started && !isTerminal) {
        setShowLeaveModal(true);
      }
    };
    window.addEventListener("androidBack", handleAndroidBack);
    return () => {
      window.removeEventListener("androidBack", handleAndroidBack);
    };
  }, [started, isTerminal]);

  // Clock countdown timer effect
  useEffect(() => {
    if (!started || isTerminal) return;

    const timer = setInterval(() => {
      setClocks((prev) => {
        const current = prev[turn];
        if (current <= 1) {
          clearInterval(timer);
          setTimedOutPlayer(turn);
          return { ...prev, [turn]: 0 };
        }
        return { ...prev, [turn]: current - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, isTerminal, turn]);

  const targets =
    isTerminal || selected === null ? hint : legalMoves(board, selected, activeRuleset);
  const checkSquare =
    matchStatus === "check" || matchStatus === "checkmate" ? findKing(board, turn) : null;

  const commit = useCallback(
    (from: number, to: number) => {
      const b = history[history.length - 1]!;
      const piece = b[from];
      if (!piece) return;
      const taken = b[to];
      const next = applyMove(b, from, to);
      setHistory((h) => [...h, next]);
      if (taken) {
        setCaptured((c) => ({
          ...c,
          [taken.color]: [...c[taken.color], GLYPHS[taken.type]],
        }));
      }
      setLastMove({ from, to });
      setSelected(null);
      setTouchLocked(false);
      setHint([]);

      // Procedural sound effects for committed move
      const nextTurn = piece.color === "w" ? "b" : "w";
      const isKingCapture = taken && taken.type === "k";

      if (isKingCapture) {
        setKingCapturedWinner(piece.color);
        audioManager.playSfx("capture");
        if (mode === "ai") {
          audioManager.playSfx(piece.color === "w" ? "victory" : "defeat");
        } else {
          audioManager.playSfx("victory");
        }
        return;
      }

      const nextStatus = status(next, nextTurn, activeRuleset);
      const isPromotion = piece.type === "p" && (next[to]?.type === "f" || next[to]?.type === "q");

      if (nextStatus === "checkmate" || nextStatus === "king_captured") {
        // Handled by gameResult effect
      } else if (nextStatus === "check") {
        setCheckSplashTrigger((value) => value + 1);
        audioManager.playSfx("check");
      } else if (isPromotion) {
        audioManager.playSfx("promotion");
      } else if (taken) {
        audioManager.playSfx("capture");
      } else {
        audioManager.playSfx("move");
      }

      // Advance Cambodian Honor Counting if active
      setCountingState((prev) => {
        if (prev.type === "none" || !prev.countingPlayer) return prev;
        const nextCounting = advanceCounting(prev, piece.color);
        if (nextCounting.count >= nextCounting.limit) {
          setCountDrawReached(true);
        }
        return nextCounting;
      });

      setTurn(nextTurn);
    },
    [history, activeRuleset, mode],
  );

  const prevResultRef = useRef<GameResult | null>(null);
  useEffect(() => {
    if (gameResult && !prevResultRef.current) {
      if (gameResult.reason === "resignation") {
        audioManager.playSfx("resignation");
      } else if (gameResult.reason === "timeout") {
        audioManager.playSfx("timeout");
      } else if (gameResult.reason === "stalemate" || gameResult.reason === "mij") {
        audioManager.playSfx("draw");
      } else if (gameResult.reason === "checkmate" || gameResult.reason === "king_capture") {
        if (mode === "ai") {
          if (gameResult.winner === "w") {
            audioManager.playSfx("victory");
          } else if (gameResult.winner === "b") {
            audioManager.playSfx("defeat");
          } else {
            audioManager.playSfx("checkmate");
          }
        } else {
          audioManager.playSfx("victory");
        }
      }
    }
    prevResultRef.current = gameResult;
  }, [gameResult, mode]);

  const reset = useCallback(
    (newRulesetId?: RuleSetId, newTimeControl?: TimeControl) => {
      currentRequestIdRef.current = ++requestIdRef.current;
      setThinking(false);
      const targetRuleset = newRulesetId ?? selectedRulesetId;
      const targetTime = newTimeControl ?? selectedTimeControl;
      setMatchRulesetId(targetRuleset);
      setMatchTimeControl(targetTime);

      const initialSeconds = targetTime === "blitz" ? 300 : 3600;
      setClocks({ w: initialSeconds, b: initialSeconds });
      setTimedOutPlayer(null);
      setResignedPlayer(null);
      setKingCapturedWinner(null);
      setCountDrawReached(false);
      setCountingState(INITIAL_COUNTING_STATE);
      prevResultRef.current = null;

      setHistory([initialBoard()]);
      setTurn("w");
      setSelected(null);
      setTouchLocked(false);
      setLastMove(null);
      setCaptured({ w: [], b: [] });
      setHint([]);
      setCheckSplashTrigger(0);
    },
    [selectedRulesetId, selectedTimeControl],
  );

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const isTerminalRef = useRef(isTerminal);
  useEffect(() => {
    isTerminalRef.current = isTerminal;
  }, [isTerminal]);

  // Initialize AI Worker as Singleton
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("../workers/ai.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<AIWorkerResponse>) => {
        const { requestId, type, action, move, hint: workerHint } = e.data;
        if (requestId !== currentRequestIdRef.current) return;
        if (isTerminalRef.current) {
          setThinking(false);
          return;
        }

        if (type === "hint" || action === "hint") {
          const h = workerHint || move;
          if (h) {
            setHint([h.from, h.to]);
            setSelected(h.from);
          }
        } else {
          setThinking(false);
          if (move) {
            commitRef.current(move.from, move.to);
          }
        }
      };

      worker.onerror = () => {
        setThinking(false);
      };
    } catch {
      // Fallback in environments without Web Worker support
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, []);

  // AI Turn Trigger
  useEffect(() => {
    if (!started || mode !== "ai" || turn !== "b" || isTerminal || thinking) return;

    setThinking(true);
    const requestId = ++requestIdRef.current;
    currentRequestIdRef.current = requestId;

    const request: AIWorkerRequest = {
      requestId,
      type: "search",
      action: "move",
      board,
      turn: "b",
      color: "b",
      depth,
      rulesetId: matchRulesetId,
    };

    if (workerRef.current) {
      workerRef.current.postMessage(request);
    } else {
      // Direct reliable fallback for environments without Web Worker
      const timer = setTimeout(() => {
        if (requestId !== currentRequestIdRef.current || isTerminalRef.current) return;
        setThinking(false);
        const move = bestMove(board, "b", depth, activeRuleset);
        if (move) {
          commitRef.current(move.from, move.to);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [started, mode, turn, isTerminal, board, depth, matchRulesetId, activeRuleset, thinking]);

  const onSquare = (i: number) => {
    if (!started || isTerminal) return;
    if (mode === "ai" && turn === "b") return;

    const piece = board[i];

    if (selected === null) {
      if (piece && piece.color === turn) {
        setSelected(i);
        if (activeRuleset.touchMove) {
          setTouchLocked(true);
        }
        setHint([]);
      }
      return;
    }

    if (selected === i) {
      if (!touchLocked) {
        setSelected(null);
        setHint([]);
      }
      return;
    }

    const validMoves = legalMoves(board, selected, activeRuleset);
    if (validMoves.includes(i)) {
      commit(selected, i);
      return;
    }

    if (!touchLocked && piece && piece.color === turn) {
      setSelected(i);
      setHint([]);
    }
  };

  const undo = () => {
    if (isTerminal || history.length < 2) return;
    currentRequestIdRef.current = ++requestIdRef.current;
    setThinking(false);

    const steps = mode === "ai" ? (history.length >= 3 ? 2 : 1) : 1;
    const newHistory = history.slice(0, -steps);
    const targetBoard = newHistory[newHistory.length - 1]!;

    const newCaptured: { w: string[]; b: string[] } = { w: [], b: [] };
    for (let idx = 1; idx < newHistory.length; idx++) {
      const prevB = newHistory[idx - 1]!;
      const currB = newHistory[idx]!;
      for (let s = 0; s < 64; s++) {
        if (prevB[s] && !currB[s]) {
          const cap = prevB[s]!;
          newCaptured[cap.color].push(GLYPHS[cap.type]);
        }
      }
    }

    setHistory(newHistory);
    setCaptured(newCaptured);
    setTurn(targetBoard === initialBoard() ? "w" : newHistory.length % 2 === 1 ? "w" : "b");
    setSelected(null);
    setTouchLocked(false);
    setLastMove(null);
    setHint([]);
    setTimedOutPlayer(null);
    setResignedPlayer(null);
    setCountDrawReached(false);
    setCountingState(INITIAL_COUNTING_STATE);
  };

  const showHint = () => {
    if (isTerminal || (mode === "ai" && turn === "b")) return;
    const requestId = ++requestIdRef.current;
    currentRequestIdRef.current = requestId;

    const request: AIWorkerRequest = {
      requestId,
      type: "hint",
      action: "hint",
      board,
      turn,
      color: turn,
      depth: Math.max(depth, 2),
      rulesetId: matchRulesetId,
    };

    if (workerRef.current) {
      workerRef.current.postMessage(request);
    } else {
      const move = bestMove(board, turn, Math.max(depth, 2), activeRuleset);
      if (move) {
        setHint([move.from, move.to]);
        setSelected(move.from);
      }
    }
  };

  const handleNewGameClick = () => {
    setShowNewGameModal(true);
  };

  const handleResignConfirm = () => {
    setShowResignModal(false);
    setResignedPlayer(turn);
  };

  const handleLeaveConfirm = () => {
    setShowLeaveModal(false);
    navigate({ to: "/home" });
  };

  // Cambodian Honor Counting eligibility
  const eligibleForBoardCounting = canStartBoardHonorCounting(board);
  const eligibleForPieceCounting = canStartPieceHonorCounting(board);

  // Player Names & Avatars
  const currentUser = authManager.getCurrentUser();
  const currentProfile = authManager.getCurrentProfile();
  const userDisplayName =
    currentProfile?.displayName ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "";

  const whitePlayerName =
    mode === "ai"
      ? userDisplayName || t("you")
      : userDisplayName || t("player_1_white") || "Người chơi 1 (Trắng)";

  const blackPlayerName =
    mode === "ai"
      ? `AI • ${t(LEVELS[depth - 1]?.key ?? "novice")}`
      : t("player_2_black") || "Người chơi 2 (Đen)";

  const activeRulesetBadgeLabel =
    matchRulesetId === "folk"
      ? t("folk_title")
      : matchTimeControl === "blitz"
        ? `${t("international_title")} • ${t("blitz_time")}`
        : t("international_title");

  // Game Over Details
  const gameOverHeading = useMemo(() => {
    if (!gameResult) return "";
    if (gameResult.winner === "w") return `${whitePlayerName} ${t("win")}`;
    if (gameResult.winner === "b") return `${blackPlayerName} ${t("win")}`;
    return t("stalemate");
  }, [gameResult, whitePlayerName, blackPlayerName, t]);

  const gameOverReasonText = useMemo(() => {
    if (!gameResult) return "";
    switch (gameResult.reason) {
      case "checkmate":
        return t("checkmate");
      case "king_capture":
        return t("reason_king_capture");
      case "stalemate":
        return t("stalemate");
      case "resignation":
        return t("resign");
      case "timeout":
        return `${t("timeout")}`;
      case "mij":
        return `${t("draw_by_counting")} (${countingState.limit} ${t("moves")})`;
      default:
        return "";
    }
  }, [gameResult, countingState.limit, t]);

  // Volume icon
  const VolumeIcon =
    !settings.sound || settings.sfxVolume === 0
      ? VolumeX
      : settings.sfxVolume < 0.5
        ? Volume1
        : Volume2;

  // Header controls
  const headerControls = (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {/* 1. SOUND VOLUME POPOVER */}
      <div className="relative" ref={volumePopoverRef}>
        <button
          type="button"
          onClick={() => {
            setShowVolumePopover((v) => !v);
            setShowPiecePopover(false);
            setShowThemePopover(false);
          }}
          title={t("sound_effects")}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 transition-all active:scale-95 shadow-xs"
        >
          <VolumeIcon className="h-4 w-4 text-gold-dark" />
        </button>

        {showVolumePopover && (
          <div className="kbach-frame absolute right-0 top-10 z-50 w-56 rounded-2xl border border-gold/50 bg-card p-3 shadow-2xl backdrop-blur-md animate-fade-in space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{t("sound_effects")}</span>
              <button
                type="button"
                onClick={() => settings.update({ sound: !settings.sound })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.sound ? "bg-gold-dark" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.sound ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("sfx_volume")}</span>
                <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => settings.update({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-gold-dark"
              />
            </div>
            <KbachDivider className="my-1 opacity-60" />
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("music_volume")}</span>
                <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => settings.update({ musicVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-gold-dark"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. PIECE STYLE SELECTOR POPOVER */}
      <div className="relative" ref={piecePopoverRef}>
        <button
          type="button"
          onClick={() => {
            setShowPiecePopover((v) => !v);
            setShowVolumePopover(false);
            setShowThemePopover(false);
          }}
          title={t("piece_style_picker")}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 transition-all active:scale-95 shadow-xs"
        >
          <Palette className="h-4 w-4 text-gold-dark" />
        </button>

        {showPiecePopover && (
          <div className="kbach-frame absolute right-0 top-10 z-50 w-52 rounded-2xl border border-gold/50 bg-card p-2 shadow-2xl backdrop-blur-md animate-fade-in space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("piece_style_picker")}
            </div>
            <div className="grid gap-1">
              {(Object.keys(PIECE_STYLES) as PieceStyle[]).map((styleKey) => {
                const isCur = settings.pieceStyle === styleKey;
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => {
                      settings.update({ pieceStyle: styleKey });
                      setShowPiecePopover(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isCur
                        ? "bg-gold/20 text-gold-dark border border-gold/40"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{t(PIECE_STYLES[styleKey].labelKey)}</span>
                    {isCur && <Check className="h-3.5 w-3.5 text-gold-dark" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. BOARD THEME SELECTOR POPOVER */}
      <div className="relative" ref={themePopoverRef}>
        <button
          type="button"
          onClick={() => {
            setShowThemePopover((v) => !v);
            setShowVolumePopover(false);
            setShowPiecePopover(false);
          }}
          title={t("board_theme_picker")}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 transition-all active:scale-95 shadow-xs"
        >
          <Layers className="h-4 w-4 text-gold-dark" />
        </button>

        {showThemePopover && (
          <div className="kbach-frame absolute right-0 top-10 z-50 w-56 rounded-2xl border border-gold/50 bg-card p-2 shadow-2xl backdrop-blur-md animate-fade-in space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("board_theme_picker")}
            </div>
            <div className="grid gap-1">
              {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((themeKey) => {
                const isCur = settings.boardTheme === themeKey;
                const theme = BOARD_THEMES[themeKey];
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => {
                      settings.update({ boardTheme: themeKey });
                      setShowThemePopover(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isCur
                        ? "bg-gold/20 text-gold-dark border border-gold/40"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 w-4 overflow-hidden rounded-md border border-border/80">
                        <div className="h-full w-1/2" style={{ backgroundColor: theme.light }} />
                        <div className="h-full w-1/2" style={{ backgroundColor: theme.dark }} />
                      </div>
                      <span>{theme.label}</span>
                    </div>
                    {isCur && <Check className="h-3.5 w-3.5 text-gold-dark" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. NEW GAME / MATCH SETTINGS BUTTON */}
      <button
        type="button"
        onClick={handleNewGameClick}
        title={t("new_game")}
        className="flex h-8 items-center gap-1 rounded-xl border border-gold/40 bg-card/90 px-2.5 text-xs font-semibold text-gold-dark shadow-xs transition-all hover:bg-gold/20 active:scale-95"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("new_game")}</span>
      </button>
    </div>
  );

  const isOpponentTurn = turn === "b";
  const isMyTurn = turn === "w";

  return (
    <AppShell title={t("play")} headerRight={headerControls} showAccountBar={false} compact={true}>
      <div className="animate-rise flex flex-col gap-1 sm:gap-2">
        {/* 1. MATCH HEADER BAR (Ruleset badge & Quick mode switch) */}
        <div className="relative flex items-center justify-between rounded-xl border border-gold/30 bg-card/80 px-2.5 py-1 text-xs backdrop-blur-sm shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewGameClick}
              className="flex items-center gap-1.5 font-serif font-semibold text-gold-dark hover:opacity-80 transition-all"
            >
              {matchRulesetId === "folk" ? (
                <Shield className="h-3.5 w-3.5" />
              ) : (
                <Trophy className="h-3.5 w-3.5" />
              )}
              <span>{activeRulesetBadgeLabel}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMode: Mode = mode === "ai" ? "local" : "ai";
                setMode(nextMode);
                reset(matchRulesetId, matchTimeControl);
              }}
              className="flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold text-foreground hover:border-gold/50 active:scale-95 transition-all"
            >
              {mode === "ai" ? (
                <>
                  <Bot className="h-3.5 w-3.5 text-gold-dark" />
                  <span>AI ({t(LEVELS[depth - 1]?.key ?? "novice")})</span>
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5 text-gold-dark" />
                  <span>{t("local_2p")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. OPPONENT / BLACK PLAYER CARD (Synchronized 1:1 with Online Arena) */}
        <section
          id="opponent-card"
          className={`flex items-center justify-between rounded-2xl border p-1.5 sm:p-2.5 transition-all duration-300 ${
            isOpponentTurn && !isTerminal
              ? "border-amber-500 bg-amber-500/15 shadow-[0_0_24px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/70"
              : "border-border/80 bg-card shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl border border-stone-600 bg-stone-900 text-stone-100 flex items-center justify-center font-serif font-bold text-sm shadow-xs">
                {mode === "ai" ? <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-stone-200" /> : "♚"}
              </div>
              {isOpponentTurn && !isTerminal && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-background animate-ping" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                  {blackPlayerName}
                </span>
                <span className="text-[10px] text-muted-foreground">({t("black")})</span>
              </div>

              {isOpponentTurn && !isTerminal && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-bold animate-pulse mt-0.5 ${
                    matchStatus === "check"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-ping ${
                      matchStatus === "check" ? "bg-red-400" : "bg-amber-400"
                    }`}
                  />
                  {matchStatus === "check"
                    ? t("check")
                    : thinking
                      ? t("ai_thinking")
                      : t("opponent_turn")}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-mono font-bold border transition-all ${
                isOpponentTurn && !isTerminal
                  ? "border-gold bg-gold/20 text-gold-dark shadow-xs"
                  : "border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{formatTime(clocks.b)}</span>
            </div>
            <CapturedRow pieces={captured.w} color="w" />
          </div>
        </section>

        {/* 3. HONOR COUNTING STATUS BAR (If active) */}
        {countingState.type !== "none" && (
          <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold-dark shadow-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <Timer className="h-3.5 w-3.5" />
              {countingState.type === "board"
                ? t("board_honor_counting")
                : t("piece_honor_counting")}{" "}
              ({countingState.countingPlayer === "w" ? t("white") : t("black")}):
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">
                {countingState.count} / {countingState.limit}
              </span>
              {countingState.type === "board" && !isTerminal && (
                <button
                  type="button"
                  onClick={() => setCountingState(INITIAL_COUNTING_STATE)}
                  className="rounded-lg border border-gold/50 px-2 py-0.5 text-[10px] font-semibold text-gold-dark hover:bg-gold/20 active:scale-95 transition-all"
                >
                  {t("stop_count")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. CHESS BOARD CONTAINER */}
        <section
          id="chess-board-area"
          className="w-full flex-1 flex flex-col justify-center items-center py-0.5"
        >
          <ChessBoard
            board={board}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            checkSquare={checkSquare}
            flipped={flipped}
            touchLocked={touchLocked}
            showCheckBanner={matchStatus === "check" || rawState === "check"}
            splashTrigger={checkSplashTrigger}
            showCheckmateBanner={
              matchStatus === "checkmate" ||
              matchStatus === "king_captured" ||
              (gameResult?.winner !== null &&
                (gameResult?.reason === "checkmate" || gameResult?.reason === "king_capture"))
            }
            onSquare={onSquare}
          />
        </section>

        {/* 5. USER / WHITE PLAYER CARD (Synchronized 1:1 with Online Arena) */}
        <section
          id="user-card"
          className={`flex items-center justify-between rounded-2xl border p-1.5 sm:p-2.5 transition-all duration-300 ${
            isMyTurn && !isTerminal
              ? "border-gold bg-gold/20 shadow-[0_0_28px_rgba(212,175,55,0.35)] ring-2 ring-gold/80"
              : "border-border/80 bg-card shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl border border-gold/60 bg-amber-50 text-stone-900 flex items-center justify-center font-serif font-bold text-sm shadow-xs">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={whitePlayerName}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  "♔"
                )}
              </div>
              {isMyTurn && !isTerminal && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gold ring-2 ring-background animate-ping" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                  {whitePlayerName}
                </span>
                <span className="text-[10px] text-muted-foreground">({t("white")})</span>
              </div>

              {isMyTurn && !isTerminal && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-bold animate-pulse mt-0.5 ${
                    matchStatus === "check"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gold/20 text-gold-dark"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-ping ${
                      matchStatus === "check" ? "bg-red-400" : "bg-gold"
                    }`}
                  />
                  {matchStatus === "check" ? t("check") : t("your_turn")}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-mono font-bold border transition-all ${
                isMyTurn && !isTerminal
                  ? "border-gold bg-gold/20 text-gold-dark shadow-xs"
                  : "border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{formatTime(clocks.w)}</span>
            </div>
            <CapturedRow pieces={captured.b} color="b" />
          </div>
        </section>

        {/* 5b. QUICK HONOR COUNT TRIGGERS (If eligible) */}
        {(eligibleForPieceCounting || eligibleForBoardCounting) &&
          countingState.type === "none" &&
          !isTerminal && (
            <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold-dark animate-fade-in shadow-xs">
              <span className="text-[11px] font-semibold">
                {t("honor_counting_available") || "Đủ điều kiện đếm danh dự"}
              </span>
              {eligibleForPieceCounting ? (
                <button
                  type="button"
                  onClick={() => setCountingState(startPieceHonorCounting(board, turn))}
                  className="rounded-lg border border-gold/50 bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark hover:bg-gold/30 active:scale-95 transition-all"
                >
                  {t("start_piece_count")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCountingState(startBoardHonorCounting(board, turn))}
                  className="rounded-lg border border-gold/50 bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark hover:bg-gold/30 active:scale-95 transition-all"
                >
                  {t("start_board_count")}
                </button>
              )}
            </div>
          )}

        {/* 6. PRIMARY IN-GAME ACTION BAR: [ Undo ] [ Hint ] [ Flip ] [ New Game ] */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {(
            [
              { fn: undo, icon: Undo2, key: "undo", disabled: isTerminal || history.length < 2 },
              {
                fn: showHint,
                icon: Lightbulb,
                key: "hint",
                disabled: isTerminal || (mode === "ai" && turn === "b"),
              },
              { fn: () => setFlipped((f) => !f), icon: Repeat, key: "flip_board", disabled: false },
              { fn: handleNewGameClick, icon: RotateCcw, key: "new_game", disabled: false },
            ] as const
          ).map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={b.fn}
              disabled={b.disabled}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl border border-border bg-secondary/60 py-2 sm:py-2.5 text-[10px] font-medium text-foreground transition-all duration-300 ${
                b.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-gold/60 active:scale-95 shadow-xs"
              }`}
            >
              <b.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold-dark" />
              {t(b.key)}
            </button>
          ))}
        </div>

        {/* 7. MATCH RESIGN AND HOME ACTION BAR: [ Resign ] [ Home ] */}
        <div className="flex gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={isTerminal}
            onClick={() => setShowResignModal(true)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary/60 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-all duration-300 ${
              isTerminal
                ? "opacity-40 cursor-not-allowed"
                : "hover:border-gold hover:text-gold-dark shadow-xs active:scale-95"
            }`}
          >
            <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("resign")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isTerminal) {
                navigate({ to: "/home" });
              } else {
                setShowLeaveModal(true);
              }
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary/60 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-all duration-300 hover:border-gold/60 shadow-xs active:scale-95"
          >
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("leave_match")}
          </button>
        </div>
      </div>

      {/* MODAL 1: NEW GAME / MATCH SETUP MODAL */}
      {showNewGameModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame w-full max-w-sm rounded-3xl border border-gold/50 bg-card p-6 shadow-2xl animate-rise space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-gold-dark" />
                {t("new_game")}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewGameModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("game_modes")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    mode === "ai"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Bot className="h-4 w-4 text-gold-dark" />
                  {t("play_vs_ai")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("local")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    mode === "local"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Users className="h-4 w-4 text-gold-dark" />
                  {t("local_2p")}
                </button>
              </div>
            </div>

            {/* AI Difficulty (if mode === 'ai') */}
            {mode === "ai" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {t("choose_difficulty")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setDepth(l.depth)}
                      className={`rounded-xl border p-2 text-center text-xs font-semibold transition-all ${
                        depth === l.depth
                          ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                          : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                      }`}
                    >
                      {t(l.key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ruleset Selection */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("ruleset_selection") || "Luật thi đấu"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRulesetId("folk")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    selectedRulesetId === "folk"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Shield className="h-4 w-4 text-gold-dark" />
                  {t("folk_title")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRulesetId("international")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    selectedRulesetId === "international"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Trophy className="h-4 w-4 text-gold-dark" />
                  {t("international_title")}
                </button>
              </div>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("time_control") || "Thời gian ván đấu"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTimeControl("standard")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                    selectedTimeControl === "standard"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-gold-dark" />
                  {t("standard_time") || "Tiêu chuẩn (60p)"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTimeControl("blitz")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                    selectedTimeControl === "blitz"
                      ? "border-gold bg-gold/20 text-gold-dark ring-1 ring-gold/40 shadow-xs"
                      : "border-border bg-secondary/60 text-foreground hover:border-gold/50"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 text-gold-dark" />
                  {t("blitz_time") || "Chớp nhoáng (5p)"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setShowNewGameModal(false)}
                className="rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:border-gold/60 transition-all active:scale-95"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewGameModal(false);
                  reset(selectedRulesetId, selectedTimeControl);
                }}
                className="shimmer-sheen bg-royal rounded-2xl px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-gold transition-all active:scale-95"
              >
                {t("start_match")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GAME OVER MODAL */}
      {gameResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/50 bg-card p-6 shadow-2xl text-center space-y-4 animate-rise">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-gold/15 blur-2xl pointer-events-none" />

            {/* Mascot / Trophy / Badge */}
            <div className="relative mx-auto flex justify-center">
              <span className="animate-glow absolute inset-0 rounded-full bg-gold/30 blur-xl" />
              <div
                className={`grid h-16 w-16 place-items-center rounded-2xl border ${
                  gameResult.winner === "w"
                    ? "border-gold bg-gold/20 text-gold-dark shadow-gold"
                    : gameResult.winner === "draw"
                      ? "border-gold/40 bg-secondary text-gold-dark"
                      : "border-gold/40 bg-secondary/80 text-gold-dark"
                }`}
              >
                {gameResult.winner === "draw" ? (
                  <Shield className="h-8 w-8 text-gold-dark" />
                ) : gameResult.winner === "w" ? (
                  <Trophy className="h-8 w-8 text-gold-dark" />
                ) : (
                  <Flag className="h-8 w-8 text-gold-dark" />
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div>
              <span className="rounded-full border border-gold/40 bg-secondary/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
                {t("game_over")}
              </span>
              <h2 className="text-royal mt-2 font-serif text-2xl font-bold">{gameOverHeading}</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{gameOverReasonText}</p>
            </div>

            {/* International Tournament Match Score */}
            {matchRulesetId === "international" && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-secondary/60 py-2 px-4 text-xs">
                <span className="font-medium text-muted-foreground">{t("tournament_score")}:</span>
                <span className="font-mono font-bold text-foreground">
                  {t("white")}:{" "}
                  {gameResult.winner === "w" ? "1.0" : gameResult.winner === "draw" ? "0.5" : "0.0"}
                </span>
                <span className="text-gold-dark">•</span>
                <span className="font-mono font-bold text-foreground">
                  {t("black")}:{" "}
                  {gameResult.winner === "b" ? "1.0" : gameResult.winner === "draw" ? "0.5" : "0.0"}
                </span>
              </div>
            )}

            <KbachDivider className="my-2" />

            {/* Action Buttons: [ Play Again / New Game ] and [ Return Home ] */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  reset(matchRulesetId, matchTimeControl);
                }}
                className="shimmer-sheen bg-royal flex items-center justify-center gap-2 rounded-2xl py-3 px-4 font-serif text-xs font-semibold text-primary-foreground shadow-gold transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                {t("play_again")}
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate({ to: "/home" });
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-secondary/80 py-3 px-4 font-serif text-xs font-semibold text-foreground transition-all duration-300 hover:border-gold hover:bg-gold/10 active:scale-95"
              >
                <Home className="h-4 w-4 text-gold-dark" />
                {t("return_home")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESIGN CONFIRMATION MODAL */}
      {showResignModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame w-full max-w-sm rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl animate-rise space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark shrink-0">
                <AlertTriangle className="h-5 w-5 text-gold-dark" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  {t("resign_confirm_title")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("resign_confirm_desc")}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResignModal(false)}
                className="rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:border-gold/60 transition-all active:scale-95"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleResignConfirm}
                className="shimmer-sheen bg-royal rounded-2xl px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-gold transition-all active:scale-95"
              >
                {t("confirm_resign")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LEAVE MATCH CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame w-full max-w-sm rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl animate-rise space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark shrink-0">
                <AlertTriangle className="h-5 w-5 text-gold-dark" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  {t("leave_match_title")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("leave_match_desc")}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:border-gold/60 transition-all active:scale-95"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleLeaveConfirm}
                className="shimmer-sheen bg-royal rounded-2xl px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-gold transition-all active:scale-95"
              >
                {t("confirm_leave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
