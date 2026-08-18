import { ScoreBoard } from "./ScoreBoard";

/**
 * Explicit production overlay entry point.
 * The scoreboard itself is now individual-only; this named wrapper makes the
 * intent unambiguous for future routing and audits.
 */
export function IndividualOnlyScoreBoard(props) {
  return <ScoreBoard {...props} mode="individual" />;
}

export default IndividualOnlyScoreBoard;
