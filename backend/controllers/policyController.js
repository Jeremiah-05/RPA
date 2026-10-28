// backend/controllers/policyController.js
const pool = require('../config/db');

/**
 * Get all configured policies
 * GET /api/policies
 */
async function getAllPolicies(req, res) {
  try {
    const { activeOnly } = req.query;
    let query = 'SELECT * FROM policies';
    const params = [];

    if (activeOnly === 'true') {
      query += ' WHERE is_active = TRUE';
    }

    query += ' ORDER BY id ASC';

    const [policies] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: policies.length,
      policies
    });
  } catch (error) {
    console.error('[Get Policies Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve policies.',
      error: error.message
    });
  }
}

/**
 * Create a new expense category policy (Admin only)
 * POST /api/policies
 */
async function createPolicy(req, res) {
  try {
    const { category, max_limit, receipt_required = true, description, is_active = true } = req.body;

    if (!category || max_limit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category name and maximum limit are required.'
      });
    }

    const cleanCategory = category.trim();
    const parsedLimit = parseFloat(max_limit);

    if (isNaN(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Max limit must be a positive number.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM policies WHERE category = ? LIMIT 1', [cleanCategory]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Policy for category '${cleanCategory}' already exists.`
      });
    }

    const [result] = await pool.query(
      `INSERT INTO policies (category, max_limit, receipt_required, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanCategory, parsedLimit, Boolean(receipt_required), description ? description.trim() : null, Boolean(is_active)]
    );

    return res.status(201).json({
      success: true,
      message: 'Policy created successfully.',
      policy: {
        id: result.insertId,
        category: cleanCategory,
        max_limit: parsedLimit,
        receipt_required: Boolean(receipt_required),
        description,
        is_active: Boolean(is_active)
      }
    });
  } catch (error) {
    console.error('[Create Policy Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create policy.',
      error: error.message
    });
  }
}

/**
 * Update an existing policy limit or requirement (Admin only)
 * PUT /api/policies/:id
 */
async function updatePolicy(req, res) {
  try {
    const policyId = parseInt(req.params.id, 10);
    const { category, max_limit, receipt_required, description, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM policies WHERE id = ?', [policyId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Policy not found.' });
    }

    const current = existing[0];
    const updatedCategory = category ? category.trim() : current.category;
    const updatedLimit = max_limit !== undefined ? parseFloat(max_limit) : current.max_limit;
    const updatedReceipt = receipt_required !== undefined ? Boolean(receipt_required) : current.receipt_required;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedActive = is_active !== undefined ? Boolean(is_active) : current.is_active;

    await pool.query(
      `UPDATE policies
       SET category = ?, max_limit = ?, receipt_required = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [updatedCategory, updatedLimit, updatedReceipt, updatedDesc, updatedActive, policyId]
    );

    return res.status(200).json({
      success: true,
      message: 'Policy updated successfully.',
      policy: {
        id: policyId,
        category: updatedCategory,
        max_limit: updatedLimit,
        receipt_required: updatedReceipt,
        description: updatedDesc,
        is_active: updatedActive
      }
    });
  } catch (error) {
    console.error('[Update Policy Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update policy.',
      error: error.message
    });
  }
}

/**
 * Delete or deactivate policy (Admin only)
 * DELETE /api/policies/:id
 */
async function deletePolicy(req, res) {
  try {
    const policyId = parseInt(req.params.id, 10);

    const [existing] = await pool.query('SELECT * FROM policies WHERE id = ?', [policyId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Policy not found.' });
    }

    // Check if any claims reference this category
    const [claimsUsing] = await pool.query(
      'SELECT COUNT(*) AS count FROM claims WHERE category = ?',
      [existing[0].category]
    );

    if (claimsUsing[0].count > 0) {
      // Soft-delete to preserve audit history
      await pool.query('UPDATE policies SET is_active = FALSE WHERE id = ?', [policyId]);
      return res.status(200).json({
        success: true,
        message: 'Policy has historical claims associated with it. Deactivated policy instead of hard delete.'
      });
    }

    await pool.query('DELETE FROM policies WHERE id = ?', [policyId]);
    return res.status(200).json({
      success: true,
      message: 'Policy permanently deleted.'
    });
  } catch (error) {
    console.error('[Delete Policy Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete policy.',
      error: error.message
    });
  }
}

module.exports = {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy
};
