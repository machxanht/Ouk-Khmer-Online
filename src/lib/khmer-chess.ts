/**
 * Authentic Cambodian Ouk Chaktrang (Khmer Chess) Rules Engine.
 * Authoritative specification: luat_co_oc_cam_nang_toan-dien.txt
 *
 * Supported Rulesets:
 *  - Folk / Traditional (Phong trào / Dân gian):
 *      * Ang (King) has Knight leap privilege on 1st move if not in check (cannot capture).
 *      * Neang (Queen) has 2-square straight forward move on 1st move if path clear (cannot capture).
 *      * Touch-move: false, Clock: null, Scoring: null.
 *  - International / SEA Games (Tiêu chuẩn thi đấu quốc tế):
 *      * NO King opening leap (always 1 square any direction).
 *      * NO Neang opening leap (always 1 square diagonally).
 *      * Touch-move: true, Clock: standard (3600s) / blitz (300s), Scoring: Win 1 / Draw 0.5 / Loss 0.
 *
 * Shared Subsystems:
 *  - Koul (Elephant / Bishop): 1 square diagonally OR 1 square forward (5 directions).
 *  - Ses (Horse / Knight): standard 8-direction Knight leaps.
 *  - Tuuk (Boat / Rook): orthogonal sliding moves.
 *  - Trey (Fish / Pawn): 1 square forward, diagonal forward capture, promotes to Trey Bork on 6th rank.
 *  - Trey Bork: moves & captures 1 square diagonally.
 *  - Mij (Counting):
 *      * Board Counting (Viel K'dar): activated when no unpromoted Trey remain, count = (total pieces + 1), limit = 64.
 *      * Piece Counting (Viel L'koun): activated when lone King remains, count = (total pieces + 1), limit fixed at activation (2 Tuuk: 8, 1 Tuuk: 16, 2 Koul: 22, 1 Koul: 44, 2 Ses: 32, 1 Ses: 64, Neang/Trey Bork: 64).
 */

export type Color = "w" | "b";
export type PieceType = "k" | "q" | "b" | "n" | "r" | "p" | "f";

export type Piece = {
  type: PieceType;
  color: Color;
  moved?: boolean;
};

export type Square = Piece | null;
export type Board = Square[]; // 64 squares, 0 = a8 ... 63 = h1

export type RuleSetId = "folk" | "international";
export type TimeControl = "standard" | "blitz";

export interface OukRuleSet {
  id: RuleSetId;
  name: { en: string; km: string; vi: string };
  kingFirstMoveJump: boolean;
  neangFirstMoveTwoStep: boolean;
  touchMove: boolean;
  clock: null | {
    type: TimeControl;
    initialSeconds: number;
  };
  scoring: null | {
    win: number;
    draw: number;
    loss: number;
  };
}

export const RULESETS: Record<RuleSetId, OukRuleSet> = {
  folk: {
    id: "folk",
    name: {
      en: "Folk (Traditional)",
      km: "ប្រជាប្រិយ (បុរាណ)",
      vi: "Dân gian cổ truyền",
    },
    kingFirstMoveJump: true,
    neangFirstMoveTwoStep: true,
    touchMove: false,
    clock: null,
    scoring: null,
  },
  international: {
    id: "international",
    name: {
      en: "International (SEA Games)",
      km: "អន្តរជាតិ (ស៊ីហ្គេម)",
      vi: "Thi đấu quốc tế (SEA Games)",
    },
    kingFirstMoveJump: false,
    neangFirstMoveTwoStep: false,
    touchMove: true,
    clock: {
      type: "standard",
      initialSeconds: 3600, // 60 minutes
    },
    scoring: {
      win: 1,
      draw: 0.5,
      loss: 0,
    },
  },
};

export const BLITZ_RULESET: OukRuleSet = {
  ...RULESETS.international,
  clock: {
    type: "blitz",
    initialSeconds: 300, // 5 minutes
  },
};

