import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Clock,
  Flag,
  Handshake,
  Loader2,
  MessageSquare,
  Palette,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Volume1,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  Layers,
} from "lucide-react";
import { CapturedRow, ChessBoard } from "./ChessBoard";
import { KbachDivider } from "./KhmerOrnament";
import { useI18n } from "../lib/i18n";
import { findKing, getRuleSet, legalMoves, type Board, type Color } from "../lib/khmer-chess";
import {
  BOARD_THEMES,
  PIECE_STYLES,
  useSettings,
  type BoardTheme,
  type PieceStyle,
} from "../lib/settings";
import { audioManager } from "../lib/audio";
import { onlineClient } from "../lib/online-client";
import type {
  ChatMessagePayload,
  ConnectionStatus,
  MatchStatus,
  OnlineGameState,
  OnlinePlayer,
  OnlineRoom,
} from "../lib/online-types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getCapturedPieces(board: Board, color: Color): string[] {
  const currentCounts: Record<string, number> = { k: 0, q: 0, b: 0, n: 0, r: 0, p: 0, f: 0 };
  for (const sq of board) {
    if (sq && sq.color === color) {
      currentCounts[sq.type] = (currentCounts[sq.type] || 0) + 1;
    }
  }

  const captured: string[] = [];
  const totalPawnsOrPromotions =
    (currentCounts.p || 0) + (currentCounts.f || 0) + Math.max(0, (currentCounts.q || 0) - 1);
  const missingPawns = Math.max(0, 8 - totalPawnsOrPromotions);
  for (let i = 0; i < missingPawns; i++) captured.push("p");

  const missingRooks = Math.max(0, 2 - (currentCounts.r || 0));
  for (let i = 0; i < missingRooks; i++) captured.push("r");

  const missingKnights = Math.max(0, 2 - (currentCounts.n || 0));
  for (let i = 0; i < missingKnights; i++) captured.push("n");

  const missingBishops = Math.max(0, 2 - (currentCounts.b || 0));
  for (let i = 0; i < missingBishops; i++) captured.push("b");

  const missingQueens = Math.max(0, 1 - Math.min(1, currentCounts.q || 0));
  for (let i = 0; i < missingQueens; i++) captured.push("q");

  const missingKings = Math.max(0, 1 - (currentCounts.k || 0));
  for (let i = 0; i < missingKings; i++) captured.push("k");

  return captured;
}

interface OnlineMatchArenaProps {
  connectionStatus?: ConnectionStatus;
  matchStatus: MatchStatus;
  player: OnlinePlayer;
  opponent: { name: string; uid?: string; photoURL?: string | null; connected?: boolean } | null;
  opponentNotice?: string | null;
  room: OnlineRoom | null;
  gameState: OnlineGameState;
  error?: string | null;
  messages: ChatMessagePayload[];
  drawOfferSent: boolean;
  drawOfferReceived: boolean;
  drawDeclinedNotice: boolean;
  rematchOfferSent: boolean;
  rematchOfferReceived: boolean;
  rematchDeclinedNotice: boolean;
  makeMove: (from: number, to: number) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  requestRematch: () => void;
  declineRematch: () => void;
  sendMessage: (text: string) => void;
  resetToMenu: () => void;
}

