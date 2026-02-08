import express from 'express';
import { 
  getAllThresholds, 
  createThreshold, 
  updateThreshold,
  getThresholdById,
  getThresholdBySensorType
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/thresholds
 * Get all thresholds
 * Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
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

/**
 * POST /api/thresholds
 * Create new threshold
 * Requires: SUPER_USER role
 */
router.post('/', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const { sensor_type, min_value, max_value } = req.body;

    // Validation
    if (!sensor_type || min_value === undefined || max_value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sensor_type, min_value, max_value',
      });
    }

    if (min_value >= max_value) {
      return res.status(400).json({
        success: false,
        error: 'min_value must be less than max_value',
      });
    }

    // Check if threshold already exists for this sensor type
    const existing = await getThresholdBySensorType(sensor_type);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Threshold for sensor type "${sensor_type}" already exists`,
      });
    }

    const threshold = await createThreshold(
      sensor_type,
      min_value,
      max_value,
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      data: threshold,
      message: 'Threshold created successfully',
    });
  } catch (error) {
    console.error('Error creating threshold:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create threshold',
    });
  }
});

/**
 * PUT /api/thresholds/:id
 * Update threshold
 * Requires: SUPER_USER role
 */
router.put('/:id', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const thresholdId = parseInt(req.params.id);
    const { min_value, max_value } = req.body;

    // Validation
    if (min_value === undefined || max_value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: min_value, max_value',
      });
    }

    if (min_value >= max_value) {
      return res.status(400).json({
        success: false,
        error: 'min_value must be less than max_value',
      });
    }

    // Check if threshold exists
    const existing = await getThresholdById(thresholdId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Threshold not found',
      });
    }

    const threshold = await updateThreshold(thresholdId, min_value, max_value);

    res.json({
      success: true,
      data: threshold,
      message: 'Threshold updated successfully',
    });
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update threshold',
    });
  }
});

export default router;
