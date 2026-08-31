import type { Key } from "react";
import type { Color, PieceType } from "../lib/khmer-chess";
import { PIECE_NAMES } from "../lib/khmer-chess";
import { getPieceSrc, useSettings, type PieceStyle } from "../lib/settings";

export function OukPiece({
  type,
  color = "w",
  pieceStyle,
  className = "h-8 w-8",
  alt,
}: {
  type: PieceType;
  color?: Color;
  pieceStyle?: PieceStyle;
  className?: string;
  alt?: string;
  key?: Key;
}) {
  const settings = useSettings();
  const activeStyle = pieceStyle ?? settings.pieceStyle ?? "ada";
  const src = getPieceSrc(activeStyle, color, type);
  const label = alt ?? `${color === "w" ? "White" : "Black"} ${PIECE_NAMES[type]?.en ?? type}`;

  return (
    <img
      src={src}
      alt={label}
      className={`object-contain select-none pointer-events-none drop-shadow-sm ${className}`}
      draggable={false}
      loading="lazy"
    />
  );
}