export function getRuleSet(id: RuleSetId | undefined): OukRuleSet {
  if (id === "international") return RULESETS.international;
  return RULESETS.folk;
}

export type Move = {
  from: number;
  to: number;
  captured?: Piece | null;
  promotion?: boolean;
  isKingJump?: boolean;
  isQueenJump?: boolean;
};

export const PIECE_NAMES: Record<
  PieceType,
  { km: string; en: string; vi: string; fr: string; th: string; zh: string; value: number }
> = {
  k: {
    km: "Ang / Sdaach",
    en: "King",
    vi: "Vua (Ang / Sdaach)",
    fr: "Roi (Ang / Sdaach)",
    th: "ขุน (Ang / Sdaach)",
    zh: "王 (Ang / Sdaach)",
    value: 0,
  },
  q: {
    km: "Neang",
    en: "Queen",
    vi: "Hậu (Neang)",
    fr: "Reine (Neang)",
    th: "เม็ด (Neang)",
    zh: "后 (Neang)",
    value: 3,
  },
  b: {
    km: "Koul",
    en: "Elephant",
    vi: "Tượng (Koul)",
    fr: "Général (Koul)",
    th: "โคน (Koul)",
    zh: "相 (Koul)",
    value: 3,
  },
  n: {
    km: "Ses",
    en: "Horse",
    vi: "Mã (Ses)",
    fr: "Cheval (Ses)",
    th: "ม้า (Ses)",
    zh: "马 (Ses)",
    value: 4,
  },
  r: {
    km: "Tuuk",
    en: "Boat",
    vi: "Xe (Tuuk)",
    fr: "Bateau (Tuuk)",
    th: "เรือ (Tuuk)",
    zh: "车 (Tuuk)",
    value: 8,
  },
  p: {
    km: "Trey",
    en: "Fish",
    vi: "Tốt (Trey)",
    fr: "Poisson (Trey)",
    th: "เบี้ย (Trey)",
    zh: "兵 (Trey)",
    value: 1,
  },
  f: {
    km: "Trey Bork",
    en: "Promoted Fish",
    vi: "Hậu lật (Trey Bork)",
    fr: "Poisson Promu (Trey Bork)",
    th: "เบี้ยหงาย (Trey Bork)",
    zh: "升变兵 (Trey Bork)",
    value: 3,
  },
};

export const GLYPHS: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  b: "♝",
  n: "♞",
  r: "♜",
  p: "♟",
  f: "⚇",
};

export const row = (i: number) => Math.floor(i / 8);
export const col = (i: number) => i % 8;
export const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const idx = (r: number, c: number) => r * 8 + c;

export function initialBoard(): Board {
  const b: Board = Array.from({ length: 64 }, () => null);
  const whiteBack: PieceType[] = ["r", "n", "b", "k", "q", "b", "n", "r"];
  const blackBack: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

  whiteBack.forEach((t, c) => {
    b[idx(7, c)] = { type: t, color: "w", moved: false };
  });
  blackBack.forEach((t, c) => {
    b[idx(0, c)] = { type: t, color: "b", moved: false };
  });

  for (let c = 0; c < 8; c++) {
    b[idx(5, c)] = { type: "p", color: "w", moved: false };
    b[idx(2, c)] = { type: "p", color: "b", moved: false };
  }
  return b;
}

export function squareName(i: number) {
  return "abcdefgh".charAt(col(i)) + (8 - row(i));
}

/** Check if King can make the Cambodian special Knight leap on its first move */
export function canKingSpecialJump(
  board: Board,
  kingIdx: number,
  kingColor: Color,
  ruleset: OukRuleSet = RULESETS.folk,
): boolean {
  if (!ruleset.kingFirstMoveJump) return false;
  const k = board[kingIdx];
  if (!k || k.type !== "k" || k.color !== kingColor || k.moved) {
    return false;
  }
  // King cannot use the special jump if currently in check
  if (inCheck(board, kingColor, ruleset)) {
    return false;
  }
  return true;
}

