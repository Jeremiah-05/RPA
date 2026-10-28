# UiPath Studio RPA Bot - Expense Claim Verification
### Production-Ready Windows Workflow for Automated Claim Auditing

[![UiPath Target](https://img.shields.io/badge/Target%20Framework-Windows%20(VB)-blue.svg)](#)
[![Workflow](https://img.shields.io/badge/Workflow-Main.xaml-success.svg)](#)
[![Dependencies](https://img.shields.io/badge/Dependencies-UiPath.Excel%20%7C%20UiPath.System-orange.svg)](#)

---

## 📌 Overview

This directory contains the ready-to-run **UiPath Studio** project responsible for the autonomous verification stage of the **Automated Expense Claim Verification System**. 

The bot operates autonomously as a decoupled worker:
1. **Reads** the exchange spreadsheet `rpa/input/claims_input.xlsx` generated dynamically by the web backend.
2. **Dynamically caches** category policy limits and receipt requirements into memory dictionaries from the `Policies` sheet (`Dictionary(Of String, Double)` and `Dictionary(Of String, Boolean)`).
3. **Iterates** through every claim in the `Claims` sheet and evaluates 5 strict audit rules.
4. **Appends** 5 audit columns (`Outcome`, `Violations`, `BotTimestamp`, `CheckedAmount`, `PolicyLimitApplied`).
5. **Writes** the verified results to `rpa/output/claims_verified.xlsx`, which is instantly ingested by the web application via the Chokidar file watcher.

---

## 📁 Directory Structure

```text
rpa/
├── UiPath_Workflow_Files/
│   ├── project.json             # UiPath Studio project descriptor & package dependencies
│   ├── project.uiproj           # Studio workspace metadata
│   ├── Main.xaml                # Fully validated executable workflow sequence
│   └── .local/                  # Local Studio cache and package restore logs
├── input/
│   └── claims_input.xlsx        # Excel export from MySQL (Claims & Policies sheets)
├── output/
│   └── claims_verified.xlsx     # Output Excel workbook written by the RPA Bot
├── simulate_bot.js              # Standalone Node.js offline simulator (1-Click Web Engine)
└── README.md                    # This technical documentation
```

---

## ⚙️ UiPath Project Configuration

- **Target Framework**: `Windows` (VisualBasic .NET 8 / CoreCLR)
- **Studio Compatibility**: UiPath Studio Community / Enterprise (v23.10+, v24.x, v26.x)
- **Execution Type**: `Workflow` (Unattended or Attended)
- **Main Workflow**: `UiPath_Workflow_Files/Main.xaml`

### Required Package Dependencies
Defined in `project.json` and restored automatically by UiPath Studio:
- **`UiPath.Excel.Activities`**: `>= 2.22.4`
- **`UiPath.System.Activities`**: `>= 23.10.6`

---

## 🛡️ Dual Fallback File Path Resolution

To ensure that the bot runs reliably regardless of whether UiPath Studio is launched from the desktop shortcut, project directory, or command line, `Main.xaml` implements dual-path fallback resolution:

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

## 🔄 Workflow Logic & Sequence Breakdown

The workflow in [Main.xaml](file:///e:/RPA%201/rpa/UiPath_Workflow_Files/Main.xaml) is structured as follows:

```text
[Main Sequence - Automated Expense Claim Verification Bot]
   │
   ├── [Log Message] "Started Expense Claim Verification Bot"
   │
   ├── [Read Range] "Claims" Sheet -> dt_Claims
   ├── [Read Range] "Policies" Sheet -> dt_Policies
   │
   ├── [For Each Row in dt_Policies]
   │     ├── Populate dict_PolicyLimits(Category) = MaxLimit
   │     └── Populate dict_ReceiptRequired(Category) = ReceiptRequired
   │
   ├── [Add Data Column x 5] to dt_Claims:
   │     ├── "Outcome" (String)
   │     ├── "Violations" (String)
   │     ├── "BotTimestamp" (String)
   │     ├── "CheckedAmount" (Double)
   │     └── "PolicyLimitApplied" (Double)
   │
   ├── [For Each Row in dt_Claims]
   │     │
   │     ├── Extract & Cast: str_ClaimCode, str_Category, dbl_Amount, str_ExpenseDate, str_ReceiptPath
   │     │
   │     ├── [RULE 1] If list_SeenClaimCodes.Contains(str_ClaimCode)
   │     │            Then -> Add "Duplicate submission", isDuplicate = True
   │     │            Else -> Record in list_SeenClaimCodes
   │     │
   │     ├── [RULE 2] If Category is blank
   │     │            Then -> Add "Incomplete claim"
   │     │            Else If Not in dict_PolicyLimits
   │     │                 Then -> Add "Category not recognized"
   │     │
   │     ├── [RULE 3] If Category exists in dict_PolicyLimits
   │     │            Then -> AppliedLimit = dict_PolicyLimits(Category)
   │     │                    If dbl_Amount > AppliedLimit
   │     │                    Then -> Add "Exceeds category limit"
   │     │
   │     ├── [RULE 4] If dict_ReceiptRequired(Category) == True AND ReceiptPath is blank
   │     │            Then -> Add "Receipt missing"
   │     │
   │     ├── [RULE 5] If ExpenseDate > DateTime.Today OR date invalid
   │     │            Then -> Add "Invalid date"
   │     │
   │     ├── Outcome Determination:
   │     │     If isDuplicate -> "Rejected"
   │     │     Else If list_Violations.Count > 0 -> "Flagged"
   │     │     Else -> "Verified - Pending Approval"
   │     │
   │     └── Assign Audit Columns (Outcome, Violations, BotTimestamp, CheckedAmount, PolicyLimitApplied)
   │
   ├── [Write Range] dt_Claims -> str_OutputFilePath ("Claims" sheet)
   └── [Log Message] "Verification completed successfully"
```

---

## 📋 Evaluated Verification Rules

| # | Rule Name | Condition Evaluated | Flagged Message | Outcome |
|---|---|---|---|---|
| **1** | **Duplicate Submission** | Claim code previously recorded in `list_SeenClaimCodes` | `"Duplicate submission"` | `Rejected` |
| **2** | **Category Validation** | Category is empty, null, or not in policy dictionary | `"Incomplete claim"` / `"Category not recognized"` | `Flagged` |
| **3** | **Budget Limit Enforcement** | Claim amount exceeds category cap (`Amount > MaxLimit`) | `"Exceeds category limit"` | `Flagged` |
| **4** | **Receipt Proof Mandate** | Category requires receipt (`True`) AND receipt path is empty | `"Receipt missing"` | `Flagged` |
| **5** | **Expense Date Validation** | Date is in the future (`Date > Today`) or unparseable | `"Invalid date"` | `Flagged` |
| **-** | **All Passed** | 0 violations recorded across all 5 checks | *(None)* | `Verified - Pending Approval` |

---

## 🚀 How to Execute the Bot

### Option 1: UiPath Studio Execution (<kbd>Ctrl</kbd> + <kbd>F5</kbd>)
1. Launch **UiPath Studio**.
2. Click **Open a Local Project** and navigate to:
   `e:\RPA 1\rpa\UiPath_Workflow_Files\project.json`
3. Ensure `Main.xaml` is displayed in the central designer canvas.
4. Press <kbd>Ctrl</kbd> + <kbd>F5</kbd> (or click **Run File** in the top ribbon).
5. Output is saved to `rpa/output/claims_verified.xlsx`. The Chokidar background file watcher automatically commits the results to MySQL.

### Option 2: 1-Click Web Execution (Web Portal)
1. In the web portal, navigate to **Verification Engine** (`http://localhost:5173/verification-engine`).
2. Click **Run Bot (1-Click)**.
3. The backend automatically syncs MySQL claims, executes the verification logic, and updates claim statuses in real time.

### Option 3: Offline Node.js CLI Simulator
To run the verification engine directly via terminal:
```bash
node rpa/simulate_bot.js
```

---

## 🛠️ Resolved Technical Issues & Gotchas

1. **Unexpected `PROPERTYELEMENT` in XAML Parser**:
   - *Cause*: Attached properties placed directly inside `<Activity>` tags.
   - *Resolution*: Moved attached properties into attributes on the root `<Activity>` and properly declared `xmlns:mva`.
2. **`Collection(String)` Namespace Conflict**:
   - *Cause*: System.Activities XAML parser attempted to load `Collection(String)` from `System.Private.CoreLib` instead of `mscorlib`.
   - *Resolution*: Mapped `xmlns:sco` to `clr-namespace:System.Collections.ObjectModel;assembly=mscorlib`.
3. **ClosedXML Worksheet Namespace Bug**:
   - *Cause*: UiPath ClosedXML output produced `<x:worksheet>` namespace prefixes that crashed ExcelJS.
   - *Resolution*: Replaced ExcelJS reader in `excelParser.js` with SheetJS (`xlsx`), which parses all OpenXML variants seamlessly.
4. **`ReadRange.Range` Missing `<InArgument>` Wrapper**:
   - *Cause*: `Range` property had `<Literal x:TypeArguments="x:String" Value="" />` declared directly inside `<ui:ReadRange.Range>` without Windows Workflow Foundation's mandatory `<InArgument>` wrapper. Studio reported compile error: `Set property 'UiPath.Excel.Activities.ReadRange.Range' threw an exception. Object of type Literal cannot be converted to InArgument`.
   - *Resolution*: Wrapped the literal inside `<InArgument x:TypeArguments="x:String"><Literal x:TypeArguments="x:String" Value="" /></InArgument>`, restoring clean Studio builds.
5. **Windows File Lock (`EBUSY`) on Excel Output Write**:
   - *Cause*: The Chokidar file watcher detected the initial file creation event while Excel was still flushing its write handle, causing a momentary `EBUSY: resource busy or locked` exception.
   - *Resolution*: Configured `awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 }` in `fileWatcher.js`, wrapped parsing in a retry scope, and safely logged failed attempts into `bot_runs` telemetry without crashing the server.

---

## 📊 Telemetry & Bot Monitoring Integration

Whenever the UiPath bot executes:
- **Chokidar File Watcher** detects `claims_verified.xlsx` upon completion.
- **`bot_runs` Table**: Logs `run_source = 'uipath'`, measured duration in milliseconds, counts (`processed`, `verified`, `flagged`, `rejected`), status (`Success` or `Failed`), and exact error diagnostics.
- **Bot Monitoring UI (`/monitoring`)**: Automatically auto-refreshes every 3 seconds to surface the newest UiPath execution metrics to finance executives.
