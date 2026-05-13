// Excludes ambiguous chars: 0, O, 1, I to avoid confusion
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateJoinCode = () =>
  Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');

module.exports = { generateJoinCode };
