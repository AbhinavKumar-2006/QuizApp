/**
 * Calculate score for a correct answer.
 *
 * Formula: score = basePoints * (MIN_RATIO + (1 - MIN_RATIO) * speedRatio)
 * speedRatio = 1 - (responseTimeMs / timeLimitMs)  — clamped [0, 1]
 *
 * A lightning-fast answer gets 100% of basePoints.
 * An answer right before the timer expires gets MIN_RATIO * basePoints (20%).
 * Wrong or no answer gets 0.
 *
 * @param {number} basePoints   - Max points for this question (e.g. 1000)
 * @param {number} responseTimeMs - How long participant took (ms)
 * @param {number} timeLimitMs  - Total allowed time (ms)
 * @returns {number}
 */
const MIN_RATIO = 0.2;

const calcScore = (basePoints, responseTimeMs, timeLimitMs) => {
  if (responseTimeMs == null || responseTimeMs < 0) return 0;
  const speedRatio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
  return Math.round(basePoints * (MIN_RATIO + (1 - MIN_RATIO) * speedRatio));
};

module.exports = { calcScore };
