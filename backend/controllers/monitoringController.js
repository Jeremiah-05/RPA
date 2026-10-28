// backend/controllers/monitoringController.js
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const inputPath = process.env.RPA_INPUT_PATH || '../rpa/input/claims_input.xlsx';
const outputPath = process.env.RPA_OUTPUT_PATH || '../rpa/output/claims_verified.xlsx';
const resolvedInputFile = path.resolve(__dirname, '..', inputPath);
const resolvedOutputFile = path.resolve(__dirname, '..', outputPath);

/**
 * GET /api/monitoring/summary
 * Returns KPI aggregates, last run telemetry, pending queue size, and stale run alerts
 */
async function getMonitoringSummary(req, res) {
  try {
    // 1. Total runs and success count
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) AS total_runs,
        SUM(CASE WHEN status = 'Success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) AS failed_runs,
        AVG(CASE WHEN status = 'Success' THEN duration_ms ELSE NULL END) AS avg_duration_ms
      FROM bot_runs
    `);

    const totalRuns = parseInt(statsRows[0]?.total_runs || 0, 10);
    const successRuns = parseInt(statsRows[0]?.success_runs || 0, 10);
    const failedRuns = parseInt(statsRows[0]?.failed_runs || 0, 10);
    const avgDurationMs = Math.round(parseFloat(statsRows[0]?.avg_duration_ms || 0));
    const successRate = totalRuns > 0 ? parseFloat(((successRuns / totalRuns) * 100).toFixed(1)) : 100.0;

    // 2. Last run record
    const [lastRunRows] = await pool.query(`
      SELECT * FROM bot_runs ORDER BY id DESC LIMIT 1
    `);
    const lastRun = lastRunRows.length > 0 ? lastRunRows[0] : null;

    // 3. Pending queue size
    const [pendingRows] = await pool.query(`
      SELECT COUNT(*) AS pending_count FROM claims WHERE status = 'Submitted'
    `);
    const pendingQueueSize = parseInt(pendingRows[0]?.pending_count || 0, 10);

    // 4. Stale-run alert check
    // If claims_input.xlsx was regenerated > N minutes ago, pending queue is non-empty, and no newer output arrived
    const staleThresholdMinutes = parseInt(process.env.STALE_RUN_MINUTES || '10', 10);
    let staleAlert = {
      isStale: false,
      ageMinutes: 0,
      thresholdMinutes: staleThresholdMinutes,
      message: null
    };

    if (pendingQueueSize > 0 && fs.existsSync(resolvedInputFile)) {
      try {
        const inStat = fs.statSync(resolvedInputFile);
        const inMtime = inStat.mtime;
        const ageMs = Date.now() - inMtime.getTime();
        const ageMinutes = ageMs / (1000 * 60);

        let outMtime = null;
        if (fs.existsSync(resolvedOutputFile)) {
          outMtime = fs.statSync(resolvedOutputFile).mtime;
        }

        const noNewerOutput = !outMtime || outMtime.getTime() < inMtime.getTime();

        if (ageMinutes >= staleThresholdMinutes && noNewerOutput) {
          staleAlert = {
            isStale: true,
            ageMinutes: Math.round(ageMinutes),
            thresholdMinutes: staleThresholdMinutes,
            message: `Stale Bot Run Alert: claims_input.xlsx was regenerated ${Math.round(ageMinutes)} minutes ago with ${pendingQueueSize} pending claims, but no new verified output has arrived.`
          };
        } else {
          staleAlert.ageMinutes = Math.round(ageMinutes);
        }
      } catch (fileErr) {
        console.warn('[Monitoring Stale Check Warning]:', fileErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      total_runs: totalRuns,
      success_runs: successRuns,
      failed_runs: failedRuns,
      success_rate: successRate,
      avg_duration_ms: avgDurationMs,
      last_run: lastRun,
      pending_queue_size: pendingQueueSize,
      stale_alert: staleAlert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Monitoring Summary Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bot monitoring summary.',
      error: error.message
    });
  }
}

/**
 * GET /api/monitoring/runs?limit=50&status=Failed
 * Returns recent bot run executions with optional status filtering
 */
async function getMonitoringRuns(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const statusFilter = req.query.status;

    let query = 'SELECT * FROM bot_runs';
    const params = [];

    if (statusFilter && ['Success', 'Failed'].includes(statusFilter)) {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const [runs] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: runs.length,
      runs
    });
  } catch (error) {
    console.error('[Monitoring Runs Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bot runs history.',
      error: error.message
    });
  }
}

module.exports = {
  getMonitoringSummary,
  getMonitoringRuns
};

