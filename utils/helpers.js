/**
 * Utility functions for common operations
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'amam_secret_key';

/**
 * Generate a JWT token for a user
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} accountType - Account type (student, driver, admin)
 * @param {string} expiresIn - Token expiration time (default: '7d')
 * @returns {string} JWT token
 */
function generateToken(userId, email, accountType, expiresIn = '7d') {
  return jwt.sign({ userId, email, accountType }, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

/**
 * Format duration in ms to readable format (HH:MM:SS.mmm)
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const msRem = ms % 1000;
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(msRem).padStart(3, '0')}`;
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function now() {
  return new Date().toISOString();
}

module.exports = {
  generateToken,
  verifyToken,
  formatDuration,
  now,
};
