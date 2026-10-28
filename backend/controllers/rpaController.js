// backend/controllers/rpaController.js
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { generateClaimsInputExcel } = require('../utils/excelGenerator');
const { parseVerifiedClaimsExcel } = require('../utils/excelParser');

// Resolve file paths relative to backend root or environment variables
const inputPath = process.env.RPA_INPUT_PATH || '../rpa/input/claims_input.xlsx';
const outputPath = process.env.RPA_OUTPUT_PATH || '../rpa/output/claims_verified.xlsx';

const resolvedInputFile = path.resolve(__dirname, '..', inputPath);
const resolvedOutputFile = path.resolve(__dirname, '..', outputPath);

/**
 * Core function to synchronize MySQL claims into claims_input.xlsx for UiPath
 * @param {boolean} includeAllIfNoPending If true and 0 claims are Submitted, exports all claims for re-testing
 */
async function syncClaimsInputExcel(includeAllIfNoPending = false) {
  let [claims] = await pool.query(`
    SELECT 
      c.id,
      c.claim_code,
      u.name AS employee_name,
      u.department,
      c.category,
      c.amount,
      c.expense_date,
      c.description,
      c.receipt_path,
      c.status
    FROM claims c
    INNER JOIN users u ON c.user_id = u.id
    WHERE c.status = 'Submitted'
    ORDER BY c.id ASC
  `);

  if (claims.length === 0 && includeAllIfNoPending) {
    [claims] = await pool.query(`
      SELECT 
        c.id,
        c.claim_code,
        u.name AS employee_name,
        u.department,
        c.category,
        c.amount,
        c.expense_date,
        c.description,
        c.receipt_path,
        c.status
      FROM claims c
      INNER JOIN users u ON c.user_id = u.id
      ORDER BY c.id ASC
    `);
  }

  const [policies] = await pool.query(`
    SELECT category, max_limit, receipt_required, is_active
    FROM policies
    WHERE is_active = TRUE
    ORDER BY id ASC
  `);

  if (claims.length > 0) {
    await generateClaimsInputExcel(claims, policies, resolvedInputFile);
  }

  return { claimsCount: claims.length, policiesCount: policies.length };
}

/**
 * Export pending 'Submitted' claims and active policies to claims_input.xlsx
 * POST /api/rpa/export
 */
async function exportClaimsToBot(req, res) {
  try {
    const forceAll = req.body?.forceAll === true || req.query?.all === 'true';
    let result = await syncClaimsInputExcel(forceAll);

    // If 0 'Submitted' claims exist and forceAll was false, automatically export all claims for re-testing
    if (result.claimsCount === 0 && !forceAll) {
      result = await syncClaimsInputExcel(true);
    }

    if (result.claimsCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No claims found in database to export. Please submit claims or click "Reset Demo Batch".',
        count: 0
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized and exported ${result.claimsCount} claims and ${result.policiesCount} policies to Excel for UiPath bot.`,
      exportPath: resolvedInputFile,
      claimsCount: result.claimsCount,
      policiesCount: result.policiesCount
    });
  } catch (error) {
    console.error('[RPA Export Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate RPA input Excel file.',
      error: error.message
    });
  }
}

/**
 * Helper to log bot execution telemetry into bot_runs
 * Wrapped in try/catch to ensure monitoring failure never disrupts ingestion
 */
async function recordBotRun({
  runSource = 'simulator',
  startedAt,
  finishedAt,
  durationMs = 0,
  claimsProcessed = 0,
  verifiedCount = 0,
  flaggedCount = 0,
  rejectedCount = 0,
  status = 'Success',
  errorMessage = null
}) {
  try {
    const startStr = startedAt instanceof Date
      ? startedAt.toISOString().replace('T', ' ').substring(0, 19)
      : (startedAt || new Date().toISOString().replace('T', ' ').substring(0, 19));
    const finishStr = finishedAt instanceof Date
      ? finishedAt.toISOString().replace('T', ' ').substring(0, 19)
      : (finishedAt || new Date().toISOString().replace('T', ' ').substring(0, 19));

    await pool.query(
      `INSERT INTO bot_runs 
       (run_source, started_at, finished_at, duration_ms, claims_processed, verified_count, flagged_count, rejected_count, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runSource,
        startStr,
        finishStr,
        Math.max(0, Math.round(durationMs)),
        claimsProcessed,
        verifiedCount,
        flaggedCount,
        rejectedCount,
        status,
        errorMessage
      ]
    );
  } catch (err) {
    console.error('[Monitoring Telemetry Warning] Failed to log bot run:', err.message);
  }
}

