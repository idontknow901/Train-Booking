import bcrypt from 'bcryptjs';

const password = 'Momtadidilovesrahulgandi';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);

const existingHash = '$2b$10$Ua3vQg0kiaJSsxRZLapfuOXNX1qgKncfnnEgvF.e.Yx4qfGQ/Iu2G';
const isMatch = bcrypt.compareSync(password, existingHash);
console.log('Match with existing hash:', isMatch);
