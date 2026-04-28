const PORT = process.env.PORT || 3000; // Confirming the correct port setting
// This file contains the new server code with PostgreSQL integration
// Please copy this content to server.js after backing up the old one

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'amam_secret_key';

// Initialize Supabase clients
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Required for Supabase
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err);
    } else {
        console.log('✅ Database connected at:', res.rows[0].now);
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(__dirname));

// Admin authorization middleware (same pattern as in server.js)
function requireAdmin(req, res, next) {
    try {
        const adminKey = process.env.ADMIN_KEY;
        // 1) If ADMIN_KEY is set, allow requests that present it via header `x-admin-key` or query param
        if (adminKey) {
            const provided = req.headers['x-admin-key'] || req.query.adminKey || (req.body && req.body.adminKey);
            if (provided && provided === adminKey) return next();
            return res.status(401).json({ error: 'Missing or invalid admin key' });
        }

        // 2) Otherwise, accept a Bearer JWT and verify accountType or role === 'admin'
        const auth = req.headers.authorization || req.headers.Authorization;
        if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing admin token' });
        const token = auth.split(' ')[1];
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (payload && (payload.accountType === 'admin' || payload.role === 'admin')) {
                // attach adminId for downstream handlers
                req.adminId = payload.userId || payload.userID || payload.id;
                return next();
            }
            return res.status(403).json({ error: 'Not an admin' });
        } catch (e) {
            return res.status(401).json({ error: 'Invalid admin token' });
        }
    } catch (e) {
        console.warn('requireAdmin error', e);
        return res.status(500).json({ error: 'Server error' });
    }
}

// In-memory storage for active sessions
const activeSockets = new Map();
const onlineDrivers = new Map();

// ==================== AUTH ENDPOINTS ====================

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, studentId, university, major, phone } = req.body;
        
        if (!email.endsWith('@sm.imamu.edu.sa')) {
            return res.status(400).json({ error: 'Must use university email (sm.imamu.edu.sa)' });
        }
        
        // Step 1: Create user in Supabase Auth via anon signUp (no service role required)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (signUpError) {
            return res.status(400).json({ error: signUpError.message });
        }

        const authUserId = signUpData.user?.id;

        // Step 2: Create user in PostgreSQL users table with Supabase Auth ID
        const result = await pool.query(
            `INSERT INTO users (id, username, email, student_id, university, major, phone, account_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'student') RETURNING id, username, email, student_id, account_type`,
            [authUserId, username, email, studentId, university, major, phone]
        );
        
        const user = result.rows[0];
        
        // Supabase will send verification email on signUp if enabled.
        console.log('✅ Supabase signUp succeeded for:', email);
        
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                studentId: user.student_id,
                accountType: user.account_type
            },
            message: 'Verification email sent to ' + email
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Username, email, or student ID already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed: ' + error.message });
        }
    }
});

// Resend verification email via Supabase Auth
app.post('/api/send-verification-email', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Verify user credentials first
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (signInError || !signInData.user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Resend verification email — only supported server-side with service role
        if (!supabaseAdmin) {
            return res.status(403).json({ error: 'Resend not supported server-side without SUPABASE_SERVICE_ROLE_KEY. Use frontend to request resend.' });
        }
        const { error: resendError } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email: email
        });

        if (resendError) {
            return res.status(400).json({ error: resendError.message });
        }

        res.json({ 
            success: true, 
            message: 'Verification email sent to ' + email,
            userId: signInData.user.id 
        });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

