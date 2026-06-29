const MIN_RATIO = 0.2;

const calcScore = (basePoints, responseTimeMs, timeLimitMs) => {
  if (responseTimeMs == null || responseTimeMs < 0) return 0;
  const speedRatio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
  return Math.round(basePoints * (MIN_RATIO + (1 - MIN_RATIO) * speedRatio));
};

module.exports = { calcScore };
