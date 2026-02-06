import express from 'express';
import { getAllThresholds } from '../database/queries.js';

const router = express.Router();

/**
 * GET /api/thresholds
 * Get all thresholds
 */
router.get('/', async (req, res) => {
  try {
    const thresholds = await getAllThresholds();
    
    res.json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds',
    });
  }
});

export default router;