// Check if email is verified via Supabase Auth
app.post('/api/check-email-verified', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // Get user from Supabase Auth (requires service role key)
        if (!supabaseAdmin) {
            return res.status(403).json({ error: 'Admin operations require SUPABASE_SERVICE_ROLE_KEY' });
        }
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const user = data.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            emailVerified: user.email_confirmed_at !== null,
            userId: user.id 
        });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ error: 'Failed to check email verification' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Protection: track failed login attempts and temporary suspension
        const MAX_FAILED_ATTEMPTS = 5;
        const LOCK_MINUTES = 15; // lock duration in minutes

        // Look up user record by email to check lock state and to update counters
        const userRowRes = await pool.query(
            'SELECT id, failed_login_attempts, locked_until, is_suspended, suspension_reason FROM users WHERE email = $1',
            [email]
        );
        const userRow = userRowRes.rows[0];

        // If account is administratively suspended, reject early
        if (userRow && userRow.is_suspended) {
            return res.status(403).json({ error: 'Account suspended by admin', reason: userRow.suspension_reason });
        }

        // If account is currently locked due to failed attempts, reject early
        if (userRow && userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
            return res.status(403).json({ error: 'Account temporarily suspended', lockedUntil: userRow.locked_until });
        }

        // Step 1: Verify credentials with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError || !authData.user) {
            // Invalid credentials: increment failed attempts for the known user
            if (userRow) {
                const attempts = (userRow.failed_login_attempts || 0) + 1;
                if (attempts >= MAX_FAILED_ATTEMPTS) {
                    const until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
                    const lockedUntil = until.toISOString();
                    await pool.query(
                        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
                        [attempts, lockedUntil, userRow.id]
                    );
                    return res.status(429).json({ error: `Account suspended until ${lockedUntil}` });
                } else {
                    await pool.query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [attempts, userRow.id]);
                    const attemptsLeft = MAX_FAILED_ATTEMPTS - attempts;
                    return res.status(401).json({ error: 'Invalid credentials', attemptsLeft });
                }
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Successful authentication: reset counters if a user row exists
        if (userRow) {
            await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [userRow.id]);
        }

        // Step 2: Check if email is verified
        if (!authData.user.email_confirmed_at) {
            return res.status(403).json({ 
                error: 'Please verify your email first', 
                needsVerification: true 
            });
        }

        // Step 3: Get user profile from PostgreSQL
        const result = await pool.query(
            `SELECT u.*, 
                    da.id as driver_app_id,
                    da.status as driver_status,
                    da.is_active_driver,
                    da.is_online,
                    da.total_rides,
                    da.rating,
                    da.total_earnings
             FROM users u
             LEFT JOIN driver_applications da ON u.id = da.user_id
             WHERE u.id = $1`,
            [authData.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User profile not found' });
        }
        
        const user = result.rows[0];
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, accountType: user.account_type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                studentId: user.student_id,
                university: user.university,
                major: user.major,
                accountType: user.account_type,
                isVerified: user.is_verified,
                hasDriverApp: !!user.driver_app_id,
                driverStatus: user.driver_status,
                isActiveDriver: user.is_active_driver,
                driverStats: user.is_active_driver ? {
                    totalRides: user.total_rides,
                    rating: parseFloat(user.rating),
                    totalEarnings: parseFloat(user.total_earnings)
                } : null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== DRIVER APPLICATION ENDPOINTS ====================

// Admin: suspend or unsuspend a user (ban-for-life unless unbanned by admin)
app.post('/api/admin/suspend-user', requireAdmin, async (req, res) => {
    try {
        const { userId, action = 'suspend', reason } = req.body;

        if (!userId) return res.status(400).json({ error: 'userId is required' });

        if (action === 'suspend') {
            const suspendedAt = new Date().toISOString();
            await pool.query(
                `UPDATE users SET is_suspended = TRUE, suspended_at = $1, suspended_by = $2, suspension_reason = $3 WHERE id = $4`,
                [suspendedAt, req.adminId || null, reason || null, userId]
            );

            // If user has an active socket session, disconnect them immediately
            try {
                const socketId = activeSockets.get(userId);
                if (socketId) {
                    const sock = io.sockets.sockets.get(socketId);
                    if (sock) {
                        // notify client then disconnect
                        sock.emit('forceLogout', { reason: reason || 'Account suspended by admin' });
                        sock.disconnect(true);
                    }
                    activeSockets.delete(userId);
                    onlineDrivers.delete(userId);
                }
            } catch (e) {
                console.warn('Failed to disconnect active socket for suspended user', userId, e);
            }

            return res.json({ success: true, message: 'User suspended', suspendedAt });
        }

        if (action === 'unsuspend' || action === 'unban') {
            await pool.query(
                `UPDATE users SET is_suspended = FALSE, suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL WHERE id = $1`,
                [userId]
            );
            return res.json({ success: true, message: 'User unsuspended' });
        }

        return res.status(400).json({ error: 'Invalid action. Use "suspend" or "unsuspend".' });
    } catch (error) {
        console.error('Admin suspend error:', error);
        return res.status(500).json({ error: 'Failed to update suspension' });
    }
});

app.post('/api/driver-application', async (req, res) => {
    try {
        const { userId, licenseNumber, vehicleMake, vehicleModel, vehicleYear, vehicleColor, plateNumber } = req.body;
        
        const existing = await pool.query(
            'SELECT id FROM driver_applications WHERE user_id = $1',
            [userId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a driver application' });
        }
        
        const result = await pool.query(
            `INSERT INTO driver_applications 
             (user_id, license_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, plate_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, status, applied_at`,
            [userId, licenseNumber, vehicleMake, vehicleModel, vehicleYear, vehicleColor, plateNumber]
        );
        
        res.json({
            success: true,
            application: result.rows[0]
        });
    } catch (error) {
        console.error('Driver application error:', error);
        res.status(500).json({ error: 'Application submission failed' });
    }
});

app.get('/api/driver-application/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT da.*, u.username, u.email, u.student_id
             FROM driver_applications da
             JOIN users u ON da.user_id = u.id
             WHERE da.user_id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.json({ hasApplication: false });
        }
        
        res.json({
            hasApplication: true,
            application: result.rows[0]
        });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ error: 'Failed to get application' });
    }
});

