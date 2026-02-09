import express from 'express';
import {
  getRecentAlerts,
  getAlertsByStationId,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  getAlertById,
} from '../database/queries.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/alerts
 * Get recent alerts (default 50)
 * Query params: limit (optional)
 * Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const alerts = await getRecentAlerts(limit);
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

/**
 * GET /api/alerts/unacknowledged
 * Get all unacknowledged alerts
 * Requires authentication
 */
router.get('/unacknowledged', authenticateToken, async (req, res) => {
  try {
    const alerts = await getUnacknowledgedAlerts();
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error fetching unacknowledged alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unacknowledged alerts',
    });
  }
});

/**
 * GET /api/alerts/station/:stationId
 * Get alerts for specific station
 * Requires authentication
 */
router.get('/station/:stationId', authenticateToken, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const alerts = await getAlertsByStationId(stationId, limit);
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error fetching station alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station alerts',
    });
  }
});

/**
 * PUT /api/alerts/:id/ack
 * Acknowledge an alert
 * ตามเอกสาร: 07-data-model-api-design.md#alerts
 * Access: All authenticated users
 * 
 * หมายเหตุ: เอกสารระบุเป็น PUT /api/alerts/:id/ack ไม่ใช่ POST
 */
router.put('/:id/ack', authenticateToken, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID',
      });
    }
    
    await acknowledgeAlert(alertId);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

/**
 * GET /api/alerts/:id
 * Get alert by ID
 * ตามเอกสาร: 07-data-model-api-design.md#alerts
 * Access: All authenticated users
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID',
      });
    }
    
    const alert = await getAlertById(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }
    
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});

export default router;
