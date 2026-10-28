TablesTablesaudit_log-- ==============================================================================
-- Automated Expense Claim Verification System
-- Database Schema & Comprehensive Seed Data
-- ==============================================================================

DROP DATABASE IF EXISTS expense_rpa_db;
CREATE DATABASE expense_rpa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE expense_rpa_db;

-- ------------------------------------------------------------------------------
-- 1. Table: users
-- Stores employees and administrators with hashed credentials and role permissions
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin') NOT NULL DEFAULT 'employee',
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: policies
-- Configurable expense policies per category (read by backend and RPA bot)
-- ------------------------------------------------------------------------------
CREATE TABLE policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL UNIQUE,
    max_limit DECIMAL(10, 2) NOT NULL COMMENT 'Maximum allowable amount in INR (₹)',
    receipt_required BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether receipt proof is mandatory',
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_policy_category (category),
    INDEX idx_policy_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: claims
-- Employee expense claim submissions
-- ------------------------------------------------------------------------------
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_code VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    category VARCHAR(100) NULL COMMENT 'Category may be NULL or empty to test bot validation',
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    receipt_path VARCHAR(255) NULL COMMENT 'Relative path to uploaded receipt file or NULL if missing',
    status ENUM(
        'Submitted',
        'Verified - Pending Approval',
        'Flagged',
        'Approved',
        'Rejected',
        'Needs Correction'
    ) NOT NULL DEFAULT 'Submitted',
    admin_comments TEXT NULL COMMENT 'Comments provided by admin upon approval/rejection/correction request',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_claims_code (claim_code),
    INDEX idx_claims_user (user_id),
    INDEX idx_claims_status (status),
    INDEX idx_claims_date (expense_date),
    INDEX idx_claims_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: verification_results
