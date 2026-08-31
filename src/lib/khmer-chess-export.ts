/**
 * FEN / PGN serialization for Ouk Chatrang games.
 *
 * Ouk Chatrang has no ratified PGN standard, so moves are written in long
 * algebraic notation (e3e4, e3xd4, c6c7=Q) inside an otherwise standard PGN
 * envelope. Positions use classic FEN with "-" for castling and en passant,
 * which every analysis board accepts.
 */

import { squareName, type Board, type Color, type PieceType } from "./khmer-chess";

export type Ply = {
  from: number;
  to: number;
  type: PieceType;
  color: Color;
  captured?: PieceType | null;
  promotion?: boolean;
};

export function toFEN(board: Board, turn: Color, fullmove = 1, halfmove = 0) {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let line = "";
    let gap = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r * 8 + c];
      if (!p) {
        gap++;
        continue;
      }
      if (gap) {
        line += String(gap);
        gap = 0;
      }
      line += p.color === "w" ? p.type.toUpperCase() : p.type;
    }
    if (gap) line += String(gap);
    rows.push(line);
  }
  return `${rows.join("/")} ${turn} - - ${halfmove} ${fullmove}`;
}

export function plyToNotation(ply: Ply) {
  const piece = ply.type === "p" ? "" : ply.type.toUpperCase();
  return `${piece}${squareName(ply.from)}${ply.captured ? "x" : ""}${squareName(ply.to)}${
    ply.promotion ? "=F" : ""
  }`;
}

export function movePairs(plies: Ply[]) {
  const pairs: { no: number; white?: string; black?: string }[] = [];
  plies.forEach((ply, i) => {
    const no = Math.floor(i / 2) + 1;
    const slot = pairs[no - 1] ?? { no };
    if (ply.color === "w") slot.white = plyToNotation(ply);
    else slot.black = plyToNotation(ply);
    pairs[no - 1] = slot;
  });
  return pairs;
}

export type PgnMeta = {
  white: string;
  black: string;
  event: string;
  result: string;
  date?: Date;
  setup?: string;
};

export function toPGN(plies: Ply[], meta: PgnMeta) {
  const d = meta.date ?? new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;

  const tags = [
    `[Event "${meta.event}"]`,
    `[Site "Ouk Chatrang"]`,
    `[Date "${date}"]`,
    `[Variant "Ouk Chatrang"]`,
    `[White "${meta.white}"]`,
    `[Black "${meta.black}"]`,
    `[Result "${meta.result}"]`,
  ];
  if (meta.setup) tags.push(`[FEN "${meta.setup}"]`);

  const body = movePairs(plies)
    .map((p) => `${p.no}. ${p.white ?? "..."}${p.black ? ` ${p.black}` : ""}`)
    .join(" ");

  return `${tags.join("\n")}\n\n${body ? `${body} ` : ""}${meta.result}\n`;
}

export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea fallback */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
