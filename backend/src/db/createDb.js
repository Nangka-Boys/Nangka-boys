const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL default server.');
    
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'dapitan_boarding_db'");
    if (res.rows.length === 0) {
      await client.query('CREATE DATABASE dapitan_boarding_db');
      console.log('✅ Database "dapitan_boarding_db" created successfully.');
    } else {
      console.log('ℹ️ Database "dapitan_boarding_db" already exists.');
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
