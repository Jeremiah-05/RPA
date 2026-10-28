// backend/controllers/auditController.js
const pool = require('../config/db');

/**
 * Retrieve system audit logs with actor and claim details
 * GET /api/audit
 */
async function getAuditLogs(req, res) {
  try {
    const { claimId, action, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.id,
        a.claim_id,
        c.claim_code,
        c.category,
        c.amount,
        a.user_id,
        COALESCE(u.name, 'RPA System Bot') AS actor_name,
        COALESCE(u.role, 'bot') AS actor_role,
        a.action,
        a.old_status,
        a.new_status,
        a.comments,
        a.created_at
      FROM audit_log a
      INNER JOIN claims c ON a.claim_id = c.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // If employee, only allow viewing their own claim logs
    if (req.user.role === 'employee') {
      query += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    if (claimId) {
      query += ' AND a.claim_id = ?';
      params.push(parseInt(claimId, 10));
    }

    if (action) {
      query += ' AND a.action = ?';
      params.push(action);
    }

    query += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [logs] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: logs.length,
      auditLogs: logs
    });
  } catch (error) {
    console.error('[Audit Logs Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log trail.',
      error: error.message
    });
  }
}

module.exports = {
  getAuditLogs
};