const KNIGHT_JUMPS: [number, number][] = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

export function pseudoMoves(
  board: Board,
  from: number,
  ruleset: OukRuleSet = RULESETS.folk,
): number[] {
  const p = board[from];
  if (!p) return [];
  const r = row(from);
  const c = col(from);
  const out: number[] = [];
  const forward = p.color === "w" ? -1 : 1;
  const empty = (i: number) => board[i] === null;
  const enemy = (i: number) => board[i] !== null && board[i]!.color !== p.color;
  const push = (rr: number, cc: number) => {
    if (!inside(rr, cc)) return;
    const i = idx(rr, cc);
    if (empty(i) || enemy(i)) out.push(i);
  };

  switch (p.type) {
    case "k": {
      // Normal King moves: 1 square in any direction
      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (dr || dc) push(r + dr, c + dc);
        }
      }
      // Folk King special first move: knight jump to EMPTY square if enabled, not in check, not moved
      if (ruleset.kingFirstMoveJump && canKingSpecialJump(board, from, p.color, ruleset)) {
        for (const [dr, dc] of KNIGHT_JUMPS) {
          const rr = r + dr;
          const cc = c + dc;
          if (inside(rr, cc)) {
            const i = idx(rr, cc);
            // Cannot capture on special jump
            if (empty(i)) {
              out.push(i);
            }
          }
        }
      }
      break;
    }
    case "q": {
      // Normal Neang move: 1 square diagonally
      for (const dr of [-1, 1]) {
        for (const dc of [-1, 1]) {
          push(r + dr, c + dc);
        }
      }
      // Folk Neang special first move: 2 squares straight forward, cannot capture, path clear
      if (ruleset.neangFirstMoveTwoStep && !p.moved) {
        const one = inside(r + forward, c) ? idx(r + forward, c) : -1;
        const two = inside(r + forward * 2, c) ? idx(r + forward * 2, c) : -1;
        if (one !== -1 && two !== -1 && empty(one) && empty(two)) {
          out.push(two);
        }
      }
      break;
    }
    case "f": {
      // Trey Bork (Promoted fish): moves and captures 1 square diagonally (identical to normal Neang)
      for (const dr of [-1, 1]) {
        for (const dc of [-1, 1]) {
          push(r + dr, c + dc);
        }
      }
      break;
    }
    case "b": {
      // Koul: 1 square diagonally OR 1 square straight forward (5 directions)
      for (const dr of [-1, 1]) {
        for (const dc of [-1, 1]) {
          push(r + dr, c + dc);
        }
      }
      push(r + forward, c);
      break;
    }
    case "n": {
      // Ses: standard 8-direction knight leaps
      for (const [dr, dc] of KNIGHT_JUMPS) {
        push(r + dr, c + dc);
      }
      break;
    }
    case "r": {
      // Tuuk: orthogonal slides
      const dirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dr, dc] of dirs) {
        let rr = r + dr;
        let cc = c + dc;
        while (inside(rr, cc)) {
          const i = idx(rr, cc);
          if (empty(i)) {
            out.push(i);
          } else {
            if (enemy(i)) out.push(i);
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
      break;
    }
    case "p": {
      // Trey: 1 square straight forward (must be empty)
      if (inside(r + forward, c) && empty(idx(r + forward, c))) {
        out.push(idx(r + forward, c));
      }
      // Captures 1 square diagonally forward
      for (const dc of [-1, 1]) {
        if (inside(r + forward, c + dc)) {
          const i = idx(r + forward, c + dc);
          if (enemy(i)) out.push(i);
        }
      }
      break;
    }
  }
  return out;
}

export function findKing(board: Board, color: Color): number {
  return board.findIndex((s) => s && s.type === "k" && s.color === color);
}

