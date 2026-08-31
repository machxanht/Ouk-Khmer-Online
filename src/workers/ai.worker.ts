import { bestMove, getRuleSet, type Board, type Color, type RuleSetId } from "../lib/khmer-chess";

export type AIWorkerRequest = {
  requestId: number;
  board: Board;
  color: Color;
  depth: number;
  rulesetId?: RuleSetId | undefined;
  action?: "move" | "hint" | undefined;
};

export type AIWorkerResponse = {
  requestId: number;
  move: { from: number; to: number } | null;
  action?: "move" | "hint" | undefined;
  error?: string | undefined;
};

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, board, color, depth, rulesetId, action } = event.data;
  try {
    const ruleset = getRuleSet(rulesetId);
    const move = bestMove(board, color, depth, ruleset);
    const response: AIWorkerResponse = {
      requestId,
      move,
      action,
    };
    self.postMessage(response);
  } catch (err) {
    const response: AIWorkerResponse = {
      requestId,
      move: null,
      action,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
