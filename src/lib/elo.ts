/**
 * Authentic ELO rating calculation system for Ouk Chatrang multiplayer.
 */

export interface EloUpdateResult {
  oldRating: number;
  newRating: number;
  delta: number;
  expectedScore: number;
}

export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculates rating change using standard ELO with dynamic K-factor based on experience.
 * @param playerRating Current rating of the player
 * @param opponentRating Rating of the opponent
 * @param score 1 for win, 0.5 for draw, 0 for loss
 * @param gamesPlayed Total online games played (higher experience = lower K)
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  score: 1 | 0.5 | 0,
  gamesPlayed: number = 0,
): EloUpdateResult {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);

  // Dynamic K-factor:
  // - Provisional / New players (< 30 games): K = 40 (rapid placement)
  // - Intermediate (30 - 100 games): K = 32
  // - Veterans (> 100 games or rating > 2000): K = 24
  let kFactor = 32;
  if (gamesPlayed < 30) {
    kFactor = 40;
  } else if (playerRating > 2000) {
    kFactor = 24;
  }

  const rawDelta = kFactor * (score - expectedScore);
  const delta = Math.round(rawDelta);
  const newRating = Math.max(100, playerRating + delta);

  return {
    oldRating: playerRating,
    newRating,
    delta: newRating - playerRating,
    expectedScore,
  };
}
