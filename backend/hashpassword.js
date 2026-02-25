// hashPassword.js
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = '123456'; // your plain password
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashedPassword);
}

generateHash();