/** Check if a square is attacked by standard capture moves of any opposing piece */
export function isAttacked(
  board: Board,
  target: number,
  by: Color,
  ruleset: OukRuleSet = RULESETS.folk,
): boolean {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === by) {
      const r = row(i);
      const c = col(i);
      const forward = p.color === "w" ? -1 : 1;

      // Pawn (p): attacks ONLY diagonally forward
      if (p.type === "p") {
        for (const dc of [-1, 1]) {
          if (inside(r + forward, c + dc) && idx(r + forward, c + dc) === target) {
            return true;
          }
        }
        continue;
      }

      // King (k): King's attack is 1 square any direction (Knight jump cannot attack)
      if (p.type === "k") {
        for (const dr of [-1, 0, 1]) {
          for (const dc of [-1, 0, 1]) {
            if ((dr || dc) && inside(r + dr, c + dc) && idx(r + dr, c + dc) === target) {
              return true;
            }
          }
        }
        continue;
      }

      // Queen (q): Queen's attack is 1 square diagonally (2-square jump cannot attack)
      if (p.type === "q") {
        for (const dr of [-1, 1]) {
          for (const dc of [-1, 1]) {
            if (inside(r + dr, c + dc) && idx(r + dr, c + dc) === target) {
              return true;
            }
          }
        }
        continue;
      }

      // Other pieces (b, n, r, f): pseudoMoves without non-capturing jumps
      if (pseudoMoves(board, i, ruleset).includes(target)) {
        return true;
      }
    }
  }
  return false;
}

export function inCheck(board: Board, color: Color, ruleset: OukRuleSet = RULESETS.folk): boolean {
  const k = findKing(board, color);
  if (k < 0) return false;
  return isAttacked(board, k, color === "w" ? "b" : "w", ruleset);
}

export function applyMove(board: Board, from: number, to: number): Board {
  const next = board.slice();
  const p = next[from];
  if (!p) return next;

  const promoRank = p.color === "w" ? 2 : 5;
  const isPawnPromotion = p.type === "p" && row(to) === promoRank;

  next[from] = null;
  next[to] = isPawnPromotion ? { type: "f", color: p.color, moved: true } : { ...p, moved: true };

  return next;
}

export function legalMoves(
  board: Board,
  from: number,
  ruleset: OukRuleSet = RULESETS.folk,
): number[] {
  const p = board[from];
  if (!p) return [];
  return pseudoMoves(board, from, ruleset).filter(
    (to) => !inCheck(applyMove(board, from, to), p.color, ruleset),
  );
}

export function allLegalMoves(
  board: Board,
  color: Color,
  ruleset: OukRuleSet = RULESETS.folk,
): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === color) {
      for (const to of legalMoves(board, i, ruleset)) {
        moves.push({ from: i, to });
      }
    }
  }
  return moves;
}

export type Status = "playing" | "check" | "checkmate" | "stalemate" | "king_captured";

export type GameResultReason =
  "checkmate" | "king_capture" | "stalemate" | "mij" | "resignation" | "timeout";
export type GameResultWinner = "w" | "b" | "draw";

export interface GameResult {
  winner: GameResultWinner;
  reason: GameResultReason;
  resignedPlayer?: Color;
  timedOutPlayer?: Color;
}

