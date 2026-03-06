-- Drop existing database if it exists
DROP DATABASE IF EXISTS slotbooking;

-- Create fresh database
CREATE DATABASE slotbooking;
USE slotbooking;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slots table with date support
CREATE TABLE slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_date DATE NOT NULL,
    slot_time VARCHAR(50) NOT NULL,
    status ENUM('available', 'booked', 'cancelled') DEFAULT 'available',
    booked_by INT,
    booked_at TIMESTAMP NULL,
    UNIQUE KEY unique_slot (slot_date, slot_time),
    FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample users (password is 'password123' hashed with bcrypt)
-- The hash below is for 'password123'
INSERT INTO users (username, password, email, role) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4NXf7KxJ1y', 'admin@example.com', 'admin'),
('john', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4NXf7KxJ1y', 'john@example.com', 'user'),
('jane', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4NXf7KxJ1y', 'jane@example.com', 'user');

-- Insert sample slots for next 7 days
INSERT INTO slots (slot_date, slot_time, status) VALUES
-- Today's slots
(CURDATE(), '09:00 AM', 'available'),
(CURDATE(), '10:00 AM', 'available'),
(CURDATE(), '11:00 AM', 'available'),
(CURDATE(), '12:00 PM', 'available'),
(CURDATE(), '01:00 PM', 'available'),
(CURDATE(), '02:00 PM', 'available'),
(CURDATE(), '03:00 PM', 'available'),
(CURDATE(), '04:00 PM', 'available'),

-- Tomorrow's slots
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '01:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '02:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '03:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '04:00 PM', 'available'),

-- Day after tomorrow
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00 AM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '12:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '01:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '02:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '03:00 PM', 'available'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '04:00 PM', 'available');