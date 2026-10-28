// backend/utils/excelGenerator.js
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generates claims_input.xlsx containing 'Claims' and 'Policies' sheets
 * for consumption by the UiPath Studio robot.
 * 
 * @param {Array} claims List of pending claims from database
 * @param {Array} policies List of active policy rules from database
 * @param {String} outputPath Destination file path
 * @returns {Promise<String>} Absolute path of generated Excel file
 */
async function generateClaimsInputExcel(claims, policies, outputPath) {
  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Automated Expense Verification System';
  workbook.created = new Date();

  // ----------------------------------------------------------------------------
  // SHEET 1: Claims (pending verification)
  // ----------------------------------------------------------------------------
  const claimsSheet = workbook.addWorksheet('Claims', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  claimsSheet.columns = [
    { header: 'ClaimID', key: 'ClaimID', width: 12 },
    { header: 'ClaimCode', key: 'ClaimCode', width: 18 },
    { header: 'EmployeeName', key: 'EmployeeName', width: 22 },
    { header: 'Department', key: 'Department', width: 20 },
    { header: 'Category', key: 'Category', width: 22 },
    { header: 'Amount', key: 'Amount', width: 16 },
    { header: 'ExpenseDate', key: 'ExpenseDate', width: 16 },
    { header: 'Description', key: 'Description', width: 35 },
    { header: 'ReceiptPath', key: 'ReceiptPath', width: 35 }
  ];

  // Header styling for Claims sheet
  const claimsHeaderRow = claimsSheet.getRow(1);
  claimsHeaderRow.height = 26;
  claimsHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
    };
  });

  // Populate Claims rows
  claims.forEach((claim) => {
    const formattedDate = claim.expense_date
      ? new Date(claim.expense_date).toISOString().split('T')[0]
      : '';

    const row = claimsSheet.addRow({
      ClaimID: claim.id,
      ClaimCode: claim.claim_code || '',
      EmployeeName: claim.employee_name || 'N/A',
      Department: claim.department || 'N/A',
      Category: claim.category || '',
      Amount: parseFloat(claim.amount) || 0,
      ExpenseDate: formattedDate,
      Description: claim.description || '',
      ReceiptPath: claim.receipt_path || ''
    });

    // Formatting for individual cells
    row.getCell('ClaimID').alignment = { horizontal: 'center' };
    row.getCell('ClaimCode').alignment = { horizontal: 'center' };
    row.getCell('ExpenseDate').alignment = { horizontal: 'center' };
    row.getCell('Amount').numFmt = '₹#,##0.00';
    row.getCell('Amount').alignment = { horizontal: 'right' };
  });

  // ----------------------------------------------------------------------------
  // SHEET 2: Policies (Category limit lookup for UiPath)
  // ----------------------------------------------------------------------------
  const policiesSheet = workbook.addWorksheet('Policies', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  policiesSheet.columns = [
    { header: 'Category', key: 'Category', width: 25 },
    { header: 'MaxLimit', key: 'MaxLimit', width: 18 },
    { header: 'ReceiptRequired', key: 'ReceiptRequired', width: 18 },
    { header: 'IsActive', key: 'IsActive', width: 14 }
  ];

  // Header styling for Policies sheet
  const policyHeaderRow = policiesSheet.getRow(1);
  policyHeaderRow.height = 26;
  policyHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' } // Deep Teal Green
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
    };
  });

  // Populate Policies rows
  policies.forEach((policy) => {
    const row = policiesSheet.addRow({
      Category: policy.category,
      MaxLimit: parseFloat(policy.max_limit) || 0,
      ReceiptRequired: policy.receipt_required ? 'TRUE' : 'FALSE',
      IsActive: policy.is_active ? 'TRUE' : 'FALSE'
    });

    row.getCell('MaxLimit').numFmt = '₹#,##0.00';
    row.getCell('MaxLimit').alignment = { horizontal: 'right' };
    row.getCell('ReceiptRequired').alignment = { horizontal: 'center' };
    row.getCell('IsActive').alignment = { horizontal: 'center' };
  });

  // Write Excel file to disk
  await workbook.xlsx.writeFile(absolutePath);
  return absolutePath;
}

module.exports = {
  generateClaimsInputExcel
};