-- Detailed RPA Bot execution outcomes, detected violations, and validation metadata
-- ------------------------------------------------------------------------------
CREATE TABLE verification_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    bot_run_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    outcome ENUM('Verified - Pending Approval', 'Flagged', 'Rejected') NOT NULL,
    violations TEXT NULL COMMENT 'Semicolon-separated list of rule violations found by the bot',
    checked_amount DECIMAL(10, 2) NOT NULL,
    policy_limit_applied DECIMAL(10, 2) NULL COMMENT 'The category policy limit that was checked against',
    execution_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_verification_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    INDEX idx_vr_claim (claim_id),
    INDEX idx_vr_outcome (outcome),
    INDEX idx_vr_timestamp (bot_run_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: audit_log
-- Immutable audit trail of every claim state transition, edit, and review action
-- ------------------------------------------------------------------------------
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    user_id INT NULL COMMENT 'ID of the user who performed the action (NULL if RPA system bot)',
    action VARCHAR(100) NOT NULL COMMENT 'SUBMIT, RPA_VERIFY, ADMIN_APPROVE, ADMIN_REJECT, ADMIN_CORRECTION, RESUBMIT',
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    INDEX idx_audit_claim (claim_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- SAMPLE SEED DATA
-- Passwords for seed users:
-- Admin:    Admin@123  (bcrypt hash below)
-- Employee: User@123   (bcrypt hash below)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Seed Users (1 Admin, 3 Employees across departments)
-- ------------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, department) VALUES
(1, 'System Administrator', 'admin@company.com', '$2b$10$xcp5npwchB54hT9c8cEB0Ox67jMpxo1W1t0Le3Zy.DLPFTDU1yUlS', 'admin', 'Finance & Operations'),
(2, 'Rahul Sharma', 'rahul.sharma@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Sales & Marketing'),
(3, 'Priya Patel', 'priya.patel@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Engineering'),
(4, 'Amit Verma', 'amit.verma@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Human Resources');

-- ------------------------------------------------------------------------------
-- Seed Policies (Configurable category thresholds in ₹)
-- ------------------------------------------------------------------------------
INSERT INTO policies (id, category, max_limit, receipt_required, description, is_active) VALUES
(1, 'Meals', 1000.00, TRUE, 'Daily dining and team lunch allowance', TRUE),
(2, 'Travel', 5000.00, TRUE, 'Local taxi, rail, or domestic flight tickets', TRUE),
(3, 'Accommodation', 8000.00, TRUE, 'Hotel stays during business travel', TRUE),
(4, 'Office Supplies', 2000.00, TRUE, 'Stationery, adapters, monitors, and peripherals', TRUE),
(5, 'Client Entertainment', 3000.00, TRUE, 'Official dinner or meetings with prospective clients', TRUE),
(6, 'Certifications', 15000.00, TRUE, 'Professional IT / domain certifications and exam vouchers', TRUE);

-- ------------------------------------------------------------------------------
-- Seed Claims (16 comprehensive claims testing EVERY rule, permutation, and edge case)
-- Note: Today''s baseline date for demo is 2026-10-27
-- ------------------------------------------------------------------------------
INSERT INTO claims (id, claim_code, user_id, category, amount, expense_date, description, receipt_path, status, admin_comments) VALUES
-- Case 1: Perfectly valid Meal claim (under limit ₹1,000, valid past date, receipt present)
(1, 'CLM-2026-001', 2, 'Meals', 750.00, '2026-10-22', 'Client lunch meeting at Olive Bistro', 'uploads/receipts/sample_receipt_01.pdf', 'Submitted', NULL),

-- Case 2: Exceeds Category Limit (Meals ₹2,400 > ₹1,000 policy limit)
(2, 'CLM-2026-002', 2, 'Meals', 2400.00, '2026-10-23', 'Dinner with regional sales team at The Grand', 'uploads/receipts/sample_receipt_02.pdf', 'Submitted', NULL),

-- Case 3: Missing Receipt (Travel ₹3,200, receipt is NULL)
(3, 'CLM-2026-003', 3, 'Travel', 3200.00, '2026-10-21', 'Airport cab charges to client office', NULL, 'Submitted', NULL),

-- Case 4: Future Expense Date (Office Supplies ₹1,200, date is in future: 2026-11-20)
(4, 'CLM-2026-004', 3, 'Office Supplies', 1200.00, '2026-11-20', 'Wireless keyboard and mouse combo', 'uploads/receipts/sample_receipt_04.pdf', 'Submitted', NULL),

-- Case 5: Missing Category (Amount ₹1,800, category is NULL)
(5, 'CLM-2026-005', 4, NULL, 1800.00, '2026-10-24', 'Printer ink cartridges and photo paper', 'uploads/receipts/sample_receipt_05.pdf', 'Submitted', NULL),

-- Case 6: First legitimate submission of CLM-2026-006 (Travel ₹4,500 <= ₹5,000)
(6, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted', NULL),

-- Case 7: Duplicate Claim Submission (Duplicate claim code CLM-2026-006 intentionally submitted again)
(7, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment (re-sent)', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted', NULL),

-- Case 8: Multi-Violation Claim (Meals ₹3,500 > ₹1,000 + Missing Receipt + Future Date 2026-12-05)
(8, 'CLM-2026-007', 4, 'Meals', 3500.00, '2026-12-05', 'Annual team celebration dinner', NULL, 'Submitted', NULL),

-- Case 9: Valid Accommodation Claim (₹6,800 <= ₹8,000 limit, receipt present, past date)
(9, 'CLM-2026-008', 3, 'Accommodation', 6800.00, '2026-10-15', '2 nights stay at Lemon Tree Premier for tech conference', 'uploads/receipts/sample_receipt_08.pdf', 'Submitted', NULL),

-- Case 10: Accommodation Exceeding Limit (₹11,500 > ₹8,000 limit)
(10, 'CLM-2026-009', 3, 'Accommodation', 11500.00, '2026-10-19', 'Luxury suite hotel stay during offsite', 'uploads/receipts/sample_receipt_09.pdf', 'Submitted', NULL),

-- Case 11: Valid Client Entertainment (₹2,750 <= ₹3,000 limit, receipt present)
(11, 'CLM-2026-010', 2, 'Client Entertainment', 2750.00, '2026-10-20', 'Coffee and snacks with prospective vendor partners', 'uploads/receipts/sample_receipt_10.pdf', 'Submitted', NULL),

-- Case 12: Valid Professional Certification (₹14,500 <= ₹15,000 limit, receipt present)
(12, 'CLM-2026-011', 3, 'Certifications', 14500.00, '2026-10-14', 'AWS Certified Solutions Architect exam fee', 'uploads/receipts/sample_receipt_11.pdf', 'Submitted', NULL),

-- Case 13: Office Supplies Missing Receipt (₹950, receipt is NULL)
(13, 'CLM-2026-012', 4, 'Office Supplies', 950.00, '2026-10-25', 'Whiteboard markers and sticky notes for brainstorming', NULL, 'Submitted', NULL),

-- Case 14: Category Not Recognized in Policy Sheet ("Gym Membership" ₹2,500)
(14, 'CLM-2026-013', 2, 'Gym Membership', 2500.00, '2026-10-22', 'Monthly fitness center wellness reimbursement', 'uploads/receipts/sample_receipt_14.pdf', 'Submitted', NULL),

-- Case 15: Exact Boundary Test (Meals exactly at limit ₹1,000.00 <= ₹1,000)
(15, 'CLM-2026-014', 4, 'Meals', 1000.00, '2026-10-24', 'Project delivery team dinner at Barbeque Nation', 'uploads/receipts/sample_receipt_15.pdf', 'Submitted', NULL),

-- Case 16: Valid Local Travel (₹1,450 <= ₹5,000 limit, valid receipt)
(16, 'CLM-2026-015', 2, 'Travel', 1450.00, '2026-10-26', 'Uber rides for client product presentation', 'uploads/receipts/sample_receipt_16.pdf', 'Submitted', NULL);

-- ------------------------------------------------------------------------------
-- Seed Initial Audit Logs for all submitted claims
-- ------------------------------------------------------------------------------
INSERT INTO audit_log (claim_id, user_id, action, old_status, new_status, comments, created_at) VALUES
(1, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-22 14:30:00'),
(2, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-23 18:45:00'),
(3, 3, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-21 09:15:00'),
(4, 3, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-24 11:20:00'),
(5, 4, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-24 16:00:00'),
(6, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-18 10:00:00'),
(7, 2, 'SUBMIT', NULL, 'Submitted', 'Resubmitted duplicate claim copy', '2026-10-19 11:30:00'),
(8, 4, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-25 12:00:00'),
(9, 3, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-15 17:10:00'),
(10, 3, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-19 20:05:00'),
(11, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-20 15:40:00'),
(12, 3, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-14 13:25:00'),
(13, 4, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-25 14:50:00'),
(14, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-22 16:30:00'),
(15, 4, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-24 19:10:00'),
(16, 2, 'SUBMIT', NULL, 'Submitted', 'Initial claim submission by employee', '2026-10-26 10:15:00');
