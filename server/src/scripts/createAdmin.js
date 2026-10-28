require('dotenv').config();
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDb } = require('../db');
const User = require('../models/User');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run create-admin -- user@example.com');

  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.includes(email)) {
    throw new Error('This email is not listed in the server ADMIN_EMAILS allowlist.');
  }

  await connectDb();
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    let password;
    if (existing.role !== 'admin') {
      existing.role = 'admin';
    }
    if (!existing.passwordHash) {
      password = crypto.randomBytes(24).toString('base64url');
      existing.passwordHash = await bcrypt.hash(password, 12);
    }
    await existing.save();
    if (password) {
      console.log(`Admin account enabled for ${email} with a new MongoDB password.`);
      console.log(`Password (shown once): ${password}`);
    } else {
      console.log(`Admin access enabled for ${email}; its existing password was not changed.`);
    }
    return;
  }

  const password = crypto.randomBytes(24).toString('base64url');
  const fullName = email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  await User.create({
    uid: crypto.randomUUID(),
    fullName,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
  });

  console.log(`Admin account created for ${email}.`);
  console.log(`Password (shown once): ${password}`);
}

main()
  .catch((err) => {
    console.error('[create-admin]', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });