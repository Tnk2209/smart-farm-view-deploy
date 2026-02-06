import express from 'express';
import {
  getRecentAlerts,
  getAlertsByStationId,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
} from '../database/queries.js';

const router = express.Router();

/**
 * GET /api/alerts
 * Get recent alerts (default 50)
 * Query params: limit (optional)
 */
router.get('/', async (req, res) => {
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
 */
router.get('/unacknowledged', async (req, res) => {
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
 */
router.get('/station/:stationId', async (req, res) => {
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
 * POST /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
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

export default router;
