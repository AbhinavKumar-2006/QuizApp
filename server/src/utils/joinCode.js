const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateJoinCode = () =>
  Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');

module.exports = { generateJoinCode };
