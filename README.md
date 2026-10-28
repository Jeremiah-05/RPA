# Automated Expense Claim Verification System
### Enterprise Hybrid Full-Stack Web + UiPath Robotic Process Automation (RPA)

[![UiPath Studio](https://img.shields.io/badge/UiPath%20Studio-Community%20v26%20%7C%20Windows-blue.svg)](https://www.uipath.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20Express-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18%20%7C%20Vite%20%2B%20Tailwind-cyan.svg)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%20%7C%20Relational%20Schema-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/Capstone-Academic%20Final%20Year%20Project-purple.svg)](#)

---

## 📌 Project Overview

The **Automated Expense Claim Verification System** is an enterprise-grade hybrid capstone application designed to eliminate manual audit delays, spreadsheet discrepancies, and fraudulent corporate reimbursements. It pairs a high-performance **React 18 + Vite + Tailwind CSS** web application with an autonomous **UiPath Studio RPA Bot (v26)** connected through real-time Excel workbooks (`.xlsx`), dynamic background synchronization, and a zero-touch file watcher bridge.

### The Business Challenge
In modern enterprises, expense auditing requires finance teams to manually compare thousands of employee receipts against department budget caps, expense dates, duplicate submission histories, and corporate policy rules. This manual workflow creates:
- Severe reimbursement delays (average 7–14 days per claim cycle).
- High rate of human oversight (missed duplicate submissions, over-limit approvals).
- Inconsistent policy enforcement across departments.

### The Automated Solution
1. **Employees** submit expense claims with uploaded receipts (PDF/JPEG) via an intuitive, role-scoped web portal.
2. **Backend Engine** automatically synchronizes all pending `Submitted` claims and real-time category policy caps into an exchange spreadsheet (`rpa/input/claims_input.xlsx`).
3. **UiPath RPA Bot** reads the workbook, caches category policies into memory dictionaries, evaluates 5 strict business rules, appends audit columns, and writes verified outcomes to `rpa/output/claims_verified.xlsx`.
4. **Auto-Ingestion Bridge (Chokidar)** detects the verified workbook, parses results using SheetJS, executes atomic MySQL transactions, and updates the **Executive Analytics Dashboard** in real time.
5. **Finance Managers** review bot-flagged violations, preview original receipts in-app, and perform final human governance (`Approve`, `Reject`, or `Request Correction`).

---

## 🏗️ System Architecture & Data Flow

```text
 +─────────────────────────────────────────────────────────────────────────────+
 │                       React 18 + Vite + Tailwind CSS                        │
 │         (Employee Portal, Executive Dashboard, Verification Engine)         │
 +─────────────────────────────────────────────────────────────────────────────+
                                        │
                        REST API Calls  │  JWT Bearer + FormData
                                        ▼
 +─────────────────────────────────────────────────────────────────────────────+
 │                         Node.js + Express REST API                          │
 │         (Auth, Multer Upload, SheetJS Parser, Auto-Sync Engine)             │
 +─────────────────────────────────────────────────────────────────────────────+
           │                                                       ▲
           │ SQL Queries                                           │ Chokidar File
           ▼                                                       │ Watcher Auto-Import
 +────────────────────+                                  +───────────────────────────+
 │     MySQL 8.0      │                                  │   /rpa/output/            │
 │  expense_rpa_db    │                                  │   claims_verified.xlsx    │
 +────────────────────+                                  +───────────────────────────+
           │                                                           ▲
           │ Auto-Sync on Insert/Update                                │ Excel Write
           ▼                                                           │ Range
 +────────────────────────────+                         +────────────────────────────+
 │     /rpa/input/            │                         │    UiPath Studio RPA Bot   │
 │     claims_input.xlsx      │────────────────────────>│  (Main.xaml Workflow Engine)│
 │ (Claims & Policies Sheets) │       Excel Read Range  │ (Dynamic Policy Caching)   │
 +────────────────────────────+                         +────────────────────────────+
```

---

## ⚙️ Core Technical Highlights

- **Dynamic Auto-Synchronization**: Whenever a claim is created, edited, or bulk-imported, the backend automatically refreshes `rpa/input/claims_input.xlsx` on disk. UiPath Studio (<kbd>Ctrl</kbd>+<kbd>F5</kbd>) always receives the newest pending claims dynamically.
- **1-Click Web Bot Verification**: Instant execution directly from the web portal via `POST /api/rpa/simulate`, auto-syncing MySQL claims, executing the 5 verification rules, and committing results in a single click.
- **Bulk Excel/CSV Claim Import**: Integrated spreadsheet parser accepting `.xlsx`, `.xls`, and `.csv` files for high-volume batch onboarding.
- **Dynamic 6-Month Spending Trend with Spike Markers**: Recharts area visualization tracking a rolling 6-month corporate trajectory (May to Oct 2026), featuring crisp circular data dots (`•`), an animated pulsing halo on the peak spend spike (October ₹66,100), and interactive claim volume metrics.
- **Dual Fallback UiPath Path Resolution**: `Main.xaml` dynamically checks relative project paths and absolute fallbacks to ensure foolproof execution across different UiPath launch configurations.
- **Zero-Touch Ingestion (Chokidar)**: Background file watcher listens to `rpa/output/claims_verified.xlsx` with stability thresholds, automatically ingesting results without requiring manual admin intervention.
- **1-Click System Launcher (`start_project.bat`)**: Dual-process launcher script starting backend (port 5000), frontend (port 5173), and launching the browser automatically.

---

## 📋 Business Verification Rules Matrix

The UiPath RPA bot executes the following 5 validation rules across every claim:

| # | Rule Name | Condition Evaluated | Flagged Violation Message | Outcome |
|---|---|---|---|---|
| **1** | **Duplicate Claim Check** | `ClaimCode` has been processed previously in batch or database | `"Duplicate submission"` | `Rejected` |
| **2** | **Category Recognition** | `Category` is blank or missing from `Policies` table | `"Incomplete claim"` or `"Category not recognized"` | `Flagged` |
| **3** | **Budget Limit Enforcement** | `Amount > MaxLimit` for that specific category | `"Exceeds category limit"` | `Flagged` |
| **4** | **Mandatory Receipt Proof** | `ReceiptRequired == True` AND `ReceiptPath` is empty/missing | `"Receipt missing"` | `Flagged` |
| **5** | **Expense Date Validation** | `ExpenseDate > Today` OR invalid date format | `"Invalid date"` | `Flagged` |
| **-** | **Clean / Valid Claim** | All 5 checks pass with 0 violations | *(No violations recorded)* | `Verified - Pending Approval` |

---

## 🧪 Comprehensive Seed Claims Test Matrix (16 Cases)

The preloaded database includes 16 realistic claims designed to test all edge cases during presentations:

| Claim Code | Employee | Category | Amount (₹) | Receipt Attached | Edge Case / Scenario | Expected Outcome |
|---|---|---|---|---|---|---|
| `CLM-2026-001` | Rahul Sharma | Meals | ₹750.00 | Yes | Within ₹1,000 limit | **Verified - Pending Approval** |
| `CLM-2026-002` | Rahul Sharma | Meals | ₹2,400.00 | Yes | Exceeds ₹1,000 limit | **Flagged** (`Exceeds category limit`) |
| `CLM-2026-003` | Priya Patel | Travel | ₹3,200.00 | No | Receipt required for Travel | **Flagged** (`Receipt missing`) |
| `CLM-2026-004` | Priya Patel | Office Supplies | ₹1,200.00 | Yes | Future date (`2026-11-20`) | **Flagged** (`Invalid date`) |
| `CLM-2026-005` | Amit Verma | *(NULL)* | ₹1,800.00 | Yes | Missing category | **Flagged** (`Incomplete claim`) |
| `CLM-2026-006` | Rahul Sharma | Travel | ₹4,500.00 | Yes | Valid claim (within ₹5,000 limit) | **Verified - Pending Approval** |
| `CLM-2026-006` | Rahul Sharma | Travel | ₹4,500.00 | Yes | Duplicate claim code submission | **Rejected** (`Duplicate submission`) |
| `CLM-2026-007` | Amit Verma | Meals | ₹3,500.00 | No | Multi-violation (Limit + Receipt + Future Date) | **Flagged** (`Exceeds limit; Receipt missing; Invalid date`) |
| `CLM-2026-008` | Priya Patel | Accommodation | ₹6,800.00 | Yes | Within ₹8,000 limit | **Verified - Pending Approval** |
| `CLM-2026-009` | Priya Patel | Accommodation | ₹11,500.00 | Yes | Exceeds ₹8,000 limit | **Flagged** (`Exceeds category limit`) |
| `CLM-2026-010` | Rahul Sharma | Client Entertainment | ₹2,750.00 | Yes | Within ₹3,000 limit | **Verified - Pending Approval** |
| `CLM-2026-011` | Priya Patel | Certifications | ₹14,500.00 | Yes | Within ₹15,000 limit | **Verified - Pending Approval** |
| `CLM-2026-012` | Amit Verma | Office Supplies | ₹950.00 | No | Missing receipt | **Flagged** (`Receipt missing`) |
| `CLM-2026-013` | Rahul Sharma | Gym Membership | ₹2,500.00 | Yes | Unrecognized policy category | **Flagged** (`Category not recognized`) |
| `CLM-2026-014` | Amit Verma | Meals | ₹1,000.00 | Yes | Exact boundary test (₹1,000 == limit) | **Verified - Pending Approval** |
| `CLM-2026-015` | Rahul Sharma | Travel | ₹1,450.00 | Yes | Within ₹5,000 limit | **Verified - Pending Approval** |

---

## 🚀 Quick Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL**: 8.0 or higher (or MariaDB / XAMPP)
- **UiPath Studio**: Community Edition v23.10+ or v26.x (Windows target framework)

---

### Step 1: Database Setup
1. Open **MySQL Workbench**, **HeidiSQL**, or the MySQL CLI.
2. Execute the initialization schema script:
   ```bash
   mysql -u root -p < "database/schema.sql"
   ```
   *This creates `expense_rpa_db`, configures the 5 tables, and seeds users, active policies, and 16 test claims.*

---

### Step 2: 1-Click Launch (Recommended)
Double-click **`start_project.bat`** in the root directory. It automatically:
1. Starts the Node.js backend on `http://localhost:5000`.
2. Starts the Vite React frontend on `http://localhost:5173`.
3. Opens your default web browser to the Login page.

---

### Manual Launch (Alternative)
**Backend:**
```bash
cd backend
npm install
npm start
```
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

### Step 3: Running the RPA Bot

#### Method A: Using 1-Click Web Simulation (Fastest)
1. Log in as System Admin at `http://localhost:5173/login`.
2. Go to **Verification Engine** (`http://localhost:5173/verification-engine`).
3. Click **Run Bot (1-Click)**. The system auto-syncs MySQL claims, evaluates the 5 verification rules, and updates the database in real-time.

#### Method B: Using UiPath Studio (<kbd>Ctrl</kbd> + <kbd>F5</kbd>)
1. Launch **UiPath Studio**.
2. Open `rpa/UiPath_Workflow_Files/project.json`.
3. Open `Main.xaml`.
4. Press <kbd>Ctrl</kbd> + <kbd>F5</kbd> (or click **Play**).
5. The bot reads `rpa/input/claims_input.xlsx`, caches rules, validates claims, and writes `rpa/output/claims_verified.xlsx`.
6. The backend file watcher detects the file and ingests the results into MySQL automatically.

---

## 🔑 Default Login Credentials

| Role | Email Address | Password | Preloaded Features |
|---|---|---|---|
| **System Admin** | `admin@company.com` | `admin123` | Analytics Dashboard, Verification Engine, Policy Config, Approvals, Excel Reports |
| **Employee 1** | `rahul.sharma@company.com` | `user123` | Submit Claims, Upload Receipts, View Personal History, Track Live Status |
| **Employee 2** | `priya.patel@company.com` | `user123` | Personal Dashboard & Claim Submission |
| **Employee 3** | `amit.verma@company.com` | `user123` | Personal Dashboard & Claim Submission |

*(Quick 1-click **Admin Demo** and **Employee Demo** autofill buttons are available on the Login page).*

---

## 📂 Project Structure

```text
E:\RPA 1\
├── backend/                         # Node.js + Express API
│   ├── config/                      # MySQL database pool (db.js)
│   ├── controllers/                 # Auth, Claims, Policies, RPA Verification
│   ├── middleware/                  # JWT auth, role authorization, Multer upload
│   ├── routes/                      # API endpoints (auth, claims, policies, rpa)
│   ├── uploads/                     # Uploaded receipts storage
│   ├── utils/
│   │   ├── excelGenerator.js        # Exports claims & policies to claims_input.xlsx
│   │   ├── excelParser.js           # SheetJS (xlsx) parser for claims_verified.xlsx
│   │   └── fileWatcher.js           # Chokidar auto-import file watcher on rpa/output/
│   ├── .env                         # Database and JWT configuration
│   └── server.js                    # Application entry point & file watcher init
│
├── frontend/                        # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/              # Navbar, Sidebar, Modal, StatusBadge, StatCards
│   │   ├── pages/                   # DashboardPage, EmployeePortal, ClaimsManagement,
│   │   │                            # VerificationEngine, ReviewApprovalPage, PolicyConfigPage
│   │   ├── services/                # Axios API client (api.js) with JWT interceptors
│   │   ├── index.css                # Tailwind CSS directives & custom styling
│   │   └── App.jsx                  # React Router configuration
│   └── vite.config.js               # Vite configuration
│
├── database/                        # Database Assets
│   └── schema.sql                   # MySQL DDL schema + 16 seed claims + policies
│
├── rpa/                             # RPA Bot & Integration Files
│   ├── input/
│   │   └── claims_input.xlsx        # Excel export generated from database
│   ├── output/
│   │   └── claims_verified.xlsx     # Output Excel workbook written by RPA Bot
│   ├── UiPath_Workflow_Files/       # Ready-to-run UiPath Studio Project
│   │   ├── project.json             # Studio project descriptor & package dependencies
│   │   └── Main.xaml                # Fully validated XAML workflow sequence
│   ├── simulate_bot.js              # Standalone Node.js offline simulator
│   └── README.md                    # Detailed UiPath workflow guide
│
├── docs/                            # Capstone Presentation & Viva Documentation
│   └── VIVA_PRESENTATION_GUIDE.md   # Complete 8-minute presentation script & 15 Q&As
│
├── REPORT.md                        # Formal Academic Final Capstone Project Report
├── start_project.bat                # 1-Click launcher script for backend & frontend
└── README.md                        # Master project documentation
```

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user & returns signed JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated user profile |
| `GET` | `/api/claims` | Authenticated | Lists claims (filtered by user or all for admin) |
| `POST` | `/api/claims` | Employee | Submits new claim with multipart receipt upload |
| `POST` | `/api/claims/bulk-import` | Admin | Bulk imports claims from Excel (.xlsx, .xls) or CSV |
| `PUT` | `/api/claims/:id` | Employee | Updates claim (allowed if Submitted or Needs Correction) |
| `PATCH` | `/api/claims/:id/review` | Admin | Commits Managerial Review (`Approve`/`Reject`/`Correction`) |
| `GET` | `/api/claims/stats/summary` | Authenticated | Rolling 6-month trends, category spend, status counts |
| `GET` | `/api/policies` | Authenticated | Returns current category policy limits |
| `POST` | `/api/rpa/status` | Authenticated | Checks file timestamps, existence, and pending queue size |
| `POST` | `/api/rpa/export` | Admin | Syncs MySQL claims to `rpa/input/claims_input.xlsx` |
| `POST` | `/api/rpa/import` | Admin | Manually triggers ingestion of verified Excel file |
| `POST` | `/api/rpa/simulate` | Admin | 1-Click dynamic bot execution & auto-import |
| `POST` | `/api/rpa/reset-batch` | Admin | Resets claims to 'Submitted' status for re-testing |
| `GET` | `/api/reports/export` | Admin | Downloads multi-sheet executive Excel audit report |
| `GET` | `/api/health` | Public | Health check confirming database and API status |

---

## 🎓 Viva & Presentation Resources

- **Presentation Script & Examiner Q&As**: See [docs/VIVA_PRESENTATION_GUIDE.md](file:///e:/RPA%201/docs/VIVA_PRESENTATION_GUIDE.md) for the 8-minute timed presentation script and 15 examiner technical questions.
- **Academic Capstone Report**: See [REPORT.md](file:///e:/RPA%201/REPORT.md) for the complete academic report covering problem formulation, methodology, architectural design, verification algorithms, and empirical test outcomes.
