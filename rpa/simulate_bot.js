// rpa/simulate_bot.js
/**
 * Companion Bot Simulator
 * Implements the EXACT same logic as UiPath Studio's Main.xaml.
 * Features:
 * - Robust exception handling (Try-Catch-Finally)
 * - File retry scopes (3 attempts, 2-second interval) for Read/Write file locks
 * - Strict pre-validation of input file, sheets, and mandatory columns
 * - Per-row exception safety: Malformed rows are flagged as "Invalid data" without failing the batch
 */

const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');
const { inspectReceiptCategory } = require('../backend/utils/receiptVerifier');

/**
 * Reusable Retry Scope: executes an operation up to maxRetries times
 * with intervalMs delay between attempts to handle temporary file locks.
 */
async function retryScope(operation, maxRetries = 3, intervalMs = 2000, operationName = 'File Operation') {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      console.warn(`[UiPath Bot RetryScope] Attempt ${attempt}/${maxRetries} failed for ${operationName}: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, intervalMs));
      }
    }
  }
  throw new Error(`[UiPath Bot RetryScope] Exceeded ${maxRetries} retries for ${operationName}. Last error: ${lastError?.message}`);
}

async function runBotSimulation() {
  const inputFile = path.resolve(__dirname, 'input', 'claims_input.xlsx');
  const outputFile = path.resolve(__dirname, 'output', 'claims_verified.xlsx');
  const verifiedRows = [];

  console.log('===============================================================');
  console.log(' [UiPath Bot Simulator] Starting Verification Process');
  console.log(' Input:', inputFile);
  console.log(' Output:', outputFile);
  console.log('===============================================================');

  try {
    // --------------------------------------------------------------------------
    // Pre-flight Validation: Verify input file existence
    // --------------------------------------------------------------------------
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found at: ${inputFile}. Please export claims first.`);
    }

    // --------------------------------------------------------------------------
    // Retry Scope 1: Read Range on Input Excel Workbook
    // --------------------------------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    await retryScope(
      () => workbook.xlsx.readFile(inputFile),
      3,
      2000,
      'Read Range (Input Excel)'
    );

    // Pre-flight Validation: Verify required sheets
    const claimsSheet = workbook.getWorksheet('Claims');
    const policiesSheet = workbook.getWorksheet('Policies');

    if (!claimsSheet) {
      throw new Error('Input validation failed: Required sheet "Claims" not found in input Excel file.');
    }
    if (!policiesSheet) {
      throw new Error('Input validation failed: Required sheet "Policies" not found in input Excel file.');
    }

    // Pre-flight Validation: Verify mandatory column headers
    const claimsHeaderMap = {};
    claimsSheet.getRow(1).eachCell((cell, colNumber) => {
      const val = cell.value ? cell.value.toString().trim().replace(/[\s_]/g, '').toLowerCase() : '';
      claimsHeaderMap[val] = colNumber;
    });

    const requiredClaimsCols = ['claimid', 'claimcode', 'category', 'amount', 'expensedate'];
    const missingClaimsCols = requiredClaimsCols.filter(col => !claimsHeaderMap[col]);
    if (missingClaimsCols.length > 0) {
      throw new Error(`Input validation failed: Missing required columns in "Claims" sheet: ${missingClaimsCols.join(', ')}`);
    }

    // --------------------------------------------------------------------------
    // 1. Read Policies into Memory Dictionaries
    // --------------------------------------------------------------------------
    const policyLimits = {};
    const receiptRequired = {};

    policiesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cat = row.getCell(1).value ? row.getCell(1).value.toString().trim() : '';
      const limit = parseFloat(row.getCell(2).value) || 0;
      const req = row.getCell(3).value ? row.getCell(3).value.toString().trim().toUpperCase() === 'TRUE' : true;
      if (cat) {
        policyLimits[cat] = limit;
        receiptRequired[cat] = req;
      }
    });

    console.log(`[UiPath Bot] Cached ${Object.keys(policyLimits).length} policy rules:`, policyLimits);

    // --------------------------------------------------------------------------
    // 2. Process Claims with Per-Row Safety
    // --------------------------------------------------------------------------
    const seenClaimCodes = new Set();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rowsToProcess = [];
    claimsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rowsToProcess.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rowsToProcess) {
      // Per-Row Safety Try-Catch: Prevents one bad row from terminating the entire batch
      try {
        const claimId = row.getCell(claimsHeaderMap['claimid']).value;
        if (!claimId) continue; // Skip blank rows

        const claimCode = row.getCell(claimsHeaderMap['claimcode']).value?.toString().trim() || '';
        const employeeName = row.getCell(claimsHeaderMap['employeename'] || 3).value?.toString().trim() || 'N/A';
        const department = row.getCell(claimsHeaderMap['department'] || 4).value?.toString().trim() || 'N/A';
        const category = row.getCell(claimsHeaderMap['category']).value?.toString().trim() || '';
        const rawAmount = row.getCell(claimsHeaderMap['amount']).value;
        const amount = parseFloat(rawAmount);

        // Check for non-numeric or corrupt amount
        if (isNaN(amount)) {
          throw new Error(`Corrupt amount format: "${rawAmount}" is not a valid number`);
        }

        const expenseDateRaw = row.getCell(claimsHeaderMap['expensedate']).value;
        const description = row.getCell(claimsHeaderMap['description'] || 8).value?.toString().trim() || '';
        const receiptPath = row.getCell(claimsHeaderMap['receiptpath'] || 9).value?.toString().trim() || '';

        const violations = [];
        let isDuplicate = false;
        let exceedsLimit = false;
        let isCategoryMismatch = false;

        // Check for non-positive amount
        if (amount <= 0) {
          violations.push('Invalid amount');
        }

        // Rule 1: Duplicate check (In-batch)
        if (seenClaimCodes.has(claimCode)) {
          violations.push('Duplicate submission');
          isDuplicate = true;
        } else {
          seenClaimCodes.add(claimCode);
        }

        // Rule 2: Missing Category check
        if (!category) {
          violations.push('Incomplete claim');
        } else if (policyLimits[category] === undefined) {
          violations.push('Category not recognized');
        }

        // Rule 3: Category Limit check (Critical policy rule: over-limit claims rejected)
        let appliedLimit = null;
        if (category && policyLimits[category] !== undefined) {
          appliedLimit = policyLimits[category];
          if (amount > appliedLimit) {
            violations.push('Exceeds category limit');
            exceedsLimit = true;
          }
        }

        // Rule 4: Missing receipt check
        if (category && receiptRequired[category] === true && !receiptPath) {
          violations.push('Receipt missing');
        }

        // Rule 4b: Category Mismatch Check against Uploaded Receipt Proof
        if (category && receiptPath) {
          try {
            const receiptCheck = await inspectReceiptCategory(receiptPath, category);
            if (receiptCheck.hasMismatch) {
              violations.push(receiptCheck.violation);
              isCategoryMismatch = true;
            }
          } catch (rErr) {
            console.warn(`[UiPath Bot] Receipt inspection notice for row ${rowNumber}:`, rErr.message);
          }
        }

        // Rule 5: Expense Date check
        let expenseDate = null;
        if (expenseDateRaw) {
          expenseDate = new Date(expenseDateRaw);
          if (isNaN(expenseDate.getTime())) {
            violations.push('Invalid date');
          } else {
            const checkDate = new Date(expenseDate);
            checkDate.setHours(0, 0, 0, 0);
            if (checkDate > today) {
              violations.push('Invalid date');
            }
          }
        } else {
          violations.push('Invalid date');
        }

        // Outcome determination:
        // Duplicate submissions, category limit breaches, and receipt category mismatches are REJECTED
        let outcome = 'Verified - Pending Approval';
        if (isDuplicate || exceedsLimit || isCategoryMismatch) {
          outcome = 'Rejected';
        } else if (violations.length > 0) {
          outcome = 'Flagged';
        }

        const formattedDate = expenseDate && !isNaN(expenseDate.getTime())
          ? expenseDate.toISOString().split('T')[0]
          : '';

        verifiedRows.push({
          ClaimID: claimId,
          ClaimCode: claimCode,
          EmployeeName: employeeName,
          Department: department,
          Category: category,
          Amount: amount,
          ExpenseDate: formattedDate,
          Description: description,
          ReceiptPath: receiptPath,
          Outcome: outcome,
          Violations: violations.join('; '),
          BotTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          CheckedAmount: amount,
          PolicyLimitApplied: appliedLimit
        });
      } catch (rowError) {
        console.warn(`[UiPath Bot Warning] Row ${rowNumber} failed verification: ${rowError.message}. Flagging as Invalid data.`);
        verifiedRows.push({
          ClaimID: row.getCell(1).value || `ERR-${rowNumber}`,
          ClaimCode: row.getCell(2).value?.toString().trim() || `UNKNOWN-${rowNumber}`,
          EmployeeName: 'Data Error',
          Department: 'N/A',
          Category: 'Invalid',
          Amount: 0,
          ExpenseDate: '',
          Description: 'Malformed record',
          ReceiptPath: '',
          Outcome: 'Flagged',
          Violations: `Invalid data: ${rowError.message}`,
          BotTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          CheckedAmount: 0,
          PolicyLimitApplied: null
        });
      }
    }

    // --------------------------------------------------------------------------
    // 3. Write Output Workbook with Retry Scope
    // --------------------------------------------------------------------------
    const outWb = new ExcelJS.Workbook();
    const outWs = outWb.addWorksheet('Claims');

    outWs.columns = [
      { header: 'ClaimID', key: 'ClaimID', width: 12 },
      { header: 'ClaimCode', key: 'ClaimCode', width: 18 },
      { header: 'EmployeeName', key: 'EmployeeName', width: 20 },
      { header: 'Department', key: 'Department', width: 18 },
      { header: 'Category', key: 'Category', width: 20 },
      { header: 'Amount', key: 'Amount', width: 14 },
      { header: 'ExpenseDate', key: 'ExpenseDate', width: 14 },
      { header: 'Description', key: 'Description', width: 30 },
      { header: 'ReceiptPath', key: 'ReceiptPath', width: 30 },
      { header: 'Outcome', key: 'Outcome', width: 24 },
      { header: 'Violations', key: 'Violations', width: 40 },
      { header: 'BotTimestamp', key: 'BotTimestamp', width: 22 },
      { header: 'CheckedAmount', key: 'CheckedAmount', width: 16 },
      { header: 'PolicyLimitApplied', key: 'PolicyLimitApplied', width: 18 }
    ];

    // Header styling
    outWs.getRow(1).height = 25;
    outWs.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    verifiedRows.forEach(item => {
      const row = outWs.addRow(item);
      row.getCell('Amount').numFmt = '₹#,##0.00';
      if (item.PolicyLimitApplied) {
        row.getCell('PolicyLimitApplied').numFmt = '₹#,##0.00';
      }
    });

    const targetDir = path.dirname(outputFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await retryScope(
      () => outWb.xlsx.writeFile(outputFile),
      3,
      2000,
      'Write Range (Verified Claims)'
    );

    console.log(`[UiPath Bot Simulator] Successfully processed ${verifiedRows.length} claims.`);
    console.log(`[UiPath Bot Simulator] Results saved to: ${outputFile}`);
    return { processed: verifiedRows.length, outputFile };
  } catch (fatalError) {
    console.error(`[UiPath Bot Fatal Error] Failed during verification: ${fatalError.message}`);
    throw fatalError;
  } finally {
    console.log(`[UiPath Bot] Bot finished. Total rows processed: ${verifiedRows.length}`);
  }
}

if (require.main === module) {
  runBotSimulation().catch(console.error);
}

module.exports = { runBotSimulation };
