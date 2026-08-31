import { bestMove, getRuleSet, type Board, type Color, type RuleSetId } from "../lib/khmer-chess";

export type AIWorkerRequest = {
  requestId: number;
  board: Board;
  color?: Color | undefined;
  turn?: Color | undefined;
  depth: number;
  rulesetId?: RuleSetId | undefined;
  action?: "move" | "hint" | undefined;
  type?: "search" | "hint" | "bestmove" | undefined;
};

export type AIWorkerResponse = {
  requestId: number;
  type: "bestmove" | "hint";
  action?: "move" | "hint" | undefined;
  move: { from: number; to: number } | null;
  hint?: { from: number; to: number } | null;
  error?: string | undefined;
};

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, board, color, turn, depth, rulesetId, action, type } = event.data;
  try {
    const ruleset = getRuleSet(rulesetId);
    const activeColor = color || turn || "b";
    const move = bestMove(board, activeColor, depth, ruleset);
    const isHint = action === "hint" || type === "hint";
    const response: AIWorkerResponse = {
      requestId,
      type: isHint ? "hint" : "bestmove",
      action: isHint ? "hint" : "move",
      move,
      hint: move,
    };
    self.postMessage(response);
  } catch (err) {
    const isHint = action === "hint" || type === "hint";
    const response: AIWorkerResponse = {
      requestId,
      type: isHint ? "hint" : "bestmove",
      action: isHint ? "hint" : "move",
      move: null,
      hint: null,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
