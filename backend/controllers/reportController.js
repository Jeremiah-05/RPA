// backend/controllers/reportController.js
const ExcelJS = require('exceljs');
const pool = require('../config/db');

/**
 * Generate and download multi-sheet executive report in Excel format
 * GET /api/reports/export
 */
async function exportReportsExcel(req, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Automated Expense Verification System';
    workbook.created = new Date();

    // ----------------------------------------------------------------------------
    // 1. Sheet: Verified & Approved Claims
    // ----------------------------------------------------------------------------
    const verifiedSheet = workbook.addWorksheet('Verified & Approved', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    verifiedSheet.columns = [
      { header: 'Claim ID', key: 'id', width: 12 },
      { header: 'Claim Code', key: 'claim_code', width: 18 },
      { header: 'Employee', key: 'employee_name', width: 22 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Expense Date', key: 'expense_date', width: 16 },
      { header: 'Status', key: 'status', width: 24 },
      { header: 'Admin Comments', key: 'admin_comments', width: 30 }
    ];

    // Header styling
    verifiedSheet.getRow(1).height = 25;
    verifiedSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }; // Green
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const [verifiedRows] = await pool.query(`
      SELECT c.id, c.claim_code, u.name AS employee_name, u.department, c.category, c.amount, 
             DATE_FORMAT(c.expense_date, '%Y-%m-%d') AS expense_date, c.status, c.admin_comments
      FROM claims c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.status IN ('Verified - Pending Approval', 'Approved')
      ORDER BY c.id ASC
    `);

    verifiedRows.forEach(r => {
      const row = verifiedSheet.addRow(r);
      row.getCell('amount').numFmt = '₹#,##0.00';
    });

    // ----------------------------------------------------------------------------
    // 2. Sheet: Flagged & Rejected Exceptions
    // ----------------------------------------------------------------------------
    const exceptionSheet = workbook.addWorksheet('Flagged Exceptions', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    exceptionSheet.columns = [
      { header: 'Claim ID', key: 'id', width: 12 },
      { header: 'Claim Code', key: 'claim_code', width: 18 },
      { header: 'Employee', key: 'employee_name', width: 22 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Detected Violations', key: 'violations', width: 45 },
      { header: 'Admin Remarks', key: 'admin_comments', width: 30 }
    ];

    exceptionSheet.getRow(1).height = 25;
    exceptionSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } }; // Red
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const [exceptionRows] = await pool.query(`
      SELECT c.id, c.claim_code, u.name AS employee_name, c.category, c.amount, 
             c.status, vr.violations, c.admin_comments
      FROM claims c
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN (
        SELECT claim_id, violations FROM verification_results ORDER BY id DESC
      ) vr ON c.id = vr.claim_id
      WHERE c.status IN ('Flagged', 'Rejected', 'Needs Correction')
      ORDER BY c.id ASC
    `);

    exceptionRows.forEach(r => {
      const row = exceptionSheet.addRow({
        ...r,
        violations: r.violations || 'Pending / Flagged'
      });
      row.getCell('amount').numFmt = '₹#,##0.00';
    });

    // ----------------------------------------------------------------------------
    // 3. Sheet: Complete Audit Log
    // ----------------------------------------------------------------------------
    const auditSheet = workbook.addWorksheet('System Audit Trail', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    auditSheet.columns = [
      { header: 'Log ID', key: 'id', width: 10 },
      { header: 'Claim Code', key: 'claim_code', width: 18 },
      { header: 'Actor', key: 'actor_name', width: 22 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Old Status', key: 'old_status', width: 18 },
      { header: 'New Status', key: 'new_status', width: 22 },
      { header: 'Comments', key: 'comments', width: 45 },
      { header: 'Timestamp', key: 'created_at', width: 22 }
    ];

    auditSheet.getRow(1).height = 25;
    auditSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const [auditRows] = await pool.query(`
      SELECT a.id, c.claim_code, COALESCE(u.name, 'RPA System Bot') AS actor_name, 
             a.action, a.old_status, a.new_status, a.comments,
             DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM audit_log a
      INNER JOIN claims c ON a.claim_id = c.id
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.id DESC
    `);

    auditRows.forEach(r => auditSheet.addRow(r));

    // Send workbook as downloadable Excel stream
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Expense_Claim_Executive_Report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Export Report Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Excel report.',
      error: error.message
    });
  }
}

module.exports = {
  exportReportsExcel
};
