// backend/config/db.js
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let activeDbMode = 'mysql'; // 'mysql' or 'sqlite'
let mysqlPool = null;
let sqliteDb = null;

// Initialize SQLite fallback database
function initSqliteDatabase() {
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = path.resolve(__dirname, '..', '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'expense_local.db');
  const isNewDb = !fs.existsSync(dbPath);
  const db = new DatabaseSync(dbPath);

  // Register MySQL compatibility functions in SQLite
  db.function('DATE_FORMAT', (dateVal, fmt) => {
    if (!dateVal) return '';
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return String(dateVal);
    if (fmt && fmt.includes('%Y-%m-%d %H:%i:%s')) return dt.toISOString().slice(0, 19).replace('T', ' ');
    if (fmt && fmt.includes('%Y-%m-%d')) return dt.toISOString().slice(0, 10);
    if (fmt && fmt.includes('%Y-%m')) return dt.toISOString().slice(0, 7);
    return dt.toISOString().slice(0, 10);
  });

  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      max_limit REAL NOT NULL,
      receipt_required INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_code TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      category TEXT,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      receipt_path TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      admin_comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      bot_run_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      outcome TEXT NOT NULL,
      violations TEXT,
      checked_amount REAL NOT NULL,
      policy_limit_applied REAL,
      execution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bot_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_source TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      claims_processed INTEGER NOT NULL DEFAULT 0,
      verified_count INTEGER NOT NULL DEFAULT 0,
      flagged_count INTEGER NOT NULL DEFAULT 0,
      rejected_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Success',
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS claim_ai_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );
  `);

  // Seed sample data if database is fresh
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count || 0;
  if (userCount === 0) {
    console.log('[Database] Seeding initial sample users, policies, and 16 claims into local database...');
    
    // Seed Users
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)');
    insertUser.run(1, 'System Administrator', 'admin@company.com', '$2b$10$xcp5npwchB54hT9c8cEB0Ox67jMpxo1W1t0Le3Zy.DLPFTDU1yUlS', 'admin', 'Finance & Operations');
    insertUser.run(2, 'Rahul Sharma', 'rahul.sharma@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Sales & Marketing');
    insertUser.run(3, 'Priya Patel', 'priya.patel@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Engineering');
    insertUser.run(4, 'Amit Verma', 'amit.verma@company.com', '$2b$10$FrG.47nY2yhdCRdXMiV/quaMpwEdCBr.sDtiSi6L.mSWpvg3csZTa', 'employee', 'Human Resources');

    // Seed Policies
    const insertPolicy = db.prepare('INSERT INTO policies (id, category, max_limit, receipt_required, description, is_active) VALUES (?, ?, ?, ?, ?, ?)');
    insertPolicy.run(1, 'Meals', 1000.00, 1, 'Daily dining and team lunch allowance', 1);
    insertPolicy.run(2, 'Travel', 5000.00, 1, 'Local taxi, rail, or domestic flight tickets', 1);
    insertPolicy.run(3, 'Accommodation', 8000.00, 1, 'Hotel stays during business travel', 1);
    insertPolicy.run(4, 'Office Supplies', 2000.00, 1, 'Stationery, adapters, monitors, and peripherals', 1);
    insertPolicy.run(5, 'Client Entertainment', 3000.00, 1, 'Official dinner or meetings with prospective clients', 1);
    insertPolicy.run(6, 'Certifications', 15000.00, 1, 'Professional IT / domain certifications and exam vouchers', 1);

    // Seed Claims
    const insertClaim = db.prepare('INSERT INTO claims (id, claim_code, user_id, category, amount, expense_date, description, receipt_path, status, admin_comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertClaim.run(1, 'CLM-2026-001', 2, 'Meals', 750.00, '2026-10-22', 'Client lunch meeting at Olive Bistro', 'uploads/receipts/sample_receipt_01.pdf', 'Submitted', null);
    insertClaim.run(2, 'CLM-2026-002', 2, 'Meals', 2400.00, '2026-10-23', 'Dinner with regional sales team at The Grand', 'uploads/receipts/sample_receipt_02.pdf', 'Submitted', null);
    insertClaim.run(3, 'CLM-2026-003', 3, 'Travel', 3200.00, '2026-10-21', 'Airport cab charges to client office', null, 'Submitted', null);
    insertClaim.run(4, 'CLM-2026-004', 3, 'Office Supplies', 1200.00, '2026-11-20', 'Wireless keyboard and mouse combo', 'uploads/receipts/sample_receipt_04.pdf', 'Submitted', null);
    insertClaim.run(5, 'CLM-2026-005', 4, null, 1800.00, '2026-10-24', 'Printer ink cartridges and photo paper', 'uploads/receipts/sample_receipt_05.pdf', 'Submitted', null);
    insertClaim.run(6, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted', null);
    insertClaim.run(7, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment (re-sent)', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted', null);
    insertClaim.run(8, 'CLM-2026-007', 4, 'Meals', 3500.00, '2026-12-05', 'Annual team celebration dinner', null, 'Submitted', null);
    insertClaim.run(9, 'CLM-2026-008', 3, 'Accommodation', 6800.00, '2026-10-15', '2 nights stay at Lemon Tree Premier for tech conference', 'uploads/receipts/sample_receipt_08.pdf', 'Submitted', null);
    insertClaim.run(10, 'CLM-2026-009', 3, 'Accommodation', 11500.00, '2026-10-19', 'Luxury suite hotel stay during offsite', 'uploads/receipts/sample_receipt_09.pdf', 'Submitted', null);
    insertClaim.run(11, 'CLM-2026-010', 2, 'Client Entertainment', 2750.00, '2026-10-20', 'Coffee and snacks with prospective vendor partners', 'uploads/receipts/sample_receipt_10.pdf', 'Submitted', null);
    insertClaim.run(12, 'CLM-2026-011', 3, 'Certifications', 14500.00, '2026-10-14', 'AWS Certified Solutions Architect exam fee', 'uploads/receipts/sample_receipt_11.pdf', 'Submitted', null);
    insertClaim.run(13, 'CLM-2026-012', 4, 'Office Supplies', 950.00, '2026-10-25', 'Whiteboard markers and sticky notes for brainstorming', null, 'Submitted', null);
    insertClaim.run(14, 'CLM-2026-013', 2, 'Gym Membership', 2500.00, '2026-10-22', 'Monthly fitness center wellness reimbursement', 'uploads/receipts/sample_receipt_14.pdf', 'Submitted', null);
    insertClaim.run(15, 'CLM-2026-014', 4, 'Meals', 1000.00, '2026-10-24', 'Project delivery team dinner at Barbeque Nation', 'uploads/receipts/sample_receipt_15.pdf', 'Submitted', null);
    insertClaim.run(16, 'CLM-2026-015', 2, 'Travel', 1450.00, '2026-10-26', 'Uber rides for client product presentation', 'uploads/receipts/sample_receipt_16.pdf', 'Submitted', null);

    // Seed Audit Log
    const insertAudit = db.prepare('INSERT INTO audit_log (claim_id, user_id, action, old_status, new_status, comments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (let i = 1; i <= 16; i++) {
      insertAudit.run(i, 2, 'SUBMIT', null, 'Submitted', 'Initial claim submission by employee', '2026-10-22 14:30:00');
    }
  }

  return db;
}

// Format SQL for SQLite (clean MySQL-specific hints)
function sanitizeSqlForSqlite(sql) {
  return sql
    .replace(/\s+FOR\s+UPDATE/gi, '')
    .replace(/CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
}

// Convert SQLite objects to plain JSON objects
function cleanSqliteRow(row) {
  if (!row) return row;
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    cleaned[key] = value;
  }
  return cleaned;
}

// Fallback SQLite execution engine
function executeSqliteQuery(sql, params = []) {
  const sanitized = sanitizeSqlForSqlite(sql).trim();
  const lower = sanitized.toLowerCase();

  // Normalize parameters (e.g. booleans to 1/0)
  const normalizedParams = (params || []).map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().replace('T', ' ').substring(0, 19);
    return p === undefined ? null : p;
  });

  if (lower.startsWith('select')) {
    const stmt = sqliteDb.prepare(sanitized);
    const rows = stmt.all(...normalizedParams).map(cleanSqliteRow);
    return [rows, []];
  } else if (lower.startsWith('insert')) {
    const stmt = sqliteDb.prepare(sanitized);
    const res = stmt.run(...normalizedParams);
    return [{ insertId: Number(res.lastInsertRowid), affectedRows: res.changes }, []];
  } else {
    const stmt = sqliteDb.prepare(sanitized);
    const res = stmt.run(...normalizedParams);
    return [{ affectedRows: res.changes }, []];
  }
}

// Transparent Dual-Engine Database Pool Wrapper
const dbAdapter = {
  async query(sql, params) {
    if (activeDbMode === 'mysql' && mysqlPool) {
      try {
        return await mysqlPool.query(sql, params);
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
          console.warn('[Database] MySQL connection dropped. Falling back to local embedded database.');
          activeDbMode = 'sqlite';
          if (!sqliteDb) sqliteDb = initSqliteDatabase();
          return executeSqliteQuery(sql, params);
        }
        throw err;
      }
    } else {
      if (!sqliteDb) sqliteDb = initSqliteDatabase();
      return executeSqliteQuery(sql, params);
    }
  },

  async getConnection() {
    if (activeDbMode === 'mysql' && mysqlPool) {
      try {
        return await mysqlPool.getConnection();
      } catch (err) {
        console.warn('[Database] Failed to get MySQL connection. Using local embedded database.');
        activeDbMode = 'sqlite';
      }
    }

    if (!sqliteDb) sqliteDb = initSqliteDatabase();

    // Emulated connection object for transactions
    return {
      async query(sql, params) {
        return executeSqliteQuery(sql, params);
      },
      async beginTransaction() {
        sqliteDb.exec('BEGIN TRANSACTION;');
      },
      async commit() {
        try {
          sqliteDb.exec('COMMIT;');
        } catch (e) {
          // Transaction may have already completed
        }
      },
      async rollback() {
        try {
          sqliteDb.exec('ROLLBACK;');
        } catch (e) {}
      },
      release() {}
    };
  }
};

// Probe MySQL connectivity on startup
async function initDatabaseEngine() {
  try {
    const candidatePool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'expense_rpa_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000
    });

    const conn = await candidatePool.getConnection();
    console.log(`[Database] Successfully connected to MySQL (${process.env.DB_NAME || 'expense_rpa_db'}) on port ${process.env.DB_PORT || 3306}`);
    conn.release();
    mysqlPool = candidatePool;
    activeDbMode = 'mysql';
  } catch (err) {
    console.log(`[Database] MySQL server not detected on localhost:3306 (${err.code || err.message}).`);
    console.log('[Database] Activating embedded zero-config local database engine (database/expense_local.db).');
    sqliteDb = initSqliteDatabase();
    activeDbMode = 'sqlite';
    console.log('[Database] Embedded local database engine is online and fully seeded.');
  }
}

initDatabaseEngine();

module.exports = dbAdapter;