export function computeGameResult(params: {
  rawStatus: Status;
  turn: Color;
  resignedPlayer: Color | null;
  timedOutPlayer: Color | null;
  countDrawReached: boolean;
  countingState: CountingState;
  kingCapturedWinner?: Color | null;
}): GameResult | null {
  const {
    rawStatus,
    turn,
    resignedPlayer,
    timedOutPlayer,
    countDrawReached,
    countingState,
    kingCapturedWinner,
  } = params;

  if (kingCapturedWinner) {
    return {
      winner: kingCapturedWinner,
      reason: "king_capture",
    };
  }

  if (resignedPlayer) {
    return {
      winner: resignedPlayer === "w" ? "b" : "w",
      reason: "resignation",
      resignedPlayer,
    };
  }

  if (timedOutPlayer) {
    return {
      winner: timedOutPlayer === "w" ? "b" : "w",
      reason: "timeout",
      timedOutPlayer,
    };
  }

  if (countDrawReached) {
    return {
      winner: "draw",
      reason: "mij",
    };
  }

  if (rawStatus === "king_captured") {
    // If rawStatus is king_captured, the player whose turn it was to move has had their king captured
    return {
      winner: turn === "w" ? "b" : "w",
      reason: "king_capture",
    };
  }

  if (rawStatus === "checkmate") {
    // If escaping player checkmates while board counting is active, it is a draw
    if (countingState.type === "board" && countingState.countingPlayer === turn) {
      return {
        winner: "draw",
        reason: "mij",
      };
    }
    // Turn is the checkmated player
    return {
      winner: turn === "w" ? "b" : "w",
      reason: "checkmate",
    };
  }

  if (rawStatus === "stalemate") {
    return {
      winner: "draw",
      reason: "stalemate",
    };
  }

  return null;
}

export function status(board: Board, turn: Color, ruleset: OukRuleSet = RULESETS.folk): Status {
  const myKing = findKing(board, turn);
  const oppColor: Color = turn === "w" ? "b" : "w";
  const oppKing = findKing(board, oppColor);
  if (myKing < 0 || oppKing < 0) {
    return "king_captured";
  }

  const moves = allLegalMoves(board, turn, ruleset);
  const check = inCheck(board, turn, ruleset);
  if (moves.length === 0) return check ? "checkmate" : "stalemate";
  return check ? "check" : "playing";
}

// ----------------------------------------------------
// Cambodian Counting / Mij Shared Rules Subsystem
// ----------------------------------------------------

export type CountingType = "none" | "board" | "piece";

export type CountingState = {
  type: CountingType;
  countingPlayer: Color | null;
  count: number;
  limit: number;
};

export const INITIAL_COUNTING_STATE: CountingState = {
  type: "none",
  countingPlayer: null,
  count: 0,
  limit: 64,
};

/** Count pieces on board for a specific color */
export function countPieces(board: Board, color: Color): number {
  return board.filter((s) => s && s.color === color).length;
}

/** Check if there are any unpromoted pawns ('p') left on the board */
export function hasUnpromotedPawns(board: Board): boolean {
  return board.some((s) => s && s.type === "p");
}

/**
 * Check if defending side is eligible to start Viel K'dar (Board Counting).
 * Rule: No unpromoted Trey ('p') remain on the board AND defender has fewer or equal pieces.
 */
export function canStartBoardHonorCounting(board: Board, color: Color): boolean {
  if (hasUnpromotedPawns(board)) return false;
  const myPieces = countPieces(board, color);
  const oppPieces = countPieces(board, color === "w" ? "b" : "w");
  return myPieces <= oppPieces;
}

/**
 * Check if a player is eligible to start Viel L'koun (Piece Honor Counting / Mij lone King).
 * Rule: Escaping side has ONLY their King remaining.
 */
export function canStartPieceHonorCounting(board: Board, color: Color): boolean {
  return countPieces(board, color) === 1;
}

/**
 * Calculate the fixed Viel L'koun limit based on attacking player's material at activation.
 * Authoritative rules:
 * - 2+ Tuuk (Rooks) -> 8
 * - 1 Tuuk (Rook) -> 16
 * - 2+ Koul (Bishops) -> 22
 * - 1 Koul (Bishop) -> 44
 * - 2+ Ses (Knights) -> 32
 * - 1 Ses (Knight) -> 64
 * - Neang or Trey Bork only -> 64
 */
export function calculatePieceCountingLimit(board: Board, chasingColor: Color): number {
  const chasingPieces = board.filter((s): s is Piece => s !== null && s.color === chasingColor);
  const rooks = chasingPieces.filter((s) => s.type === "r").length;
  const bishops = chasingPieces.filter((s) => s.type === "b").length;
  const knights = chasingPieces.filter((s) => s.type === "n").length;

  if (rooks >= 2) return 8;
  if (rooks === 1) return 16;
  if (bishops >= 2) return 22;
  if (bishops === 1) return 44;
  if (knights >= 2) return 32;
  if (knights === 1) return 64;
  return 64; // Neang or Trey Bork only
}