/**
 * Core reusable function to import UiPath verification results
 * Can be called by REST endpoint or background file watcher
 * @param {number|null} actorUserId User initiating the action
 * @param {'uipath'|'simulator'} runSource Origin of the run
 * @param {number} durationMs Optional measured execution time
 * @param {Date|null} customStartTime Optional start timestamp
 */
async function processRpaResultsImport(actorUserId = null, runSource = 'uipath', durationMs = 0, customStartTime = null) {
  const startedAt = customStartTime || new Date();

  if (!fs.existsSync(resolvedOutputFile)) {
    const err = new Error(`UiPath output file does not exist at: ${resolvedOutputFile}`);
    await recordBotRun({
      runSource,
      startedAt,
      finishedAt: new Date(),
      durationMs: durationMs || 0,
      status: 'Failed',
      errorMessage: err.message
    });
    throw err;
  }

  // Parse Excel file
  let parsedRecords = [];
  try {
    parsedRecords = await parseVerifiedClaimsExcel(resolvedOutputFile);
  } catch (parseErr) {
    await recordBotRun({
      runSource,
      startedAt,
      finishedAt: new Date(),
      durationMs: durationMs || 0,
      status: 'Failed',
      errorMessage: `Excel parsing error: ${parseErr.message}`
    });
    throw parseErr;
  }

  if (parsedRecords.length === 0) {
    await recordBotRun({
      runSource,
      startedAt,
      finishedAt: new Date(),
      durationMs: durationMs || 0,
      claimsProcessed: 0,
      verifiedCount: 0,
      flaggedCount: 0,
      rejectedCount: 0,
      status: 'Success',
      errorMessage: 'Output file contained 0 claim rows'
    });
    return { processed: 0, verified: 0, flagged: 0, rejected: 0 };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let verifiedCount = 0;
    let flaggedCount = 0;
    let rejectedCount = 0;

    for (const record of parsedRecords) {
      // 1. Retrieve current claim status
      const [claimRows] = await connection.query(
        'SELECT id, status, amount FROM claims WHERE id = ? FOR UPDATE',
        [record.claimId]
      );

      if (claimRows.length === 0) {
        console.warn(`[RPA Import] Claim ID ${record.claimId} not found in database. Skipping.`);
        continue;
      }

      const currentClaim = claimRows[0];
      const oldStatus = currentClaim.status;
      const newStatus = record.outcome;

      // 2. Update claim status
      await connection.query(
        'UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, record.claimId]
      );

      // 3. Insert into verification_results
      await connection.query(
        `INSERT INTO verification_results 
         (claim_id, bot_run_timestamp, outcome, violations, checked_amount, policy_limit_applied, execution_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.claimId,
          (record.botRunTimestamp instanceof Date ? record.botRunTimestamp.toISOString().replace('T', ' ').substring(0, 19) : record.botRunTimestamp) || new Date().toISOString().replace('T', ' ').substring(0, 19),
          newStatus,
          record.violations,
          record.checkedAmount || currentClaim.amount,
          record.policyLimitApplied,
          `Processed automatically via ${runSource === 'simulator' ? 'companion simulator' : 'UiPath Studio'} verification workflow`
        ]
      );

      // 4. Create immutable audit log entry
      const auditComments = record.violations
        ? `Bot detected violations: ${record.violations}`
        : 'Bot verified all policies successfully. No violations found.';

      await connection.query(
        `INSERT INTO audit_log (claim_id, user_id, action, old_status, new_status, comments)
         VALUES (?, ?, 'RPA_VERIFY', ?, ?, ?)`,
        [record.claimId, actorUserId, oldStatus, newStatus, auditComments]
      );

      if (newStatus === 'Verified - Pending Approval') verifiedCount++;
      else if (newStatus === 'Rejected') rejectedCount++;
      else flaggedCount++;
    }

    await connection.commit();

    // Calculate execution duration
    const finishedAt = new Date();
    let calculatedDuration = durationMs;
    if (!calculatedDuration || calculatedDuration <= 0) {
      try {
        if (fs.existsSync(resolvedInputFile) && fs.existsSync(resolvedOutputFile)) {
          const inStat = fs.statSync(resolvedInputFile);
          const outStat = fs.statSync(resolvedOutputFile);
          const diff = outStat.mtimeMs - inStat.mtimeMs;
          if (diff > 0 && diff < 600000) {
            calculatedDuration = diff;
          }
        }
      } catch (e) {}
      if (!calculatedDuration || calculatedDuration <= 0) {
        calculatedDuration = finishedAt.getTime() - startedAt.getTime();
      }
    }

    // Telemetry log to bot_runs
    await recordBotRun({
      runSource,
      startedAt,
      finishedAt,
      durationMs: calculatedDuration,
      claimsProcessed: parsedRecords.length,
      verifiedCount,
      flaggedCount,
      rejectedCount,
      status: 'Success',
      errorMessage: null
    });

    return {
      processed: parsedRecords.length,
      verified: verifiedCount,
      flagged: flaggedCount,
      rejected: rejectedCount,
      durationMs: calculatedDuration
    };
  } catch (error) {
    await connection.rollback();

    await recordBotRun({
      runSource,
      startedAt,
      finishedAt: new Date(),
      durationMs: durationMs || (Date.now() - startedAt.getTime()),
      claimsProcessed: 0,
      verifiedCount: 0,
      flaggedCount: 0,
      rejectedCount: 0,
      status: 'Failed',
      errorMessage: error.message
    });

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * REST Endpoint: Import bot verification results from claims_verified.xlsx
 * POST /api/rpa/import
 */
async function importBotResults(req, res) {
  try {
    if (!fs.existsSync(resolvedOutputFile)) {
      return res.status(400).json({
        success: false,
        message: 'UiPath output file (claims_verified.xlsx) does not exist yet. Please run Step 2 (Run Bot 1-Click) or UiPath Studio (Ctrl+F5) first.'
      });
    }

    const actorId = req.user ? req.user.id : null;
    const summary = await processRpaResultsImport(actorId);

    return res.status(200).json({
      success: true,
      message: `Successfully imported verification results for ${summary.processed} claims.`,
      summary
    });
  } catch (error) {
    console.error('[RPA Import Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import RPA verification results.',
      error: error.message
    });
  }
}

/**
 * Check RPA file states, last modified times, and pending queue size
 * GET /api/rpa/status
 */
async function getRpaStatus(req, res) {
  try {
    let inputStats = { exists: false, lastModified: null, sizeBytes: 0, path: resolvedInputFile };
    let outputStats = { exists: false, lastModified: null, sizeBytes: 0, path: resolvedOutputFile };

    if (fs.existsSync(resolvedInputFile)) {
      const stat = fs.statSync(resolvedInputFile);
      inputStats = {
        exists: true,
        lastModified: stat.mtime,
        sizeBytes: stat.size,
        path: resolvedInputFile
      };
    }

    if (fs.existsSync(resolvedOutputFile)) {
      const stat = fs.statSync(resolvedOutputFile);
      outputStats = {
        exists: true,
        lastModified: stat.mtime,
        sizeBytes: stat.size,
        path: resolvedOutputFile
      };
    }

    // Pending submission count
    const [pendingCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM claims WHERE status = 'Submitted'"
    );

    // Latest verification run
    const [lastVerification] = await pool.query(
      'SELECT bot_run_timestamp, outcome, violations FROM verification_results ORDER BY id DESC LIMIT 1'
    );

    return res.status(200).json({
      success: true,
      pendingClaims: pendingCount[0].count,
      inputFile: inputStats,
      outputFile: outputStats,
      lastVerificationRun: lastVerification.length > 0 ? lastVerification[0] : null
    });
  } catch (error) {
    console.error('[RPA Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve RPA engine status.',
      error: error.message
    });
  }
}

/**
 * 1-Click Bot Simulator Execution from Web App
 * Automatically syncs newest claims from MySQL to Excel, executes rules, and ingests results
 * POST /api/rpa/simulate
 */
async function triggerBotSimulation(req, res) {
  try {
    // 1. DYNAMIC STEP: First auto-sync latest MySQL claims into claims_input.xlsx
    // If 0 'Submitted' claims exist, export all claims so the simulation can re-verify
    const syncRes = await syncClaimsInputExcel(true);

    if (syncRes.claimsCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No claims found in database to verify. Please submit claims or use "Reset Claims" to reload the demo batch.'
      });
    }

    // 2. Execute Bot Verification rules (Rules 1-5)
    const simStartTime = new Date();
    const { runBotSimulation } = require('../../rpa/simulate_bot');
    await runBotSimulation();
    const simDuration = Date.now() - simStartTime.getTime();
    
    // 3. Auto-import verified results into MySQL
    const actorId = req.user ? req.user.id : null;
    const importSummary = await processRpaResultsImport(actorId, 'simulator', simDuration, simStartTime);

    return res.status(200).json({
      success: true,
      message: `RPA Bot verified ${importSummary.processed} claims dynamically (${importSummary.verified} Verified, ${importSummary.flagged} Flagged, ${importSummary.rejected} Rejected).`,
      summary: importSummary,
      syncedClaims: syncRes.claimsCount
    });
  } catch (error) {
    console.error('[RPA Simulation Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute bot simulation.',
      error: error.message
    });
  }
}

/**
 * Reset all claims back to 'Submitted' status for clean RPA re-testing
 * POST /api/rpa/reset-batch
 */
async function resetClaimsBatch(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Remove previous verification results
    await connection.query("DELETE FROM verification_results");

    // 2. Remove previous audit logs and claims so IDs and attributes are freshly restored
    await connection.query("DELETE FROM audit_log");
    await connection.query("DELETE FROM claims");

    // 3. Restore the 16 canonical seed claims to their exact baseline test state and 'Submitted' status
    const canonicalClaims = [
      [1, 'CLM-2026-001', 2, 'Meals', 750.00, '2026-10-22', 'Client lunch meeting at Olive Bistro', 'uploads/receipts/sample_receipt_01.pdf', 'Submitted'],
      [2, 'CLM-2026-002', 2, 'Meals', 2400.00, '2026-10-23', 'Dinner with regional sales team at The Grand', 'uploads/receipts/sample_receipt_02.pdf', 'Submitted'],
      [3, 'CLM-2026-003', 3, 'Travel', 3200.00, '2026-10-21', 'Airport cab charges to client office', null, 'Submitted'],
      [4, 'CLM-2026-004', 3, 'Office Supplies', 1200.00, '2026-11-20', 'Wireless keyboard and mouse combo', 'uploads/receipts/sample_receipt_04.pdf', 'Submitted'],
      [5, 'CLM-2026-005', 4, null, 1800.00, '2026-10-24', 'Printer ink cartridges and photo paper', 'uploads/receipts/sample_receipt_05.pdf', 'Submitted'],
      [6, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted'],
      [7, 'CLM-2026-006', 2, 'Travel', 4500.00, '2026-10-18', 'Train tickets for Delhi client deployment (re-sent)', 'uploads/receipts/sample_receipt_06.pdf', 'Submitted'],
      [8, 'CLM-2026-007', 4, 'Meals', 3500.00, '2026-12-05', 'Annual team celebration dinner', null, 'Submitted'],
      [9, 'CLM-2026-008', 3, 'Accommodation', 6800.00, '2026-10-15', '2 nights stay at Lemon Tree Premier for tech conference', 'uploads/receipts/sample_receipt_08.pdf', 'Submitted'],
      [10, 'CLM-2026-009', 3, 'Accommodation', 11500.00, '2026-10-19', 'Luxury suite hotel stay during offsite', 'uploads/receipts/sample_receipt_09.pdf', 'Submitted'],
      [11, 'CLM-2026-010', 2, 'Client Entertainment', 2750.00, '2026-10-20', 'Coffee and snacks with prospective vendor partners', 'uploads/receipts/sample_receipt_10.pdf', 'Submitted'],
      [12, 'CLM-2026-011', 3, 'Certifications', 14500.00, '2026-10-14', 'AWS Certified Solutions Architect exam fee', 'uploads/receipts/sample_receipt_11.pdf', 'Submitted'],
      [13, 'CLM-2026-012', 4, 'Office Supplies', 950.00, '2026-10-25', 'Whiteboard markers and sticky notes for brainstorming', null, 'Submitted'],
      [14, 'CLM-2026-013', 2, 'Gym Membership', 2500.00, '2026-10-22', 'Monthly fitness center wellness reimbursement', 'uploads/receipts/sample_receipt_14.pdf', 'Submitted'],
      [15, 'CLM-2026-014', 4, 'Meals', 1000.00, '2026-10-24', 'Project delivery team dinner at Barbeque Nation', 'uploads/receipts/sample_receipt_15.pdf', 'Submitted'],
      [16, 'CLM-2026-015', 2, 'Travel', 1450.00, '2026-10-26', 'Uber rides for client product presentation', 'uploads/receipts/sample_receipt_16.pdf', 'Submitted']
    ];

    for (const c of canonicalClaims) {
      await connection.query(
        `INSERT INTO claims (id, claim_code, user_id, category, amount, expense_date, description, receipt_path, status, admin_comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        c
      );
    }

    // 4. Add audit log
    const actorId = req.user ? req.user.id : 1;
    for (let id = 1; id <= 16; id++) {
      await connection.query(
        "INSERT INTO audit_log (claim_id, user_id, action, old_status, new_status, comments) VALUES (?, ?, 'SYSTEM_RESET', NULL, 'Submitted', 'Claims reset to canonical benchmark batch for RPA verification cycle')",
        [id, actorId]
      );
    }

    await connection.commit();

    // 5. Remove any stale verified output file so the system is cleanly awaiting a new run
    try {
      if (fs.existsSync(resolvedOutputFile)) {
        fs.unlinkSync(resolvedOutputFile);
        console.log('[Reset] Removed previous claims_verified.xlsx to prepare fresh bot execution.');
      }
    } catch (e) {
      console.warn('[Reset] Could not unlink previous output file:', e.message);
    }

    // 6. Auto-sync the 16 reset claims to claims_input.xlsx immediately
    const syncResult = await syncClaimsInputExcel(true);

    return res.status(200).json({
      success: true,
      message: `Reset complete! All ${syncResult.claimsCount} claims have been restored to 'Submitted' status. claims_input.xlsx has been refreshed and old output cleared.`,
      count: syncResult.claimsCount
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Reset Claims Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset claims for RPA verification.',
      error: error.message
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  syncClaimsInputExcel,
  exportClaimsToBot,
  importBotResults,
  processRpaResultsImport,
  getRpaStatus,
  triggerBotSimulation,
  resetClaimsBatch
};