// ==================== ADMIN ENDPOINTS ====================

app.get('/api/admin/pending-students', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, email, student_id, university, major, created_at
             FROM users
             WHERE is_verified = FALSE AND account_type != 'admin'
             ORDER BY created_at DESC`
        );
        
        res.json({ students: result.rows });
    } catch (error) {
        console.error('Get pending students error:', error);
        res.status(500).json({ error: 'Failed to get pending students' });
    }
});

app.get('/api/admin/pending-drivers', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT da.*, u.username, u.email, u.student_id, u.university
             FROM driver_applications da
             JOIN users u ON da.user_id = u.id
             WHERE da.status = 'pending'
             ORDER BY da.applied_at DESC`
        );
        
        res.json({ applications: result.rows });
    } catch (error) {
        console.error('Get pending drivers error:', error);
        res.status(500).json({ error: 'Failed to get pending applications' });
    }
});

app.post('/api/admin/approve-student', async (req, res) => {
    try {
        const { studentId } = req.body;
        
        await pool.query(
            'UPDATE users SET is_verified = TRUE WHERE id = $1',
            [studentId]
        );
        
        res.json({ success: true, message: 'Student approved' });
    } catch (error) {
        console.error('Approve student error:', error);
        res.status(500).json({ error: 'Failed to approve student' });
    }
});

app.post('/api/admin/review-driver', async (req, res) => {
    try {
        const { applicationId, adminId, approved, reason } = req.body;
        
        const status = approved ? 'approved' : 'rejected';
        
        await pool.query(
            `UPDATE driver_applications 
             SET status = $1, reviewed_at = NOW(), reviewed_by = $2, 
                 rejection_reason = $3, is_active_driver = $4
             WHERE id = $5`,
            [status, adminId, reason, approved, applicationId]
        );
        
        res.json({ success: true, message: `Driver application ${status}` });
    } catch (error) {
        console.error('Review driver error:', error);
        res.status(500).json({ error: 'Failed to review application' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_verified = FALSE AND account_type != 'admin') as pending_students,
                (SELECT COUNT(*) FROM users WHERE is_verified = TRUE AND account_type != 'admin') as approved_students,
                (SELECT COUNT(*) FROM driver_applications WHERE status = 'pending') as pending_drivers,
                (SELECT COUNT(*) FROM driver_applications WHERE status = 'approved') as approved_drivers,
                (SELECT COUNT(*) FROM rides) as total_rides,
                (SELECT COUNT(*) FROM rides WHERE status = 'completed') as completed_rides
        `);
        
        res.json({ stats: stats.rows[0] });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ==================== RIDE ENDPOINTS ====================

app.post('/api/rides', async (req, res) => {
    try {
        const { studentId, pickup, destination, passengers, fare } = req.body;
        
        const result = await pool.query(
            `INSERT INTO rides 
             (student_id, pickup_location, pickup_lat, pickup_lng, destination_location, 
              destination_lat, destination_lng, passengers, fare)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [studentId, pickup.location, pickup.lat, pickup.lng, 
             destination.location, destination.lat, destination.lng, passengers, fare]
        );
        
        const ride = result.rows[0];
        io.emit('newRideRequest', { ride });
        
        res.json({ success: true, ride });
    } catch (error) {
        console.error('Create ride error:', error);
        res.status(500).json({ error: 'Failed to create ride' });
    }
});

