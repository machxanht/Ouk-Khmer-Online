import { useState, useEffect, useRef } from "react";
import {
  squareName,
  PIECE_NAMES,
  type Board,
  type Color,
  type PieceType,
} from "../lib/khmer-chess";
import { BOARD_THEMES, getPieceSrc, useSettings } from "../lib/settings";

export function ChessBoard({
  board,
  selected,
  targets,
  lastMove,
  checkSquare,
  flipped,
  touchLocked,
  showCheckBanner,
  showCheckmateBanner,
  splashTrigger,
  className,
  onSquare,
}: {
  board: Board;
  selected: number | null;
  targets: number[];
  lastMove: { from: number; to: number } | null;
  checkSquare: number | null;
  flipped: boolean;
  touchLocked?: boolean;
  showCheckBanner?: boolean;
  showCheckmateBanner?: boolean;
  splashTrigger?: number;
  className?: string;
  onSquare: (i: number) => void;
}) {
  const { boardTheme, pieceStyle, motion } = useSettings();
  const theme = BOARD_THEMES[boardTheme];
  const order = Array.from({ length: 64 }, (_, i) => (flipped ? 63 - i : i));

  // Paint the complete geometry of the latest move, not only its endpoints.
  // A knight deliberately draws an L-shaped trail so its jump is immediately readable.
  const lastMoveTrail = (() => {
    const trail = new Set<number>();
    if (!lastMove) return trail;

    const { from, to } = lastMove;
    trail.add(from);
    trail.add(to);

    const fromRow = Math.floor(from / 8);
    const fromCol = from % 8;
    const toRow = Math.floor(to / 8);
    const toCol = to % 8;
    const rowDelta = toRow - fromRow;
    const colDelta = toCol - fromCol;
    const movedPiece = board[to];

    if (
      movedPiece?.type === "n" &&
      ((Math.abs(rowDelta) === 2 && Math.abs(colDelta) === 1) ||
        (Math.abs(rowDelta) === 1 && Math.abs(colDelta) === 2))
    ) {
      if (Math.abs(rowDelta) === 2) {
        trail.add((fromRow + Math.sign(rowDelta)) * 8 + fromCol);
        trail.add(toRow * 8 + fromCol);
      } else {
        trail.add(fromRow * 8 + fromCol + Math.sign(colDelta));
        trail.add(fromRow * 8 + toCol);
      }
      return trail;
    }

    const aligned =
      rowDelta === 0 || colDelta === 0 || Math.abs(rowDelta) === Math.abs(colDelta);
    if (!aligned) return trail;

    const rowStep = Math.sign(rowDelta);
    const colStep = Math.sign(colDelta);
    let row = fromRow + rowStep;
    let col = fromCol + colStep;
    while (row !== toRow || col !== toCol) {
      trail.add(row * 8 + col);
      row += rowStep;
      col += colStep;
    }

    return trail;
  })();

  // Check/Checkmate/King Capture 3-second non-blocking calligraphy splash state.
  // Trigger on the check event itself and let the splash finish even if AI answers immediately.
  const [showMateSplash, setShowMateSplash] = useState(false);
  const [splashKey, setSplashKey] = useState(0);
  const previousCheckRef = useRef(false);
  const previousCheckmateRef = useRef(false);
  const previousSplashTriggerRef = useRef(splashTrigger ?? 0);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextTrigger = splashTrigger ?? 0;
    const checkStarted = Boolean(showCheckBanner) && !previousCheckRef.current;
    const checkmateStarted = Boolean(showCheckmateBanner) && !previousCheckmateRef.current;
    const explicitTrigger = nextTrigger !== previousSplashTriggerRef.current;

    previousCheckRef.current = Boolean(showCheckBanner);
    previousCheckmateRef.current = Boolean(showCheckmateBanner);
    previousSplashTriggerRef.current = nextTrigger;

    if (!checkStarted && !checkmateStarted && !explicitTrigger) return;

    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    setSplashKey((k) => k + 1);
    setShowMateSplash(true);
    splashTimerRef.current = setTimeout(() => {
      setShowMateSplash(false);
      splashTimerRef.current = null;
    }, 3000);
  }, [showCheckmateBanner, showCheckBanner, splashTrigger]);

  useEffect(() => {
    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`kbach-frame relative bg-royal rounded-2xl p-1.5 sm:p-2 shadow-lg w-full ${className || ""}`}
    >
      <div className="grid grid-cols-8 overflow-hidden rounded-xl w-full aspect-square relative">
        {/* CHECK / CHECKMATE SPLASH: Pure Calligraphy 'អុក', No frame/card/box/border/bg, 3s dissolve */}
        {showMateSplash && (
          <div
            key={splashKey}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <div className="animate-ouk-splash relative flex items-center justify-center select-none">
              {/* Dynamic Golden Radiant Aura */}
              <span className="absolute -inset-24 rounded-full bg-radial from-amber-400/60 via-amber-500/25 to-transparent blur-3xl pointer-events-none" />
              <span className="absolute -inset-12 rounded-full bg-radial from-yellow-300/60 via-amber-400/30 to-transparent blur-xl pointer-events-none" />
              {/* Calligraphy Khmer Display Ouk */}
              <span className="khmer-ouk-calligraphy relative text-8xl sm:text-9xl md:text-[11rem] lg:text-[13rem] font-normal leading-none tracking-normal text-amber-300">
                អុក
              </span>
            </div>
          </div>
        )}

        {order.map((i) => {
          const piece = board[i];
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const isTarget = targets.includes(i);
          const isSelected = selected === i;
          const isLast = lastMoveTrail.has(i);
          const isCheck = checkSquare === i;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSquare(i)}
              aria-label={squareName(i)}
              className="relative aspect-square select-none p-1 transition-transform active:scale-[0.98]"
              style={{ background: isDark ? theme.dark : theme.light }}
            >
              {/* Last Move Overlay */}
              {isLast ? (
                <span
                  className={`absolute inset-0 pointer-events-none ${
                    lastMove?.to === i
                      ? "bg-amber-300/50 ring-2 ring-inset ring-amber-500/80"
                      : lastMove?.from === i
                        ? "bg-amber-300/35 ring-1 ring-inset ring-amber-500/60"
                        : "bg-amber-300/30 ring-1 ring-inset ring-amber-400/35"
                  }`}
                />
              ) : null}

              {/* Selected Square Overlay (with Touch-Move Lock indicator if locked) */}
              {isSelected ? (
                <>
                  <span
                    className={`absolute inset-0 pointer-events-none ring-2 ring-inset ${
                      touchLocked ? "bg-amber-500/20 ring-amber-500" : "bg-gold/20 ring-gold"
                    }`}
                  />
                  {touchLocked ? (
                    <span className="absolute top-0.5 right-0.5 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-background shadow pointer-events-none">
                      🔒
                    </span>
                  ) : null}
                </>
              ) : null}

              {/* Threatened King Check/Ouk Visual Indicator */}
              {isCheck ? (
                <span className="absolute inset-0 z-10 animate-pulse pointer-events-none bg-destructive/35 ring-2 ring-inset ring-destructive shadow-[0_0_12px_rgba(220,38,38,0.5)]" />
              ) : null}

              {/* Legal Move Target: Empty Square Dot */}
              {isTarget && !piece ? (
                <span className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <span className="h-3 w-3 rounded-full bg-gold-dark/70 shadow-xs ring-1 ring-gold/50" />
                </span>
              ) : null}

              {/* Legal Move Target: Enemy Piece Capture Ring */}
              {isTarget && piece ? (
                <span className="absolute inset-0 z-10 pointer-events-none ring-[3px] ring-inset ring-destructive/80 bg-destructive/15" />
              ) : null}

              {/* SVG Piece */}
              {piece ? (
                <span
                  className={`absolute inset-0 flex items-center justify-center p-1 ${
                    motion ? "animate-pop" : ""
                  }`}
                >
                  <img
                    src={getPieceSrc(pieceStyle, piece.color, piece.type)}
                    alt={`${piece.color === "w" ? "White" : "Black"} ${PIECE_NAMES[piece.type].en}`}
                    className="h-full w-full object-contain select-none pointer-events-none drop-shadow-md"
                    draggable={false}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GLYPH_MAP: Record<string, PieceType> = {
  "♚": "k",
  "♛": "q",
  "♝": "b",
  "♞": "n",
  "♜": "r",
  "♟": "p",
  "⚇": "f",
  k: "k",
  q: "q",
  b: "b",
  n: "n",
  r: "r",
  p: "p",
  f: "f",
};

export function CapturedRow({ pieces, color }: { pieces: string[]; color: Color }) {
  const { pieceStyle } = useSettings();
  return (
    <div className="flex min-h-6 flex-wrap items-center gap-1 leading-none">
      {pieces.map((g, i) => {
        const type = GLYPH_MAP[g];
        return type ? (
          <img
            key={i}
            src={getPieceSrc(pieceStyle, color, type)}
            alt={g}
            className="h-5 w-5 object-contain inline-block animate-pop select-none pointer-events-none drop-shadow-xs"
            draggable={false}
          />
        ) : (
          <span
            key={i}
            className="animate-pop text-base"
            style={{ color: color === "w" ? "oklch(0.75 0.03 82)" : "oklch(0.4 0.05 48)" }}
          >
            {g}
          </span>
        );
      })}
    </div>
  );
}
