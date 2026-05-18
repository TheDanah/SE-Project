/**
 * Seed initial admin account
 * Usage: node scripts/seed-admin.js
 *
 * Creates a default admin account with:
 * - Username: admin
 * - Email: admin@amam.com
 * - Password: Admin@123456 (CHANGE THIS IN PRODUCTION)
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedAdmin() {
  try {
    // First, ensure admins table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    const username = 'admin';
    const email = 'admin@amam.com';
    const password = 'Admin@123456';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if admin exists
    const existing = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);

    if (existing.rows.length > 0) {
      console.log('✅ Admin account already exists');
      process.exit(0);
    }

    // Create admin
    const result = await pool.query(
      'INSERT INTO admins (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    console.log('✅ Admin account created successfully');
    console.log('   Username:', result.rows[0].username);
    console.log('   Email:', result.rows[0].email);
    console.log('   Password: Admin@123456 (CHANGE THIS IN PRODUCTION)');
    console.log('\n⚠️  SECURITY WARNING: Change the default password in production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
}

seedAdmin();
