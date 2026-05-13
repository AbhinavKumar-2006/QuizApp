const Participant = require('../models/Participant');

/**
 * Fetches and returns the live leaderboard for a session,
 * sorted by totalScore desc, then joined time asc (tiebreak).
 */
const buildLeaderboard = async (sessionId) => {
  const participants = await Participant.find({ sessionId })
    .sort({ totalScore: -1, createdAt: 1 })
    .select('nickname totalScore rank isConnected')
    .lean();

  // Attach rank numbers (ties share rank)
  let rank = 1;
  for (let i = 0; i < participants.length; i++) {
    if (i > 0 && participants[i].totalScore < participants[i - 1].totalScore) {
      rank = i + 1;
    }
    participants[i].rank = rank;
  }

  // Persist rank to DB in bulk
  const bulkOps = participants.map((p) => ({
    updateOne: { filter: { _id: p._id }, update: { rank: p.rank } },
  }));
  if (bulkOps.length) {
    const ParticipantModel = require('../models/Participant');
    await ParticipantModel.bulkWrite(bulkOps);
  }

  return participants;
};

/**
 * Removes isCorrect from options before broadcasting a question to participants.
 * The host payload includes correct answers; participants do not.
 */
const stripCorrectAnswers = (question) => ({
  _id: question._id,
  text: question.text,
  type: question.type,
  timeLimit: question.timeLimit,
  points: question.points,
  imageUrl: question.imageUrl,
  order: question.order,
  options: question.options.map(({ _id, text, order }) => ({ _id, text, order })),
});

module.exports = { buildLeaderboard, stripCorrectAnswers };
