const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const email = 'admin@dapitan.gov.ph';
  const password = 'AdminPassword123!';
  const name = 'Dapitan City System Admin';

  const check = await db.query(
    'SELECT id FROM "dapitan_schema".users WHERE email = $1',
    [email]
  );

  if (check.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    await db.query(
      `INSERT INTO "dapitan_schema".users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [name, email, hash]
    );
    console.log('✅ Created default administrator account.');
  } else {
    await db.query(
      `UPDATE "dapitan_schema".users SET role = 'admin' WHERE email = $1`,
      [email]
    );
    console.log('ℹ️ Administrator account already exists.');
  }

  console.log('--------------------------------------------------');
  console.log('🔑 ADMIN CREDENTIALS:');
  console.log('Email:    ' + email);
  console.log('Password: ' + password);
  console.log('--------------------------------------------------');
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding admin:', err);
    process.exit(1);
  });