app.get('/api/rides/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const result = await pool.query(
            `SELECT r.*, 
                    d.username as driver_name, d.phone as driver_phone,
                    da.vehicle_make, da.vehicle_model, da.vehicle_color, da.plate_number
             FROM rides r
             LEFT JOIN users d ON r.driver_id = d.id
             LEFT JOIN driver_applications da ON d.id = da.user_id
             WHERE r.student_id = $1 AND r.status IN ('pending', 'matched', 'active')
             ORDER BY r.requested_at DESC`,
            [studentId]
        );
        
        res.json({ rides: result.rows });
    } catch (error) {
        console.error('Get student rides error:', error);
        res.status(500).json({ error: 'Failed to get rides' });
    }
});

app.get('/api/rides/available', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, u.username as student_name, u.phone as student_phone
             FROM rides r
             JOIN users u ON r.student_id = u.id
             WHERE r.status = 'pending'
             ORDER BY r.requested_at DESC
             LIMIT 20`
        );
        
        res.json({ rides: result.rows });
    } catch (error) {
        console.error('Get available rides error:', error);
        res.status(500).json({ error: 'Failed to get available rides' });
    }
});

app.post('/api/rides/:rideId/accept', async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId } = req.body;
        
        const result = await pool.query(
            `UPDATE rides 
             SET driver_id = $1, status = 'matched', accepted_at = NOW()
             WHERE id = $2 AND status = 'pending'
             RETURNING *`,
            [driverId, rideId]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Ride not available' });
        }
        
        const ride = result.rows[0];
        io.emit('rideAccepted', { ride });
        
        res.json({ success: true, ride });
    } catch (error) {
        console.error('Accept ride error:', error);
        res.status(500).json({ error: 'Failed to accept ride' });
    }
});

app.post('/api/rides/:rideId/complete', async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId, fare } = req.body;
        
        const rideResult = await pool.query(
            `UPDATE rides 
             SET status = 'completed', completed_at = NOW()
             WHERE id = $1 AND driver_id = $2
             RETURNING *`,
            [rideId, driverId]
        );
        
        if (rideResult.rows.length === 0) {
            return res.status(400).json({ error: 'Ride not found' });
        }
        
        await pool.query(
            `UPDATE driver_applications 
             SET total_rides = total_rides + 1, total_earnings = total_earnings + $1
             WHERE user_id = $2`,
            [fare, driverId]
        );
        
        res.json({ success: true, ride: rideResult.rows[0] });
    } catch (error) {
        console.error('Complete ride error:', error);
        res.status(500).json({ error: 'Failed to complete ride' });
    }
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('authenticate', (userId) => {
        activeSockets.set(userId, socket.id);
        console.log(`User ${userId} authenticated`);
    });
    
    socket.on('driverOnline', async (data) => {
        const { driverId, location } = data;
        onlineDrivers.set(driverId, { 
            socketId: socket.id, 
            location,
            driverId 
        });
        
        await pool.query(
            'UPDATE driver_applications SET is_online = TRUE WHERE user_id = $1',
            [driverId]
        );
        
        console.log(`Driver ${driverId} is online`);
    });
    
    socket.on('driverOffline', async (driverId) => {
        onlineDrivers.delete(driverId);
        
        await pool.query(
            'UPDATE driver_applications SET is_online = FALSE WHERE user_id = $1',
            [driverId]
        );
        
        console.log(`Driver ${driverId} is offline`);
    });
    
    socket.on('locationUpdate', (data) => {
        const { userId, location } = data;
        
        if (onlineDrivers.has(userId)) {
            const driver = onlineDrivers.get(userId);
            driver.location = location;
            onlineDrivers.set(userId, driver);
            
            io.emit('driverLocationUpdate', { driverId: userId, location });
        }
    });
    
    socket.on('chatMessage', async (data) => {
        const { rideId, senderId, message } = data;
        
        await pool.query(
            'INSERT INTO messages (ride_id, sender_id, message) VALUES ($1, $2, $3)',
            [rideId, senderId, message]
        );
        
        io.emit('chatMessage', { rideId, senderId, message, timestamp: new Date() });
    });
    
    socket.on('typing', (data) => {
        socket.broadcast.emit('userTyping', data);
    });
    
    socket.on('disconnect', () => {
        for (let [userId, socketId] of activeSockets.entries()) {
            if (socketId === socket.id) {
                activeSockets.delete(userId);
                onlineDrivers.delete(userId);
                break;
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// ==================== SERVER START ====================

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready for connections`);
});