/**
 * Initialize Viel L'koun (Piece Honor Counting).
 * Starts from: (Total pieces left on board, including both Kings) + 1.
 * Limit is FIXED at activation and remains constant regardless of subsequent captures.
 */
export function startPieceHonorCounting(board: Board, escapingColor: Color): CountingState {
  const totalPieces = board.filter((s) => s !== null).length;
  const chasingColor: Color = escapingColor === "w" ? "b" : "w";
  const limit = calculatePieceCountingLimit(board, chasingColor);
  return {
    type: "piece",
    countingPlayer: escapingColor,
    count: totalPieces + 1,
    limit,
  };
}

/**
 * Initialize Viel K'dar (Board Honor Counting).
 * Condition: No unpromoted Trey on the board.
 * Starts from: (Total pieces left on board, including both Kings) + 1.
 * Limit is 64.
 */
export function startBoardHonorCounting(board: Board, escapingColor: Color): CountingState {
  const totalPieces = board.filter((s) => s !== null).length;
  return {
    type: "board",
    countingPlayer: escapingColor,
    count: totalPieces + 1,
    limit: 64,
  };
}

/**
 * Progress counting state after a move is made.
 * Increments when the counting/defending player makes their move.
 */
export function advanceCounting(counting: CountingState, movingPlayer: Color): CountingState {
  if (counting.type === "none" || !counting.countingPlayer) return counting;
  if (movingPlayer === counting.countingPlayer) {
    return {
      ...counting,
      count: counting.count + 1,
    };
  }
  return counting;
}

// ----------------------------------------------------
// AI Evaluation & Negamax Search with Ruleset Awareness
// ----------------------------------------------------

export function evaluate(board: Board, color: Color): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const v =
      PIECE_NAMES[p.type].value * 10 +
      (p.type === "p" ? (p.color === "w" ? 7 - row(i) : row(i)) : 0);
    score += p.color === color ? v : -v;
  }
  return score;
}

/** Negamax with alpha-beta search using the active ruleset */
export function bestMove(
  board: Board,
  color: Color,
  depth: number,
  ruleset: OukRuleSet = RULESETS.folk,
): { from: number; to: number } | null {
  const moves = allLegalMoves(board, color, ruleset);
  if (moves.length === 0) return null;
  if (depth <= 1) {
    // Novice: prefer captures, otherwise random
    const scored = moves.map((m) => ({
      m,
      s: (board[m.to] ? PIECE_NAMES[board[m.to]!.type].value * 10 : 0) + Math.random() * 6,
    }));
    scored.sort((a, b) => b.s - a.s);
    return scored[0]!.m;
  }

  const search = (b: Board, c: Color, d: number, alpha: number, beta: number): number => {
    if (d === 0) return evaluate(b, c);
    const ms = allLegalMoves(b, c, ruleset);
    if (ms.length === 0) return inCheck(b, c, ruleset) ? -99999 + d : 0;
    let best = -Infinity;
    for (const m of ms) {
      const score = -search(
        applyMove(b, m.from, m.to),
        c === "w" ? "b" : "w",
        d - 1,
        -beta,
        -alpha,
      );
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestScore = -Infinity;
  let choice = moves[0]!;
  const ordered = moves
    .map((m) => ({ m, cap: board[m.to] ? PIECE_NAMES[board[m.to]!.type].value : 0 }))
    .sort((a, b) => b.cap - a.cap)
    .map((x) => x.m);
  for (const m of ordered) {
    const score = -search(
      applyMove(board, m.from, m.to),
      color === "w" ? "b" : "w",
      depth - 1,
      -Infinity,
      Infinity,
    );
    if (score > bestScore) {
      bestScore = score;
      choice = m;
    }
  }
  return choice;
}
