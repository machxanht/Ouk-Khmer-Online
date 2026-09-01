import { useState, useEffect } from "react";
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
  className?: string;
  onSquare: (i: number) => void;
}) {
  const { boardTheme, pieceStyle, motion } = useSettings();
  const theme = BOARD_THEMES[boardTheme];
  const order = Array.from({ length: 64 }, (_, i) => (flipped ? 63 - i : i));

  // Check/Checkmate/King Capture 3-second non-blocking calligraphy splash state
  const [showMateSplash, setShowMateSplash] = useState(false);
  const [splashKey, setSplashKey] = useState(0);

  useEffect(() => {
    if (showCheckmateBanner || showCheckBanner) {
      setSplashKey((k) => k + 1);
      setShowMateSplash(true);
      const timer = setTimeout(() => {
        setShowMateSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowMateSplash(false);
    }
  }, [showCheckmateBanner, showCheckBanner, lastMove?.from, lastMove?.to]);

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
          const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
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
                    lastMove?.to === i ? "bg-gold/30 ring-1 ring-inset ring-gold/60" : "bg-gold/15"
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
