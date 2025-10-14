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

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'amam_secret_key';

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
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

// In-memory storage for active sessions
const activeSockets = new Map();
const onlineDrivers = new Map();

// ==================== AUTH ENDPOINTS ====================

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, studentId, university, major, phone } = req.body;
        
        if (!email.endsWith('.edu')) {
            return res.status(400).json({ error: 'Must use university email (.edu)' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, student_id, university, major, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, email, student_id`,
            [username, email, passwordHash, studentId, university, major, phone]
        );
        
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                studentId: user.student_id
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Username, email, or student ID already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
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
             WHERE u.email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (!user.is_verified && !user.is_admin) {
            return res.status(403).json({ error: 'Account not verified by admin yet' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, isAdmin: user.is_admin },
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
                isAdmin: user.is_admin,
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
             WHERE is_verified = FALSE AND is_admin = FALSE
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
                (SELECT COUNT(*) FROM users WHERE is_verified = FALSE AND is_admin = FALSE) as pending_students,
                (SELECT COUNT(*) FROM users WHERE is_verified = TRUE AND is_admin = FALSE) as approved_students,
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
