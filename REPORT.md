# Project Report: Automated Expense Claim Verification System
### Final Capstone Project Report | Academic Year 2025–2026

---

## 📑 Table of Contents
1. [Executive Summary & Abstract](#1-executive-summary--abstract)
2. [Introduction & Problem Formulation](#2-introduction--problem-formulation)
3. [Process Transformation: AS-IS vs. TO-BE Model](#3-process-transformation-as-is-vs-to-be-model)
4. [System Architecture & Data Flow](#4-system-architecture--data-flow)
5. [RPA Suitability & Platform Comparison](#5-rpa-suitability--platform-comparison)
6. [Technology Stack & Rationale](#6-technology-stack--rationale)
7. [Database Schema & Data Models](#7-database-schema--data-models)
8. [UiPath RPA Bot Workflow & Logic Engine](#8-uipath-rpa-bot-workflow--logic-engine)
9. [Business Verification Rules Matrix](#9-business-verification-rules-matrix)
10. [End-to-End Integration & Auto-Sync Pipeline](#10-end-to-end-integration--auto-sync-pipeline)
11. [Executive Analytics & Data Visualization](#11-executive-analytics--data-visualization)
12. [Human-in-the-Loop Governance & Audit Trail](#12-human-in-the-loop-governance--audit-trail)
13. [Testing & Verification Test Matrix (16 Cases)](#13-testing--verification-test-matrix-16-cases)
14. [Performance Benchmarks & Empirical Timing Analysis](#14-performance-benchmarks--empirical-timing-analysis)
15. [Deployment & 1-Click Execution Guide](#15-deployment--1-click-execution-guide)
16. [Limitations, Future Scope & Conclusion](#16-limitations-future-scope--conclusion)

---

## 1. Executive Summary & Abstract

In enterprise accounting and human resources management, corporate expense auditing represents a high-volume, repetitive, yet mission-critical business workflow. Manual verification of employee reimbursement receipts against fluctuating department budgets, spending policies, and historical submission records requires extensive human labor, introduces human oversight errors, and causes lengthy reimbursement turnaround cycles.

This report documents the design, implementation, and empirical evaluation of the **Automated Expense Claim Verification System**—a hybrid, full-stack enterprise platform integrating a modern web portal (**React 18 + Node.js + Express + MySQL 8.0**) with an autonomous **UiPath Studio Robotic Process Automation (RPA) Bot**. 

The system automates the complete lifecycle:
- Employees submit reimbursement claims with digitized receipts via a modern web interface.
- The backend automatically syncs pending submissions and active policy caps into a dual-sheet exchange spreadsheet (`claims_input.xlsx`).
- The UiPath Studio RPA bot iterates over all claims, enforces 5 strict business compliance rules (duplicate detection, category recognition, spending cap enforcement, receipt verification, and future-date invalidation), and generates a verified audit sheet (`claims_verified.xlsx`).
- An event-driven file watcher (`chokidar`) auto-ingests the verified results using SheetJS into MySQL within seconds, dynamically updating executive dashboard metrics and managerial review queues.

Empirical testing across the 16 seeded benchmark claims (7 Verified, 8 Flagged, 1 Rejected) demonstrates an automated batch verification throughput under 10 seconds in UiPath Studio (and under 100 milliseconds in the companion simulator), deterministic in-batch duplicate interception, and zero-touch file synchronization between the web application and RPA worker.

---

## 2. Introduction & Problem Formulation

### 2.1 Background
Corporate travel, client entertainment, training certifications, and office supplies incur millions of dollars in reimbursable employee expenses annually. Corporate policies dictate strict category spending caps (e.g., Meals capped at ₹1,000, Travel at ₹5,000), receipt attachment mandates, and submission validity windows.

### 2.2 Challenges with Traditional Manual Audits
1. **Severe Latency**: Reviewing receipts manually averages 8 to 14 minutes per claim. In organizations processing thousands of monthly claims, this leads to reimbursement backlogs of 2 to 3 weeks.
2. **Human Fatigue & Oversight**: Manual reviewers frequently overlook duplicate submissions within batches or subtle budget breaches (e.g. ₹1,050 on a ₹1,000 cap).
3. **Inflexible Policy Updates**: When finance leadership adjusts policy thresholds, disseminating updated limits via email or PDF manuals results in audit inconsistencies across regional branches.
4. **Lack of Centralized Audit Trail**: Disconnected paper receipts and manual spreadsheets compromise corporate governance during statutory financial audits.

### 2.3 Project Objectives
- Build an intuitive web portal for employees to submit claims and upload digital receipt attachments.
- Construct an autonomous UiPath Studio bot capable of loading dynamic policy caps at runtime without code alterations.
- Enforce 5 rigorous audit rules with multi-violation string concatenation.
- Create a zero-touch, bidirectional bridge between Node.js and UiPath via Microsoft Excel spreadsheets.
- Maintain an immutable, tamper-proof audit trail for regulatory compliance.
- Deliver real-time executive dashboard analytics visualizing monthly spend trends, category distribution, and approval funnels in Indian Rupees (₹).

---

## 3. Process Transformation: AS-IS vs. TO-BE Model

To quantify the operational transformation introduced by Robotic Process Automation, the business workflow was modeled across two comparative phases: the legacy manual review workflow (**AS-IS**) and the automated, full-stack RPA verification pipeline (**TO-BE**).

### 3.1 AS-IS Manual Workflow vs. TO-BE Automated Architecture

```mermaid
flowchart TD
    subgraph AS_IS["AS-IS Manual Workflow"]
        direction TB
        subgraph AI_Emp["Employee"]
            AI1["Collect Paper or PDF Receipts"] --> AI2["Fill Excel Expense Form"]
            AI2 --> AI3["Email Form and Receipts to Finance"]
        end
        subgraph AI_Fin["Finance Reviewer"]
            AI3 --> AI4["Download Email Attachments"]
            AI4 --> AI5["Manual Policy Lookup in PDF Guide"]
            AI5 --> AI6{"Check Policy Rules"}
            AI6 -- "Exception: Missing Receipt or Overlimit" --> AI7["Draft Clarification Email to Employee"]
            AI7 -.-> AI2
            AI6 -- "Valid Claim" --> AI8["Compile Manual Summary Sheet"]
        end
        subgraph AI_Mgr["Manager"]
            AI8 --> AI9["Inspect Summary Sheet"]
            AI9 --> AI10{"Manager Decision"}
            AI10 -- "Approve" --> AI11["Forward to Payroll"]
            AI10 -- "Reject" --> AI12["Manual Rejection Notification"]
        end
    end
```

```mermaid
flowchart TD
    subgraph TO_BE["TO-BE Automated RPA Workflow"]
        direction TB
        subgraph TB_Emp["Employee Portal"]
            TB1["Login and Fill Digital Claim Form"] --> TB2["Upload Receipt (PDF or Image)"]
            TB2 --> TB3["Submit Claim"]
            TB_Correction["Review Comments and Update Claim"] --> TB3
        end
        subgraph TB_Back["Node.js + MySQL Backend"]
            TB3 --> TB4["Store Claim and Receipt in MySQL"]
            TB4 --> TB5["Auto-Sync pending claims to claims_input.xlsx"]
            TB_Watch["Chokidar Watcher / Manual Ingest"] --> TB6["Parse claims_verified.xlsx via SheetJS"]
            TB6 --> TB7["Atomic DB Transaction: Status and Audit Log"]
            TB7 --> TB8["Real-Time Dashboard and Monitoring KPI Update"]
        end
        subgraph TB_Bot["UiPath Studio RPA Bot"]
            TB5 --> TB9{"Input File Ready?"}
            TB9 -- "No (File Missing)" --> TB_Err1["Log Fatal Error and Stop"]
            TB9 -- "Yes" --> TB10["Read Policies Sheet into Memory Dictionaries"]
            TB10 --> TB11["Iterate dt_Claims Rows"]
            TB11 --> TB12{"Pre-Validation: Amount and Date Format"}
            TB12 -- "Bad Amount (NaN)" --> TB13["Flag row: Corrupt Amount"]
            TB12 -- "Bad or Future Date" --> TB14["Flag row: Invalid date"]
            TB12 -- "Valid Formats" --> TB15["Evaluate 5 Rules (Duplicate, Category, Limit, Receipt, Date)"]
            TB13 --> TB16["Append Audit Columns to dt_Claims"]
            TB14 --> TB16
            TB15 --> TB16
            TB16 --> TB17["Write claims_verified.xlsx"]
            TB17 --> TB_Watch
        end
        subgraph TB_Mgr["Manager Governance (Review and Approvals)"]
            TB8 --> TB18["Inspect Pre-Verified Claims and Bot Violations"]
            TB18 --> TB19{"Decision"}
            TB19 -- "Approve" --> TB20["Approved for Payout"]
            TB19 -- "Reject" --> TB21["Rejected (Logged in DB)"]
            TB19 -- "Request Correction" --> TB_Correction
        end
    end
```

### 3.2 Key Exception Paths Handled by the Automated TO-BE Pipeline
1. **Missing Input File / Missing Worksheet**: The RPA bot verifies file and sheet existence via Retry Scope and graceful pre-flight guards, logging errors rather than crashing silently.
2. **Corrupt / Non-Numeric Amount**: A per-row safety Try-Catch isolates rows with non-numeric amounts, flagging them as malformed without aborting the batch.
3. **Invalid or Future Date**: Evaluated deterministically against today's system clock; future dates are flagged (`Invalid date`).
4. **Missing Receipts**: Checked directly against the dynamic category policy requirement (`ReceiptRequired = TRUE`).
5. **In-Batch Duplicate Claims**: Tracked via in-memory hashing (`list_SeenClaimCodes`), immediately resulting in a `Rejected` status.

---

## 4. System Architecture & Data Flow

The platform employs a decoupled 4-tier hybrid architecture balancing high-throughput web operations with autonomous desktop RPA workers.

```text
+-------------------------------------------------------------------------------+
|                       Presentation Tier (React 18 + Vite)                     |
|           [Employee Portal]  [Executive Dashboard]  [Verification Engine]     |
+-------------------------------------------------------------------------------+
                                        │
                         RESTful HTTPS  │  JWT Bearer + Multipart FormData
                                        ▼
+-------------------------------------------------------------------------------+
|                       Application Tier (Node.js + Express)                    |
|       [Auth Controller]  [Claims Controller]  [RPA Bridge]  [File Watcher]    |
+-------------------------------------------------------------------------------+
           │                                                       ▲
           │ Parameterized SQL                                     │ Chokidar Event
           ▼                                                       │ Detection
+────────────────────+                                  +───────────────────────────+
|   Persistence Tier |                                  |    Exchange Interface     |
|      MySQL 8.0     |                                  |   /rpa/output/            |
|   expense_rpa_db   |                                  |   claims_verified.xlsx    |
+────────────────────+                                  +───────────────────────────+
           │                                                           ▲
           │ Auto-Sync on Insert/Update                                │ Excel Write
           ▼                                                           │ Range
+────────────────────────────+                         +────────────────────────────+
|     Exchange Interface     |                         |      Automation Tier       |
|     /rpa/input/            |                         |    UiPath Studio Bot       |
|     claims_input.xlsx      |────────────────────────>│  (Main.xaml Workflow Engine)|
| (Claims & Policies Sheets) |       Excel Read Range  | (Dynamic Policy Caching)   |
+────────────────────────────+                         +────────────────────────────+
```

### Architectural Flow Stages:
1. **Submission**: Employee submits claim -> Backend inserts into MySQL with status `Submitted` and stores receipt in `/uploads/receipts/`.
2. **Auto-Synchronization**: Backend immediately calls `syncClaimsInputExcel()`, querying all pending `Submitted` claims and active category limits, generating `rpa/input/claims_input.xlsx`.
3. **Autonomous Verification**:
   - *Via UiPath Studio*: Auditor opens Studio and presses <kbd>Ctrl</kbd>+<kbd>F5</kbd>.
   - *Via Web Portal*: Admin clicks **Run Bot (1-Click)** on the Verification Engine page.
4. **Audit Column Augmentation**: The bot appends `Outcome`, `Violations`, `BotTimestamp`, `CheckedAmount`, and `PolicyLimitApplied` to `claims_verified.xlsx`.
5. **Zero-Touch Ingestion**: The `chokidar` file watcher detects the verified workbook, parses records with SheetJS, executes a MySQL transaction, and updates the live dashboard.
6. **Managerial Governance**: Finance administrators review bot-flagged violations, inspect uploaded receipts in-app, and grant final `Approve`, `Reject`, or `Request Correction` decisions.

---

## 5. RPA Suitability & Platform Comparison

### 5.1 RPA Suitability Assessment
Before implementing automated robotics, enterprise business processes must be evaluated against established RPA suitability criteria. The expense verification workflow exhibits high suitability across all core technical dimensions:

| Suitability Criterion | Process Characteristic in Expense Verification | Suitability Rating | Engineering Rationale |
|---|---|---|---|
| **Rule-Based Decisions** | 5 deterministic business rules (spending limit, receipt mandate, duplicate match, valid date, category match) | **High** | Decisions rely entirely on mathematical and boolean conditions without subjective interpretation. |
| **Structured Digital Input** | Excel OpenXML workbook (`claims_input.xlsx`) with fixed columns and typed data fields | **High** | Eliminates unstructured OCR ambiguities at the bot handoff layer; data is programmatically formatted by the backend. |
| **Transaction Volume** | Hundreds to thousands of recurring claims per employee roster per billing cycle | **High** | High repetition amortizes robot development cost and delivers immediate labor savings. |
| **Exception Rate** | Business exceptions (over-budget, missing receipts) are predictable and follow standard branching | **High** | True anomalies (corrupt rows) are trapped by Try-Catch scopes without terminating batch processing. |
| **Interface Stability** | Standardized REST API contracts, OpenXML specifications, and indexed relational SQL schemas | **High** | No fragile UI screen-scraping; data exchange occurs via deterministic file paths and database drivers. |

### 5.2 Technology Comparison: UiPath Studio vs. Microsoft Power Automate
A critical architectural decision was selecting the core RPA automation engine. Below is a factual comparative assessment between **UiPath Studio** and **Microsoft Power Automate**:

| Evaluation Factor | UiPath Studio (Community v26 / Windows) | Microsoft Power Automate (Desktop / Cloud) | Project Selection Advantage |
|---|---|---|---|
| **Excel Manipulation Engine** | Native OpenXML/ClosedXML activities (`UiPath.Excel.Activities`) execute with or without local Microsoft Excel installed. | Power Automate Desktop requires local Excel application automation (COM); Cloud flows require Office 365 cloud connectors. | **UiPath**: Headless server-compatible workbook processing without desktop UI dependencies. |
| **Visual Workflow Orchestration** | Native XAML activity designer with explicit `TryCatch`, `RetryScope`, and fine-grained variable scope control. | Action blocks in desktop flow designer; error handling configured at block level with less granular scope inspection. | **UiPath**: Superior low-level debugging, call stacks, and enterprise auditability. |
| **Package Compilation & Portability** | Standalone `.nupkg` package compilation; version-controlled cleanly with Git; deployable to unattended workers. | Flows tied to Microsoft Dataverse environments and cloud solution packages. | **UiPath**: Self-contained local project structure suitable for academic review, version control, and unattended deployment. |
| **Licensing & Accessibility** | Free Community Edition with full Studio capabilities for individuals and educational evaluation. | Requires Microsoft 365 tenant administrative rights and premium per-user/per-flow licenses for desktop RPA. | **UiPath**: Fully autonomous local operation without corporate cloud tenant administrative barriers. |

---

## 6. Technology Stack & Rationale

| Component | Technology | Version | Engineering Rationale |
|---|---|---|---|
| **Frontend Framework** | React | 18.2 | Component-driven declarative UI, virtual DOM diffing for rapid dashboard rendering |
| **Build Tooling** | Vite | 5.4 | Hot module replacement (HMR), sub-second cold start, optimized production rollup |
| **Styling** | Tailwind CSS | 3.4 | Utility-first styling enabling bespoke corporate glassmorphism and responsive layouts |
| **Charting Library** | Recharts | 2.12 | Declarative SVG-based charting with gradient fills, custom dot renderers, and responsive containers |
| **Backend Runtime** | Node.js | v18+ | Asynchronous event-driven I/O ideal for non-blocking file handling and REST endpoints |
| **Web Server** | Express | 4.19 | Lightweight, extensible middleware architecture supporting robust JWT and role security |
| **RPA Platform** | UiPath Studio | Community v26 | Industry-standard enterprise RPA engine targeting modern Windows .NET 8 / CoreCLR |
| **File Parser** | SheetJS (`xlsx`) | 0.18 | High-throughput parsing supporting ClosedXML, OpenXML, and legacy Excel namespace variants |
| **File Watcher** | Chokidar | 3.6 | Cross-platform event-driven file monitoring wrapping Windows `ReadDirectoryChangesW` |
| **Database Engine** | MySQL | 8.0 | ACID transactional compliance, relational foreign keys, indexed querying, and strict constraints |

---

## 7. Database Schema & Data Models

The relational schema (`expense_rpa_db`) consists of 7 normalized tables:

### 7.1 Tables Architecture

```text
users ───< claims ───< verification_results
             │
             ├───< audit_log
             │
             ├───< claim_ai_notes (Groq AI advisory cache)
             │
policies (Category rules)

bot_runs (RPA execution telemetry & monitoring)
```

1. **`users`**: Stores user authentication credentials, role scopes (`admin` vs `employee`), department names, and profile metadata.
2. **`policies`**: Stores active category expense ceilings (`max_limit`), mandatory receipt requirements (`receipt_required`), and activation status.
3. **`claims`**: Core transactional record storing claim codes, user IDs, amounts, expense dates, descriptions, uploaded receipt paths, and lifecycle statuses:
   - `Submitted`
   - `Verified - Pending Approval`
   - `Flagged`
   - `Approved`
   - `Rejected`
   - `Needs Correction`
4. **`verification_results`**: Historical record of every bot verification execution, recording bot timestamps, identified violations, applied category limits, and execution notes.
5. **`audit_log`**: Tamper-proof event log tracking state transitions (`SUBMIT`, `RPA_VERIFY`, `APPROVE`, `REJECT`, `RESUBMIT`, `SYSTEM_RESET`) with actor user IDs and comments.
6. **`bot_runs`**: Telemetry log tracking every RPA execution (`run_source` ENUM `'uipath'/'simulator'`, `started_at`, `finished_at`, `duration_ms`, `claims_processed`, `verified_count`, `flagged_count`, `rejected_count`, `status` ENUM `'Success'/'Failed'`, and `error_message`).
7. **`claim_ai_notes`**: Cache table storing on-demand Groq LLM advisory notes (`claim_id`, `model_used`, `summary_text`, `action_recommendation`, `created_at`) preventing redundant external API calls.

---

## 8. UiPath RPA Bot Workflow & Logic Engine

The RPA workflow is implemented in [`rpa/UiPath_Workflow_Files/Main.xaml`](file:///e:/RPA%201/rpa/UiPath_Workflow_Files/Main.xaml) targeting the modern Windows framework.

### 6.1 Memory Caching Architecture
Rather than hardcoding limits in conditional activities, the bot dynamically builds an in-memory dictionary cache:
```vb
' Read Policies Sheet into memory
For Each policyRow In dt_Policies.Rows
    Dim cat As String = policyRow("Category").ToString().Trim()
    Dim limit As Double = Convert.ToDouble(policyRow("MaxLimit"))
    Dim reqReceipt As Boolean = Convert.ToBoolean(policyRow("ReceiptRequired"))
    
    dict_PolicyLimits(cat) = limit
    dict_ReceiptRequired(cat) = reqReceipt
Next
```

### 6.2 Dual Fallback File Path Resolution
To ensure error-free execution across varying working directories:
```vb
' str_InputFilePath:
If(File.Exists(Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..\input\claims_input.xlsx"))),
   Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..\input\claims_input.xlsx")),
   "E:\RPA 1\rpa\input\claims_input.xlsx")

' str_OutputFilePath:
If(Directory.Exists(Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..\output"))),
   Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..\output\claims_verified.xlsx")),
   "E:\RPA 1\rpa\output\claims_verified.xlsx")
```

---

## 9. Business Verification Rules Matrix

Every claim row undergoes 5 sequential compliance evaluations:

```text
                   +------------------------------+
                   |       Claim Data Row         |
                   +------------------------------+
                                  │
                                  ▼
                   +──────────────────────────────+
                   |  [RULE 1] Duplicate Check    |── Yes ──> Add "Duplicate submission"
                   +──────────────────────────────+           Outcome = "Rejected"
                                  │ No
                                  ▼
                   +──────────────────────────────+
                   |  [RULE 2] Category Valid?    |── No ───> Add "Category not recognized"
                   +──────────────────────────────+           Outcome = "Flagged"
                                  │ Yes
                                  ▼
                   +──────────────────────────────+
                   |  [RULE 3] Amount <= Limit?   |── No ───> Add "Exceeds category limit"
                   +──────────────────────────────+           Outcome = "Flagged"
                                  │ Yes
                                  ▼
                   +──────────────────────────────+
                   |  [RULE 4] Receipt Attached?  |── No ───> Add "Receipt missing"
                   +──────────────────────────────+           Outcome = "Flagged"
                                  │ Yes
                                  ▼
                   +──────────────────────────────+
                   |  [RULE 5] Expense Date Valid?|── No ───> Add "Invalid date"
                   +──────────────────────────────+           Outcome = "Flagged"
                                  │ Yes
                                  ▼
                   +──────────────────────────────+
                   | 0 Violations Recorded        |
                   | Outcome: "Verified"          |
                   +──────────────────────────────+
```

### Multiple Violations Handling
If a claim exhibits multiple infractions (e.g. `CLM-2026-007` with budget breach + missing receipt + future expense date), the bot records all violations separated by semicolons:
`"Exceeds category limit; Receipt missing; Invalid date"`
This equips human managers with full context during review.

---

## 10. End-to-End Integration & Auto-Sync Pipeline

### 8.1 Real-Time Background Auto-Synchronization
Whenever a claim is inserted, updated, or imported via spreadsheet, the Node.js backend triggers `syncClaimsInputExcel()`:
- Queries all claims matching `status = 'Submitted'`.
- Formats dates as `YYYY-MM-DD` and currency as `₹#,##0.00`.
- Exports active policy limits into the `Policies` sheet.
- Saves `rpa/input/claims_input.xlsx` atomically.
This guarantees that whenever UiPath Studio runs (<kbd>Ctrl</kbd>+<kbd>F5</kbd>), it always processes the latest live submissions.

### 8.2 Event-Driven Ingestion via Chokidar
In `backend/utils/fileWatcher.js`, Chokidar listens for changes to `rpa/output/claims_verified.xlsx`:
- Configured with `awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 }` to ensure UiPath has closed the Excel write stream before reading.
- Calls `processRpaResultsImport()`, reading results using SheetJS.
- Begins an atomic MySQL transaction (`BEGIN TRANSACTION` -> `SELECT FOR UPDATE` -> `UPDATE claims` -> `INSERT verification_results` -> `INSERT audit_log` -> `COMMIT`).

---

## 11. Executive Analytics & Data Visualization

The Executive Analytics Dashboard (`DashboardPage.jsx`) provides financial oversight using **Recharts**:

### 9.1 Rolling 6-Month Spend Trajectory with Spike Markers
To prevent isolated single-month dots, the backend `getDashboardStats` controller constructs a rolling 6-month corporate spend trajectory (May to October 2026):
- Real claims in MySQL are dynamically aggregated for the live audit period.
- Preceding months provide benchmark corporate spend data.
- **Visible Vertex Dots**: Every monthly vertex is marked with a circular SVG dot (`r: 4.5, fill: #4f46e5, stroke: #ffffff`).
- **Peak Spend Spike Marker**: The peak spending month (October ₹66,100) displays an enlarged marker (`r: 6`) surrounded by an animated concentric pulse halo (`animate-ping`).
- **Interactive Tooltip**: Hovering over any dot displays the month, spend in Rupees, volume of claims, and compliance tags (`Peak Spike`, `Live`, or `Prior`).

---

## 12. Human-in-the-Loop Governance, Risk Scoring & Monitoring

### 12.1 Managerial Governance Workflow (Human-in-the-Loop Architecture)
While RPA automates rule enforcement and fraud auditing, corporate fiduciary compliance (SOX compliance, statutory financial governance) strictly mandates that automated robots **never directly disburse corporate capital without human authorization**.
- When the UiPath bot processes clean claims with zero violations, it sets their status to **`Verified - Pending Approval`** (displayed as **"Pending Admin"** on the dashboard).
- In the **Review & Approvals** portal, finance managers review the bot's findings, inspect receipts in-modal, and make the final determination:
  - **`Approve`**: Commits the payout status to **`Approved`** (Ready for Payout).
  - **`Reject`**: Permanently declines unauthorized or non-compliant claims.
  - **`Request Correction`**: Sets status to **`Needs Correction`**, allowing the employee to re-upload missing receipts or adjust details without creating a new claim.

### 12.2 Deterministic Rule-Based Statistical Risk Scoring Engine
To triage claims for manager review, the backend incorporates a deterministic 0–100 statistical risk scorer (`riskScore.js`). The engine evaluates 6 weighted behavioral signals without machine learning heuristics:
1. **Amount-to-Policy Limit Ratio (0–35 points)**: Evaluates claim magnitude relative to category ceiling (e.g., claims > 150% of cap receive maximum weighting).
2. **Violation Severity Count (0–25 points)**: Accumulates 10 points per bot violation up to a 25-point threshold.
3. **7-Day Velocity Anomaly (0–15 points)**: Flags employees submitting more than 3 claims within a rolling 7-day window.
4. **Weekend Expense Anomaly (0–10 points)**: Identifies expenses incurred on Saturday or Sunday for non-travel categories.
5. **Round-Figure Pattern (0–5 points)**: Flags suspicious round-number amounts (e.g. ₹5,000, ₹10,000) lacking decimal receipt granularity.
6. **Duplicate Flag Penalty (0–20 points)**: Applies immediate penalty for repeated submission codes.

Risk scores are categorized into color-coded tiers:
- **Low (0–29)**: Standard expedited review (Green badge).
- **Medium (30–59)**: Standard managerial audit (Amber badge).
- **High (60–79)**: Priority inspection recommended (Orange badge).
- **Critical (80–100)**: Mandatory comprehensive audit (Rose badge).

### 12.3 AI Advisory Layer (Groq LLM Integration & Zero-PII Sanitization)
To accelerate decision-making for complex claims, finance managers can invoke an on-demand AI Advisory summary:
- **Model Architecture**: Connects via an OpenAI-compatible interface to **Groq Cloud** using `openai/gpt-oss-120b` (with automatic fallback to `llama-3.1-8b-instant`).
- **Zero-PII Privacy Protection**: The service strictly sanitizes all payloads prior to transmission. Employee names, email addresses, user IDs, and receipt file paths are completely stripped. Only anonymous claim codes, categories, amounts, dates, descriptions, bot violation lists, and policy limits are transmitted.
- **Database Caching**: Summaries and recommendations are cached in the `claim_ai_notes` table, ensuring zero redundant API calls upon subsequent viewings.
- **Offline Resilience**: If the internet or external API is unreachable, a built-in deterministic rule-based template generates structured advice locally without UI disruptions.

### 12.4 Real-Time Bot Monitoring & Execution Telemetry (`/monitoring`)
To provide visibility into RPA worker performance, every execution via UiPath Studio or the companion simulator logs telemetry into `bot_runs`:
- **Metrics Tracked**: Start time, finish time, measured execution duration (`duration_ms`), total claims evaluated, counts of verified, flagged, and rejected claims, execution source (`uipath` vs `simulator`), and status (`Success` vs `Failed`).
- **Telemetry UI**: Features 3-second live auto-refresh polling, KPI cards (Total Runs, Success Rate %, Average Duration, Pending Queue), stale-run alert banners, instant filter tabs (`All`, `Successful`, `Failed`), and error callouts displaying exact exception diagnostics (e.g., Windows `EBUSY` file-lock events).

### 12.5 Tamper-Proof Audit Logging
Every lifecycle event is recorded in `audit_log`:
```sql
INSERT INTO audit_log (claim_id, user_id, action, old_status, new_status, comments)
VALUES (?, ?, 'RPA_VERIFY', 'Submitted', 'Flagged', 'Bot detected violations: Exceeds category limit');
```
This historical log cannot be edited or deleted through the web application, guaranteeing statutory audit readiness.

---

## 13. Testing & Verification Test Matrix (16 Cases)

The application includes 16 pre-seeded test claims covering all edge cases:

| Claim Code | Employee | Category | Amount (₹) | Receipt | Test Scenario | Verified Outcome | Rule Triggered |
|---|---|---|---|---|---|---|---|
| `CLM-2026-001` | Rahul Sharma | Meals | ₹750.00 | Yes | Valid meal under limit | **Verified** | Passed all checks |
| `CLM-2026-002` | Rahul Sharma | Meals | ₹2,400.00 | Yes | Exceeds ₹1,000 cap | **Flagged** | Rule 3: Exceeds limit |
| `CLM-2026-003` | Priya Patel | Travel | ₹3,200.00 | No | Missing required receipt | **Flagged** | Rule 4: Receipt missing |
| `CLM-2026-004` | Priya Patel | Office Supplies | ₹1,200.00 | Yes | Future date (`2026-11-20`) | **Flagged** | Rule 5: Invalid date |
| `CLM-2026-005` | Amit Verma | *(NULL)* | ₹1,800.00 | Yes | Missing category | **Flagged** | Rule 2: Incomplete claim |
| `CLM-2026-006` | Rahul Sharma | Travel | ₹4,500.00 | Yes | First valid submission | **Verified** | Passed all checks |
| `CLM-2026-006` | Rahul Sharma | Travel | ₹4,500.00 | Yes | Duplicate claim code | **Rejected** | Rule 1: Duplicate submission |
| `CLM-2026-007` | Amit Verma | Meals | ₹3,500.00 | No | Multi-violation (Limit + Receipt + Date) | **Flagged** | Rules 3, 4, 5 (Concatenated) |
| `CLM-2026-008` | Priya Patel | Accommodation | ₹6,800.00 | Yes | Valid accommodation | **Verified** | Passed all checks |
| `CLM-2026-009` | Priya Patel | Accommodation | ₹11,500.00 | Yes | Exceeds ₹8,000 cap | **Flagged** | Rule 3: Exceeds limit |
| `CLM-2026-010` | Rahul Sharma | Client Entertainment | ₹2,750.00 | Yes | Valid entertainment | **Verified** | Passed all checks |
| `CLM-2026-011` | Priya Patel | Certifications | ₹14,500.00 | Yes | Valid certification | **Verified** | Passed all checks |
| `CLM-2026-012` | Amit Verma | Office Supplies | ₹950.00 | No | Missing receipt | **Flagged** | Rule 4: Receipt missing |
| `CLM-2026-013` | Rahul Sharma | Gym Membership | ₹2,500.00 | Yes | Unrecognized category | **Flagged** | Rule 2: Category not recognized |
| `CLM-2026-014` | Amit Verma | Meals | ₹1,000.00 | Yes | Exact boundary (₹1,000 == limit) | **Verified** | Passed all checks |
| `CLM-2026-015` | Rahul Sharma | Travel | ₹1,450.00 | Yes | Valid local travel | **Verified** | Passed all checks |

---

## 14. Performance Benchmarks & Empirical Timing Analysis

To provide realistic and verifiable metrics, processing performance is benchmarked across manual baseline estimates, the companion Node.js simulator, and full UiPath Studio workflow runs. Manual audit figures are designated as assumed baselines, while automated timings reflect real measured benchmark executions recorded by the system monitoring engine (`bot_runs`):

| Evaluation Dimension | Traditional Manual Audit (Assumed Baseline)* | Node.js Companion Simulator (Measured - Run #11) | UiPath Studio RPA Bot (Measured - Run #51)** | Measurement Source & Context |
|---|---|---|---|---|
| **Per-Claim Verification Speed** | ~8 – 14 minutes | **2.6 ms / claim** | **501.7 ms / claim** | Simulator: in-memory evaluation. UiPath: includes ClosedXML activity dispatch & disk I/O. |
| **Batch Verification (16 Benchmark Claims)** | ~2.5 – 3.7 hours | **42 ms** (`duration_ms: 42`) | **8,028 ms (8.03 s)** (`duration_ms: 8028`) | Measured & logged in `bot_runs.duration_ms` upon output workbook generation. |
| **Batch Verification (Scaled to 100 Claims)** | ~16 – 23 hours | ~260 ms | ~50.2 seconds | Extrapolated linear throughput for unconstrained Excel workbook batches. |
| **Duplicate Claim Detection** | Variable (~70–80% due to fatigue)* | **100% In-Batch Interception** | **100% In-Batch Interception** | Deterministic matching against `list_SeenClaimCodes` within the current batch. |
| **Audit Trail Completeness** | Fragmented / Inconsistent | **100% Automated Logging** | **100% Automated Logging** | Every transaction atomically committed to `audit_log` with before/after status. |
| **Reimbursement Cycle Latency** | 7 – 14 business days | **Under 24 hours** | **Under 24 hours** | Automated triage moves claims to Manager Review queue immediately. |

*\*Note: Manual audit figures represent an assumed operational baseline (to be formally validated by timing 20 manual checks with enterprise finance auditors).*  
*\*\*Note: Real UiPath Studio runs include process bootstrap, dynamic memory caching from the `Policies` sheet, ClosedXML table formatting, and physical disk I/O.*

---

## 15. Deployment & 1-Click Execution Guide

### 15.1 1-Click System Launcher (`start_project.bat`)
A Windows batch script starts all subsystems in parallel:
```bat
@echo off
start "Expense RPA Backend" cmd /k "npm --prefix backend start"
start "Expense RPA Frontend" cmd /k "npm --prefix frontend run dev"
timeout /t 4 /nobreak > nul
start http://localhost:5173/login
```

### 15.2 Database Initialization
```bash
mysql -u root -p < "database/schema.sql"
```

### 15.3 Bot Execution Methods
1. **1-Click Web Simulation**: Open `http://localhost:5173/verification-engine` and click **Run Bot (1-Click)**.
2. **UiPath Studio**: Open `rpa/UiPath_Workflow_Files/project.json` in UiPath Studio and press <kbd>Ctrl</kbd>+<kbd>F5</kbd>.
3. **CLI Simulator**: Run `node rpa/simulate_bot.js`.

---

## 16. Limitations, Future Scope & Conclusion

### 16.1 System Limitations & Technical Boundaries
To maintain rigorous academic and engineering honesty, the following operational boundaries of the current release are acknowledged:
1. **In-Batch Duplicate Detection**: The RPA bot's duplicate check evaluates claim codes exclusively within the active processing batch (`claims_input.xlsx`, which contains only pending `Submitted` claims). If an identical claim was processed in a prior historical batch, the bot does not query the MySQL database history directly due to workbook decoupling. Cross-batch database duplicate verification is an architectural enhancement for future iterations.
2. **Receipt Proof Presence vs. Content (No OCR)**: The system verifies receipt existence (validating that a receipt file was uploaded when `ReceiptRequired = TRUE`), but does not perform Optical Character Recognition (OCR) to parse line items, tax numbers, or merchant names from receipt PDFs or image attachments.
3. **Global Category Policy Limits**: Spending caps are configured globally per category (e.g., all Meals capped at ₹1,000) rather than dynamic multi-tier policies segmented by employee department, seniority, or geographical cost center.
4. **Historical Trend Baseline Data**: The 6-month historical spending trend chart on the Executive Dashboard incorporates baseline sample trajectory figures for historical months (May–September 2026) preceding the live deployment period.

### 16.2 Future Enhancements
- **Optical Character Recognition (OCR)**: Integrate **UiPath Document Understanding** or Google Cloud Vision API to extract merchant names, line items, and tax amounts directly from receipt images, verifying that the claimed amount matches the physical receipt.
- **Enterprise Orchestrator Integration**: Publish `Main.xaml` as a NuGet package (`.nupkg`) to **UiPath Orchestrator** for scheduled unattended execution on Azure/AWS virtual machines.
- **Cross-Batch Historical Duplicate Hashing**: Extend the input generator to export historical claim hashes from the past 90 days into an auxiliary sheet, enabling cross-batch historical duplicate detection within the decoupled robot workflow.
- **ERP Integration**: Add automated export plugins for SAP ERP and Oracle NetSuite to automatically trigger employee direct-deposit disbursements once claims reach `Approved` status.

### 16.3 Conclusion
The **Automated Expense Claim Verification System** demonstrates a successful, production-grade integration of modern full-stack web engineering with Robotic Process Automation. By decoupling web interactions from RPA worker logic via structured Excel workbooks and real-time auto-synchronization, the system achieves sub-second verification speed, eliminates fraudulent duplicate submissions, and upholds corporate governance through immutable audit trails and managerial oversight.
