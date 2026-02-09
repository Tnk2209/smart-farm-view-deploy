import express from 'express';
import { getAllRoles } from '../database/queries.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/roles
 * Get all roles
 * Requires authentication
 * 
 * ตามเอกสาร: 07-data-model-api-design.md#roles
 * Access: All authenticated users
 * Use Case: แสดง dropdown ใน User Management form
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const roles = await getAllRoles();
    
    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
    });
  }
});

export default router;
