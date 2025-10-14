-- Amam Ride-Sharing Platform Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS driver_applications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (all students, with optional driver status)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    university VARCHAR(255) NOT NULL,
    major VARCHAR(100),
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver applications (students applying to be drivers)
CREATE TABLE driver_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    vehicle_make VARCHAR(50) NOT NULL,
    vehicle_model VARCHAR(50) NOT NULL,
    vehicle_year INTEGER,
    vehicle_color VARCHAR(30),
    plate_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Driver stats (after approval)
    is_active_driver BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    total_rides INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    
    UNIQUE(user_id)
);

-- Rides table
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    pickup_location VARCHAR(255) NOT NULL,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    destination_location VARCHAR(255) NOT NULL,
    destination_lat DECIMAL(10,8),
    destination_lng DECIMAL(11,8),
    passengers INTEGER DEFAULT 1,
    fare DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, matched, active, completed, cancelled
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5)
);

-- Messages table (ride chat)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_driver_apps_user_id ON driver_applications(user_id);
CREATE INDEX idx_driver_apps_status ON driver_applications(status);
CREATE INDEX idx_rides_student_id ON rides(student_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_messages_ride_id ON messages(ride_id);

-- Create default admin user (password: admin123)
-- Hash generated for 'admin123' using bcrypt
INSERT INTO users (username, email, password_hash, student_id, university, is_admin, is_verified)
VALUES (
    'admin',
    'admin@university.edu',
    '$2b$10$rZ0H5RqK8qVOqFKV2nHQZuKxMxJ5vL7z3mQN8aP6tF9sW1xY2jD4K',
    'ADMIN-001',
    'Main Campus',
    TRUE,
    TRUE
);

-- Sample verified student
INSERT INTO users (username, email, password_hash, student_id, university, major, is_verified)
VALUES (
    'sarah_johnson',
    'sarah.j@university.edu',
    '$2b$10$rZ0H5RqK8qVOqFKV2nHQZuKxMxJ5vL7z3mQN8aP6tF9sW1xY2jD4K',
    'STU-2024-001',
    'Main Campus',
    'Computer Science',
    TRUE
);

-- Sample driver application (approved)
INSERT INTO users (username, email, password_hash, student_id, university, major, is_verified)
VALUES (
    'mike_driver',
    'mike.d@university.edu',
    '$2b$10$rZ0H5RqK8qVOqFKV2nHQZuKxMxJ5vL7z3mQN8aP6tF9sW1xY2jD4K',
    'STU-2024-002',
    'Main Campus',
    'Business',
    TRUE
);

INSERT INTO driver_applications (user_id, license_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, plate_number, status, is_active_driver)
VALUES (
    3,
    'DL123456',
    'Toyota',
    'Camry',
    2020,
    'Silver',
    'ABC-1234',
    'approved',
    TRUE
);

-- Sample pending driver application
INSERT INTO users (username, email, password_hash, student_id, university, major, is_verified)
VALUES (
    'john_pending',
    'john.p@university.edu',
    '$2b$10$rZ0H5RqK8qVOqFKV2nHQZuKxMxJ5vL7z3mQN8aP6tF9sW1xY2jD4K',
    'STU-2024-003',
    'Main Campus',
    'Engineering',
    TRUE
);

INSERT INTO driver_applications (user_id, license_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, plate_number, status)
VALUES (
    4,
    'DL789012',
    'Honda',
    'Civic',
    2019,
    'Blue',
    'XYZ-5678',
    'pending'
);
