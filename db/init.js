/**
 * Database initialization
 * Creates all required tables on server startup
 */

const SCHEMA = require('./schema');

/**
 * Initialize all database tables
 * @param {Pool} pool - PostgreSQL pool instance
 */
async function initializeTables(pool) {
  try {
    for (const [tableName, createSql] of Object.entries(SCHEMA)) {
      await pool.query(createSql);
      console.log(`✅ Table '${tableName}' ready`);
    }
    console.log('✅ All database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

module.exports = { initializeTables };
