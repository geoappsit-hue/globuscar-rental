#!/usr/bin/env node
/**
 * Utility script to generate a bcrypt password hash.
 * Usage: node scripts/generate-password.js <password>
 * Copy the output hash to .env ADMIN_PASSWORD_HASH
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Usage: node scripts/generate-password.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nPassword hash generated:');
console.log(hash);
console.log('\nAdd to .env:');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
