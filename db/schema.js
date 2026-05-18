/**
 * Database schema definitions
 * All tables are created on server startup via initializeTables()
 */

const SCHEMA = {
  admins: `
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
  `,

  announcements: `
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT,
      message TEXT,
      type VARCHAR(50) DEFAULT 'system',
      event_date TIMESTAMP NULL,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    )
  `,

  tickets: `
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      type VARCHAR(100),
      subject TEXT,
      body TEXT,
      status VARCHAR(50) DEFAULT 'open',
      admin_reply TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    )
  `,

  reviews: `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      ride_id INTEGER,
      driver_id TEXT,
      passenger_id TEXT,
      rating INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `,
};

module.exports = SCHEMA;