export function OnlineMatchArena({
  connectionStatus = "connected",
  matchStatus,
  player,
  opponent,
  opponentNotice,
  room,
  gameState,
  error,
  messages,
  drawOfferSent,
  drawOfferReceived,
  drawDeclinedNotice,
  rematchOfferSent,
  rematchOfferReceived,
  rematchDeclinedNotice,
  makeMove,
  resign,
  offerDraw,
  acceptDraw,
  declineDraw,
  requestRematch,
  declineRematch,
  sendMessage,
  resetToMenu,
}: OnlineMatchArenaProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = useSettings();

  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [confirmResignOpen, setConfirmResignOpen] = useState(false);
  const [showNavLockModal, setShowNavLockModal] = useState(false);

  // Popover state
  const [showAudioPopover, setShowAudioPopover] = useState(false);
  const [showPiecePopover, setShowPiecePopover] = useState(false);
  const [showThemePopover, setShowThemePopover] = useState(false);
  const audioPopoverRef = useRef<HTMLDivElement>(null);
  const piecePopoverRef = useRef<HTMLDivElement>(null);
  const themePopoverRef = useRef<HTMLDivElement>(null);

  // Realtime countdown clock tick
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (matchStatus !== "playing") return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, [matchStatus]);

  // Chat UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef<number>(0);

  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (chatOpen) {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setUnreadCount(0);
      } else if (latestMsg && latestMsg.senderId !== player.id) {
        setUnreadCount((prev) => prev + 1);
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, chatOpen, player.id]);

  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadCount(0);
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 60);
      }
      return next;
    });
  }, []);

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || text.length > 200) return;
    sendMessage(text);
    setChatInput("");
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (audioPopoverRef.current && !audioPopoverRef.current.contains(e.target as Node)) {
        setShowAudioPopover(false);
      }
      if (piecePopoverRef.current && !piecePopoverRef.current.contains(e.target as Node)) {
        setShowPiecePopover(false);
      }
      if (themePopoverRef.current && !themePopoverRef.current.contains(e.target as Node)) {
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
    if (matchStatus === "playing" && settings.bgmTrack !== "off") {
      audioManager.startBgm();
    } else {
      audioManager.stopBgm();
    }
    return () => {
      audioManager.stopBgm();
    };
  }, [matchStatus, settings.bgmTrack]);

  // NAVIGATION LOCK: Block browser back / tab close / accidental leave
  useEffect(() => {
    if (matchStatus !== "playing") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Push dummy history state to intercept back button
    window.history.pushState({ matchLocked: true }, "");
    const handlePopState = () => {
      window.history.pushState({ matchLocked: true }, "");
      setShowNavLockModal(true);
    };

    window.addEventListener("popstate", handlePopState);

    // Android hardware back
    const handleAndroidBack = () => {
      setShowNavLockModal(true);
    };
    window.addEventListener("ouk:android-back", handleAndroidBack);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("ouk:android-back", handleAndroidBack);
    };
  }, [matchStatus]);

  // Ruleset helper
  const activeRuleset = useMemo(() => {
    const rId = gameState.rulesetId || "folk";
    return getRuleSet(rId as "folk" | "international");
  }, [gameState.rulesetId]);

  // Targets calculation for chessboard
  const targets = useMemo(() => {
    if (matchStatus !== "playing" || selectedSquare === null || gameState.turn !== player.color) {
      return [];
    }
    return legalMoves(gameState.board, selectedSquare, activeRuleset);
  }, [matchStatus, gameState.board, gameState.turn, selectedSquare, player.color, activeRuleset]);

  const checkSquare = useMemo(() => {
    if (!gameState.isCheck) return null;
    return findKing(gameState.board, gameState.turn);
  }, [gameState.board, gameState.isCheck, gameState.turn]);

  // Realtime countdown clock calculation
  const { whiteSeconds, blackSeconds } = useMemo(() => {
    if (!gameState.clocks) {
      return { whiteSeconds: 3600, blackSeconds: 3600 };
    }
    const turn = gameState.turn;
    const elapsed =
      matchStatus === "playing" && gameState.lastTurnTimestamp
        ? Math.max(0, now - gameState.lastTurnTimestamp)
        : 0;

    const wMs =
      turn === "w" && matchStatus === "playing"
        ? Math.max(0, gameState.clocks.w - elapsed)
        : gameState.clocks.w;
    const bMs =
      turn === "b" && matchStatus === "playing"
        ? Math.max(0, gameState.clocks.b - elapsed)
        : gameState.clocks.b;

    return {
      whiteSeconds: Math.floor(wMs / 1000),
      blackSeconds: Math.floor(bMs / 1000),
    };
  }, [gameState.clocks, gameState.turn, gameState.lastTurnTimestamp, matchStatus, now]);

  const isMyTurn = gameState.turn === player.color;
  const isOpponentTurn = player.color ? gameState.turn !== player.color : false;
  const isFlipped = player.color === "b";
  const opponentColor: Color = player.color === "w" ? "b" : "w";

  // AFK calculation (2m / 2m / 1m)
  const isAfkMode = gameState.afkEnabled ?? activeRuleset.id === "folk";
  const currentTurnStrikes =
    gameState.turn === "w" ? (gameState.afkStrikes?.w ?? 0) : (gameState.afkStrikes?.b ?? 0);
  const afkLimitSec = currentTurnStrikes >= 2 ? 60 : 120;
  const turnElapsedSec =
    matchStatus === "playing" && gameState.lastTurnTimestamp
      ? Math.floor(Math.max(0, now - gameState.lastTurnTimestamp) / 1000)
      : 0;
  const afkRemainingSec = Math.max(0, afkLimitSec - turnElapsedSec);

  const activeTurnRemainingSec = isAfkMode
    ? afkRemainingSec
    : gameState.turn === "w"
      ? whiteSeconds
      : blackSeconds;

  const isLowTime =
    matchStatus === "playing" && activeTurnRemainingSec <= 10 && activeTurnRemainingSec > 0;

  const whiteStrikes = gameState.afkStrikes?.w ?? 0;
  const blackStrikes = gameState.afkStrikes?.b ?? 0;
  const myStrikes = player.color === "w" ? whiteStrikes : blackStrikes;
  const oppStrikes = opponentColor === "w" ? whiteStrikes : blackStrikes;

  const myTotalClockSec = player.color === "w" ? whiteSeconds : blackSeconds;
  const oppTotalClockSec = opponentColor === "w" ? whiteSeconds : blackSeconds;

  // 10s audio warning
  const lastWarningSecondRef = useRef<number | null>(null);
  useEffect(() => {
    lastWarningSecondRef.current = null;
  }, [gameState.turn, gameState.moveCount]);

  useEffect(() => {
    if (
      matchStatus === "playing" &&
      isMyTurn &&
      activeTurnRemainingSec <= 10 &&
      activeTurnRemainingSec > 0
    ) {
      if (lastWarningSecondRef.current !== activeTurnRemainingSec) {
        lastWarningSecondRef.current = activeTurnRemainingSec;
        audioManager.playSfx("countdown_warning");
      }
    }
  }, [matchStatus, isMyTurn, activeTurnRemainingSec]);

  // Check SFX trigger on incoming check
  const prevCheckRef = useRef<boolean>(false);
  useEffect(() => {
    if (matchStatus === "playing" && gameState.isCheck && !prevCheckRef.current) {
      audioManager.playSfx("check");
    }
    prevCheckRef.current = !!gameState.isCheck;
  }, [matchStatus, gameState.isCheck]);

  const playerCaptured = useMemo(() => {
    return getCapturedPieces(gameState.board, player.color || "w");
  }, [gameState.board, player.color]);

  const opponentCaptured = useMemo(() => {
    return getCapturedPieces(gameState.board, opponentColor);
  }, [gameState.board, opponentColor]);

  // Square click handler
  const handleSquareClick = useCallback(
    (index: number) => {
      if (matchStatus !== "playing" || gameState.turn !== player.color) return;
      const clickedPiece = gameState.board[index];

      if (selectedSquare === null) {
        if (clickedPiece && clickedPiece.color === player.color) {
          setSelectedSquare(index);
        }
        return;
      }

      if (clickedPiece && clickedPiece.color === player.color) {
        setSelectedSquare(index);
        return;
      }

      if (targets.includes(index)) {
        const taken = gameState.board[index];
        const isPromotion =
          gameState.board[selectedSquare]?.type === "p" &&
          (activeRuleset.id === "folk" ? index < 8 || index >= 56 : true);

        if (isPromotion) audioManager.playSfx("promotion");
        else if (taken) audioManager.playSfx("capture");
        else audioManager.playSfx("move");

        makeMove(selectedSquare, index);
        setSelectedSquare(null);
      } else {
        setSelectedSquare(null);
      }
    },
    [
      matchStatus,
      gameState.board,
      gameState.turn,
      player.color,
      selectedSquare,
      targets,
      activeRuleset.id,
      makeMove,
    ],
  );

  // Sound triggers on end
  const prevWinnerRef = useRef<Color | "draw" | null>(null);
  useEffect(() => {
    if (matchStatus === "finished" && gameState.winner && !prevWinnerRef.current) {
      const isCheckmate =
        gameState.status === "checkmate" ||
        gameState.reason === "checkmate" ||
        gameState.endReason === "checkmate";
      if (isCheckmate) {
        audioManager.playSfx("checkmate");
      }
      if (gameState.winner === player.color) audioManager.playSfx("victory");
      else if (gameState.winner === "draw") audioManager.playSfx("draw");
      else audioManager.playSfx("defeat");
    }
    prevWinnerRef.current = gameState.winner || null;
  }, [
    matchStatus,
    gameState.winner,
    gameState.status,
    gameState.reason,
    gameState.endReason,
    player.color,
  ]);

  // Sound triggers on opponent move (without duplicate on self move)
  const lastMoveCountRef = useRef<number>(gameState.moveCount || 0);
  useEffect(() => {
    const currentCount = gameState.moveCount || 0;
    if (matchStatus === "playing" && currentCount > lastMoveCountRef.current) {
      if (gameState.lastMove && gameState.lastMove.color === opponentColor) {
        const destPiece = gameState.board[gameState.lastMove.to];
        if (destPiece?.type === "f" || destPiece?.type === "q") {
          audioManager.playSfx("promotion");
        } else {
          audioManager.playSfx("move");
        }
      }
    }
    lastMoveCountRef.current = currentCount;
  }, [matchStatus, gameState.moveCount, gameState.lastMove, gameState.board, opponentColor]);

  const isWinner = gameState.winner === player.color;
  const isDraw = gameState.winner === "draw";

  // Game over reason description
  let gameOverReasonText = t("game_over");
  if (gameState.reason === "afk_timeout" || gameState.endReason === "afk_timeout") {
    const timedOutPlayer =
      gameState.result?.timedOutPlayer ||
      (gameState.winner === "w" ? "b" : gameState.winner === "b" ? "w" : null);
    gameOverReasonText =
      timedOutPlayer === "w" ? t("white_afk_timeout_desc") : t("black_afk_timeout_desc");
  } else if (gameState.reason === "timeout" || gameState.endReason === "timeout") {
    const timedOutPlayer =
      gameState.result?.timedOutPlayer ||
      (gameState.winner === "w" ? "b" : gameState.winner === "b" ? "w" : null);
    gameOverReasonText = timedOutPlayer === "w" ? t("white_timeout_desc") : t("black_timeout_desc");
  } else if (gameState.reason === "resignation" || gameState.endReason === "resignation") {
    gameOverReasonText = isWinner
      ? player.color === "w"
        ? t("black_resigned_desc")
        : t("white_resigned_desc")
      : player.color === "w"
        ? t("white_resigned_desc")
        : t("black_resigned_desc");
  } else if (gameState.reason === "draw_agreement" || gameState.endReason === "draw_agreement") {
    gameOverReasonText = t("reason_draw_agreement");
  } else if (gameState.reason === "disconnect" || gameState.endReason === "disconnect") {
    gameOverReasonText = isWinner ? t("opponent_disconnected") : t("server_disconnected");
  } else if (gameState.reason === "player_left" || gameState.endReason === "player_left") {
    gameOverReasonText = t("opponent_left");
  } else if (gameState.reason === "checkmate" || gameState.endReason === "checkmate") {
    gameOverReasonText = isWinner
      ? `${t("victory")} — ${t("reason_checkmate")}`
      : `${t("defeat")} — ${t("reason_checkmate")}`;
  } else if (gameState.reason === "king_capture" || gameState.endReason === "king_capture") {
    gameOverReasonText = isWinner
      ? `${t("victory")} — ${t("reason_king_capture")}`
      : `${t("defeat")} — ${t("reason_king_capture")}`;
  } else if (gameState.reason === "stalemate" || gameState.endReason === "stalemate") {
    gameOverReasonText = `${t("draw")} — ${t("reason_stalemate")}`;
  } else if (gameState.reason === "mij" || gameState.endReason === "mij") {
    gameOverReasonText = `${t("draw")} — ${t("reason_mij")}`;
  }

  return (
    <main
      id="online-match-arena"
      className="min-h-screen bg-background text-foreground flex flex-col justify-between p-2 sm:p-4 max-w-xl mx-auto select-none overflow-x-hidden"
    >
      {/* 1. TOP COMPACT CONTROL ROW */}
      <header
        id="arena-header-controls"
        className="flex items-center justify-between gap-1.5 pb-2 pt-1 border-b border-border/40"
      >
        {/* Left: Settings Dropdowns (Audio, Piece Style, Board Theme) */}
        <div className="flex items-center gap-1.5">
          {/* Audio Popover */}
          <div className="relative" ref={audioPopoverRef}>
            <button
              type="button"
              onClick={() => {
                setShowAudioPopover((p) => !p);
                setShowPiecePopover(false);
                setShowThemePopover(false);
              }}
              aria-label={t("audio_on_off")}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                !settings.sound && settings.bgmTrack === "off"
                  ? "border-border/60 bg-secondary/40 text-muted-foreground"
                  : "border-gold/50 bg-secondary text-gold-dark shadow-xs"
              }`}
            >
              {!settings.sound && settings.bgmTrack === "off" ? (
                <VolumeX className="h-4 w-4" />
              ) : settings.sfxVolume > 0.5 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <Volume1 className="h-4 w-4" />
              )}
            </button>

            {showAudioPopover && (
              <div className="kbach-frame absolute left-0 top-10 z-50 w-60 rounded-2xl border border-gold/50 bg-card p-3 shadow-2xl animate-fade-in space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>{t("sound_effects")}</span>
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
                <KbachDivider className="my-1" />
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

          {/* Piece Style Selector */}
          <div className="relative" ref={piecePopoverRef}>
            <button
              type="button"
              onClick={() => {
                setShowPiecePopover((p) => !p);
                setShowAudioPopover(false);
                setShowThemePopover(false);
              }}
              title={t("piece_style_picker")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 transition-all active:scale-95"
            >
              <Palette className="h-4 w-4 text-gold-dark" />
            </button>

            {showPiecePopover && (
              <div className="kbach-frame absolute left-0 top-10 z-50 w-52 rounded-2xl border border-gold/50 bg-card p-2 shadow-2xl animate-fade-in space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                  {t("piece_style_picker")}
                </span>
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
            )}
          </div>

          {/* Board Theme Selector */}
          <div className="relative" ref={themePopoverRef}>
            <button
              type="button"
              onClick={() => {
                setShowThemePopover((p) => !p);
                setShowAudioPopover(false);
                setShowPiecePopover(false);
              }}
              title={t("board_theme_picker")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 transition-all active:scale-95"
            >
              <Layers className="h-4 w-4 text-gold-dark" />
            </button>

            {showThemePopover && (
              <div className="kbach-frame absolute left-0 top-10 z-50 w-52 rounded-2xl border border-gold/50 bg-card p-2 shadow-2xl animate-fade-in space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                  {t("board_theme_picker")}
                </span>
                {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((themeKey) => {
                  const isCur = settings.boardTheme === themeKey;
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
                      <span>{BOARD_THEMES[themeKey].label}</span>
                      {isCur && <Check className="h-3.5 w-3.5 text-gold-dark" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Match Mode Badge */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-card border border-gold/30 shadow-xs">
            {activeRuleset.id === "folk" ? (
              <Shield className="h-3.5 w-3.5 text-gold-dark" />
            ) : (
              <Trophy className="h-3.5 w-3.5 text-gold-dark" />
            )}
            <span className="font-serif font-bold text-foreground text-[11px]">
              {gameState.clocks?.w === 300000
                ? t("blitz_ruleset_tag")
                : activeRuleset.id === "folk"
                  ? t("folk_ruleset")
                  : t("international_ruleset")}
            </span>
          </div>

          {/* Navigation Exit Button (Triggers Navigation Lock Modal) */}
          <button
            type="button"
            onClick={() => {
              if (matchStatus === "playing") {
                setShowNavLockModal(true);
              } else {
                resetToMenu();
                navigate({ to: "/home" });
              }
            }}
            className="flex h-8 px-2.5 items-center justify-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-semibold transition-all active:scale-95"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>{matchStatus === "playing" ? t("leave") : t("home")}</span>
          </button>
        </div>
      </header>

      {/* 1.1 NETWORK RECOVERY BANNER */}
      {connectionStatus !== "connected" && (
        <div
          role="alert"
          aria-live="assertive"
          className="my-1.5 flex items-center justify-between rounded-2xl border border-red-500/60 bg-red-500/15 p-2.5 text-xs text-red-300 animate-pulse shadow-md"
        >
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-red-400 shrink-0" />
            <span className="font-semibold">{t("network_reconnecting_banner")}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onlineClient.connect();
              if (room?.id) {
                onlineClient.reconnectGame(room.id, player.sessionToken, player.color || undefined);
              }
            }}
            className="px-3 py-1 min-h-[36px] rounded-xl bg-red-500/30 hover:bg-red-500/40 text-white font-bold text-xs border border-red-500/50 active:scale-95 transition-all"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* 1.2 OPPONENT RECONNECTING NOTICE BANNER */}
      {opponentNotice && (
        <div
          role="status"
          className="my-1.5 flex items-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/15 p-2.5 text-xs text-amber-300 animate-fade-in shadow-xs"
        >
          <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
          <span className="font-semibold">{opponentNotice}</span>
        </div>
      )}

      {/* 1.3 ERROR BANNER */}
      {error && connectionStatus === "connected" && (
        <div
          role="alert"
          className="my-1.5 flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. OPPONENT PLAYER CARD (Integrated Total Clock + AFK Turn Timer + Strikes) */}
      <section
        id="opponent-card"
        className={`flex items-center justify-between rounded-2xl border p-1.5 sm:p-2.5 transition-all duration-300 ${
          isOpponentTurn && matchStatus === "playing"
            ? "border-amber-500 bg-amber-500/15 shadow-[0_0_24px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/70"
            : "border-border/80 bg-card shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative">
            <div
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-2xl border flex items-center justify-center font-serif font-bold text-sm shadow-xs ${
                opponentColor === "w"
                  ? "bg-amber-50 border-gold/60 text-stone-900"
                  : "bg-stone-900 border-stone-600 text-stone-100"
              }`}
            >
              {opponentColor === "w" ? "♔" : "♚"}
            </div>
            {isOpponentTurn && matchStatus === "playing" && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-background animate-ping" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                {opponent?.name || t("opponent")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({opponentColor === "w" ? t("white") : t("black")})
              </span>
            </div>

            {/* Sub-status: AFK Strikes & Turn Indicator */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAfkMode && oppStrikes > 0 && (
                <span className="rounded-md border border-red-500/50 bg-red-500/15 px-1.5 py-0.2 text-[9px] font-bold text-red-400">
                  {t("afk_badge")}: {oppStrikes}/3
                </span>
              )}
              {isOpponentTurn && matchStatus === "playing" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-bold animate-pulse ${
                    gameState.isCheck
                      ? "bg-red-500/20 text-red-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-ping ${
                      gameState.isCheck ? "bg-red-400" : "bg-amber-400"
                    }`}
                  />
                  {gameState.isCheck ? t("check") : t("opponent_turn")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Opponent Clocks & Captured Pieces */}
        <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono">
            {/* Total Match Clock */}
            <div
              className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-bold border transition-all ${
                isOpponentTurn && matchStatus === "playing"
                  ? "border-gold bg-gold/20 text-gold-dark shadow-xs"
                  : "border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{formatTime(oppTotalClockSec)}</span>
            </div>

            {/* AFK Turn Countdown Timer (if AFK mode enabled) */}
            {isAfkMode && isOpponentTurn && matchStatus === "playing" && (
              <div
                className={`rounded-xl px-2 py-0.5 text-xs font-bold border transition-all ${
                  isLowTime
                    ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500"
                    : "border-amber-500/50 bg-amber-500/10 text-amber-500"
                }`}
              >
                <span>{formatTime(afkRemainingSec)}</span>
              </div>
            )}
          </div>
          <CapturedRow pieces={opponentCaptured} color={opponentColor} />
        </div>
      </section>

      {/* 2b. OPPONENT RECONNECTION NOTICE BANNER */}
      {opponentNotice && matchStatus === "playing" && (
        <div className="my-0.5 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>{opponentNotice}</span>
        </div>
      )}

      {/* 3. DRAW OFFER & NOTICES BANNER */}
      {drawOfferReceived && matchStatus === "playing" && (
        <div className="my-0.5 flex items-center justify-between rounded-2xl border border-gold bg-gold/20 p-2 text-xs animate-rise shadow-md">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-gold-dark shrink-0" />
            <span className="font-semibold text-foreground">{t("draw_offered_by_opp")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={acceptDraw}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[11px] shadow-sm hover:bg-emerald-500 active:scale-95 transition-all"
            >
              {t("accept_draw")}
            </button>
            <button
              type="button"
              onClick={declineDraw}
              className="px-2.5 py-1 rounded-xl bg-secondary text-foreground font-semibold text-[11px] border border-border hover:bg-secondary/80 active:scale-95 transition-all"
            >
              {t("decline_draw")}
            </button>
          </div>
        </div>
      )}

      {drawOfferSent && matchStatus === "playing" && (
        <div className="my-0.5 flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold-dark animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-gold animate-ping" />
          <span>{t("draw_offered_by_you")}</span>
        </div>
      )}

      {drawDeclinedNotice && matchStatus === "playing" && (
        <div className="my-0.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs text-amber-400 text-center animate-fade-in">
          {t("draw_declined_msg")}
        </div>
      )}

      {/* 4. CHESS BOARD CONTAINER */}
      <section
        id="chess-board-area"
        className="w-full flex-1 flex flex-col justify-center items-center py-0.5"
      >
        <ChessBoard
          board={gameState.board}
          selected={selectedSquare}
          targets={targets}
          lastMove={gameState.lastMove || null}
          checkSquare={checkSquare}
          showCheckBanner={false}
          showCheckmateBanner={
            matchStatus === "finished" &&
            (gameState.status === "checkmate" ||
              gameState.reason === "checkmate" ||
              gameState.endReason === "checkmate")
          }
          flipped={isFlipped}
          onSquare={handleSquareClick}
        />
      </section>

      {/* 5. YOU PLAYER CARD (Integrated Total Clock + AFK Turn Timer + Strikes) */}
      <section
        id="user-card"
        className={`flex items-center justify-between rounded-2xl border p-1.5 sm:p-2.5 transition-all duration-300 ${
          isMyTurn && matchStatus === "playing"
            ? "border-gold bg-gold/20 shadow-[0_0_28px_rgba(212,175,55,0.35)] ring-2 ring-gold/80"
            : "border-border/80 bg-card shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative">
            <div
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-2xl border flex items-center justify-center font-serif font-bold text-sm shadow-xs ${
                player.color === "w"
                  ? "bg-amber-50 border-gold/60 text-stone-900"
                  : "bg-stone-900 border-stone-600 text-stone-100"
              }`}
            >
              {player.color === "w" ? "♔" : "♚"}
            </div>
            {isMyTurn && matchStatus === "playing" && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gold ring-2 ring-background animate-ping" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                {player.name || t("player")}
              </span>
              <span className="text-[10px] text-gold-dark font-medium">
                ({player.color === "w" ? t("white") : t("black")})
              </span>
            </div>

            {/* Sub-status: AFK Strikes & Turn Indicator */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAfkMode && myStrikes > 0 && (
                <span className="rounded-md border border-red-500/50 bg-red-500/15 px-1.5 py-0.2 text-[9px] font-bold text-red-400">
                  {t("afk_badge")}: {myStrikes}/3
                </span>
              )}
              {isMyTurn && matchStatus === "playing" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-extrabold animate-pulse ${
                    gameState.isCheck ? "bg-red-500/20 text-red-400" : "bg-gold/30 text-gold-dark"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-ping ${
                      gameState.isCheck ? "bg-red-400" : "bg-gold"
                    }`}
                  />
                  {gameState.isCheck ? t("check") : t("your_turn")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Your Clocks & Captured Pieces */}
        <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono">
            {/* Total Match Clock */}
            <div
              className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-bold border transition-all ${
                isMyTurn && matchStatus === "playing"
                  ? "border-gold bg-gold/20 text-gold-dark shadow-xs"
                  : "border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{formatTime(myTotalClockSec)}</span>
            </div>

            {/* AFK Turn Countdown Timer (if AFK mode enabled) */}
            {isAfkMode && isMyTurn && matchStatus === "playing" && (
              <div
                className={`rounded-xl px-2 py-0.5 text-xs font-bold border transition-all ${
                  isLowTime
                    ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse ring-2 ring-red-500 shadow-sm"
                    : "border-gold bg-gold/20 text-gold-dark"
                }`}
              >
                <span>{formatTime(afkRemainingSec)}</span>
              </div>
            )}
          </div>
          <CapturedRow pieces={playerCaptured} color={player.color || "w"} />
        </div>
      </section>

      {/* 6. BOTTOM ACTION BAR: [ CẦU HÒA ] [ ĐẦU HÀNG ] [ TRÒ CHUYỆN ] */}
      <footer id="arena-bottom-actions" className="flex gap-2 pt-1">
        {/* Draw Offer Button */}
        <button
          type="button"
          disabled={matchStatus !== "playing" || drawOfferSent}
          onClick={offerDraw}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
            drawOfferSent
              ? "border-gold/40 bg-gold/10 text-gold-dark opacity-80"
              : matchStatus !== "playing"
                ? "border-border bg-secondary/40 text-muted-foreground opacity-40 cursor-not-allowed"
                : "border-border bg-secondary/70 text-foreground hover:border-gold hover:text-gold-dark active:scale-95"
          }`}
        >
          <Handshake className="h-4 w-4" />
          <span>{drawOfferSent ? t("draw_offered_by_you") : t("draw_offer")}</span>
        </button>

        {/* Resign Button */}
        <button
          type="button"
          disabled={matchStatus !== "playing"}
          onClick={() => setConfirmResignOpen(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary/70 py-2.5 text-xs font-semibold text-foreground transition-all ${
            matchStatus !== "playing"
              ? "opacity-40 cursor-not-allowed"
              : "hover:border-red-500/60 hover:text-red-400 active:scale-95"
          }`}
        >
          <Flag className="h-4 w-4" />
          <span>{t("resign")}</span>
        </button>

        {/* Chat Toggle Button */}
        <button
          type="button"
          onClick={handleToggleChat}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold transition-all active:scale-95 ${
            chatOpen
              ? "border-gold bg-gold/20 text-gold-dark shadow-xs"
              : "border-border bg-secondary/70 text-foreground hover:border-gold/60"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{t("chat")}</span>
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </footer>

      {/* 7. REALTIME IN-GAME CHAT PANEL */}
      {chatOpen && (
        <div className="kbach-frame mt-2 flex flex-col rounded-3xl border border-gold/50 bg-card p-3 shadow-2xl animate-fade-in space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-gold-dark" />
              <span className="font-serif text-xs font-bold text-foreground">{t("chat")}</span>
              <span className="text-[10px] text-muted-foreground">({messages.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label={t("chat_close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic">
                {t("chat_empty")}
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === player.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl px-2.5 py-1 text-xs ${
                      isMe
                        ? "self-end bg-gold/20 border border-gold/40 text-foreground"
                        : "self-start bg-secondary border border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground pb-0.5">
                      <span
                        className={
                          isMe ? "text-gold-dark font-semibold" : "text-foreground font-semibold"
                        }
                      >
                        {isMe ? t("chat_you") : msg.senderName}
                      </span>
                      <span className="font-mono text-[8px] opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-1 border-t border-border/50">
            <input
              type="text"
              maxLength={200}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t("chat_placeholder")}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="shimmer-sheen bg-royal flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 font-serif text-xs font-semibold text-primary-foreground shadow-gold transition-all active:scale-95 disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              <span>{t("chat_send")}</span>
            </button>
          </form>
        </div>
      )}

      {/* 8. RESIGN CONFIRMATION MODAL */}
      {confirmResignOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="kbach-frame w-full max-w-sm rounded-3xl border border-gold/40 bg-card p-5 shadow-2xl animate-rise space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  {t("resign_confirm_title")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t("resign_confirm_desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmResignOpen(false)}
                className="flex-1 rounded-2xl border border-border bg-secondary/80 py-2 text-xs font-semibold text-foreground hover:bg-secondary active:scale-95"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmResignOpen(false);
                  resign();
                }}
                className="flex-1 rounded-2xl bg-red-600/90 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-600 active:scale-95"
              >
                {t("confirm_resign")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. NAVIGATION LOCK MODAL (Only 2 functional choices: Resign/Forfeit or Offer Draw or Stay) */}
      {showNavLockModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame w-full max-w-sm rounded-3xl border border-gold/50 bg-card p-6 shadow-2xl animate-rise space-y-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                {t("nav_locked_title")}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {t("nav_locked_desc")}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {/* Option 1: Forfeit and Resign */}
              <button
                type="button"
                onClick={() => {
                  setShowNavLockModal(false);
                  resign();
                  setTimeout(() => {
                    resetToMenu();
                    navigate({ to: "/home" });
                  }, 100);
                }}
                className="w-full rounded-2xl bg-red-600/90 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-600 transition-all active:scale-95"
              >
                {t("forfeit_and_leave")}
              </button>

              {/* Option 2: Offer Draw instead */}
              <button
                type="button"
                onClick={() => {
                  setShowNavLockModal(false);
                  offerDraw();
                }}
                className="w-full rounded-2xl border border-gold/50 bg-gold/15 py-2.5 text-xs font-bold text-gold-dark hover:bg-gold/25 transition-all active:scale-95"
              >
                {t("or_offer_draw_first")}
              </button>

              {/* Option 3: Cancel / Stay */}
              <button
                type="button"
                onClick={() => setShowNavLockModal(false)}
                className="w-full rounded-2xl border border-border bg-secondary/80 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-all active:scale-95"
              >
                {t("stay")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. GAME OVER MODAL (With Full Rematch Infrastructure) */}
      {matchStatus === "finished" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <div className="kbach-frame relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/50 bg-card p-6 shadow-2xl text-center space-y-4 animate-rise">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-gold/15 blur-2xl pointer-events-none" />

            <div className="relative mx-auto flex justify-center">
              <span className="animate-glow absolute inset-0 rounded-full bg-gold/30 blur-xl" />
              <div
                className={`grid h-16 w-16 place-items-center rounded-2xl border ${
                  isWinner
                    ? "border-gold bg-gold/20 text-gold-dark shadow-gold"
                    : isDraw
                      ? "border-gold/40 bg-secondary text-gold-dark"
                      : "border-gold/40 bg-secondary/80 text-gold-dark"
                }`}
              >
                {isWinner ? (
                  <Trophy className="h-8 w-8 text-gold-dark animate-pop" />
                ) : isDraw ? (
                  <Shield className="h-8 w-8 text-gold-dark animate-pop" />
                ) : (
                  <Flag className="h-8 w-8 text-muted-foreground animate-pop" />
                )}
              </div>
            </div>

            <div>
              <span className="rounded-full border border-gold/40 bg-secondary/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
                {t("game_over")}
              </span>
              <h3 className="font-serif text-2xl font-black tracking-tight text-foreground mt-2">
                {isWinner ? t("victory") : isDraw ? t("draw") : t("defeat")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{gameOverReasonText}</p>
            </div>

            {/* Rematch Status Banners */}
            {opponent?.connected === false && (
              <div className="p-2.5 rounded-2xl border border-border bg-secondary/80 text-xs text-muted-foreground text-center animate-fade-in flex items-center justify-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{t("rematch_opp_left")}</span>
              </div>
            )}

            {rematchOfferReceived && opponent?.connected !== false && (
              <div className="p-3 rounded-2xl border border-gold bg-gold/20 text-xs animate-rise space-y-2">
                <span className="font-bold text-foreground block">
                  {t("rematch_requested_by_opp")}
                </span>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={requestRematch}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>{t("accept_rematch")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={declineRematch}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-secondary text-foreground font-semibold text-xs border border-border hover:bg-secondary/80 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    <span>{t("decline_rematch")}</span>
                  </button>
                </div>
              </div>
            )}

            {rematchOfferSent && (
              <div className="p-2.5 rounded-2xl border border-gold/40 bg-gold/10 text-xs text-gold-dark flex items-center justify-center gap-2 animate-fade-in">
                <Loader2 className="h-4 w-4 animate-spin text-gold-dark shrink-0" />
                <span>{t("rematch_requested_by_you")}</span>
              </div>
            )}

            {rematchDeclinedNotice && (
              <div className="p-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 text-xs text-amber-400 text-center animate-fade-in">
                {t("rematch_declined_msg")}
              </div>
            )}

            <KbachDivider className="my-2" />

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={rematchOfferSent || opponent?.connected === false}
                onClick={requestRematch}
                className="min-h-[44px] shimmer-sheen bg-royal flex items-center justify-center gap-2 rounded-2xl py-3 px-4 font-serif text-xs font-semibold text-primary-foreground shadow-gold transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t("rematch_request")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToMenu();
                }}
                className="min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-secondary/80 py-3 px-4 font-serif text-xs font-semibold text-foreground transition-all duration-300 hover:border-gold hover:bg-gold/10 active:scale-95"
              >
                <Swords className="h-4 w-4 text-gold-dark" />
                <span>{t("return_to_online")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
