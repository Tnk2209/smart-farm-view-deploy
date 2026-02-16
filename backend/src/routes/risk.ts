import { Router, Request, Response } from 'express';
import {
  getRiskDashboardSummary,
  calculateDroughtRisk,
  calculateFloodRisk,
  calculateStormRisk,
  calculateDiseaseRisk,
} from '../services/riskCalculation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/risk/summary
 * Get 4 Pillars Risk Dashboard summary
 * Access: All authenticated users
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 10;
    
    const summary = await getRiskDashboardSummary(days);

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting risk dashboard summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get risk dashboard summary',
    });
  }
});

/**
 * GET /api/risk/drought
 * Get detailed Drought risk analysis
 * Access: All authenticated users
 */
router.get('/drought', async (req: Request, res: Response) => {
  try {
    const droughtRisk = await calculateDroughtRisk();

    return res.json({
      success: true,
      data: {
        pillar: 'drought',
        title: 'Drought Risk (ภัยแล้ง)',
        ...droughtRisk,
      },
    });
  } catch (error) {
    console.error('Error calculating drought risk:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate drought risk',
    });
  }
});

/**
 * GET /api/risk/flood
 * Get detailed Flood risk analysis
 * Access: All authenticated users
 */
router.get('/flood', async (req: Request, res: Response) => {
  try {
    const floodRisk = await calculateFloodRisk();

    return res.json({
      success: true,
      data: {
        pillar: 'flood',
        title: 'Flood Risk (น้ำท่วม)',
        ...floodRisk,
      },
    });
  } catch (error) {
    console.error('Error calculating flood risk:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate flood risk',
    });
  }
});

/**
 * GET /api/risk/storm
 * Get detailed Storm risk analysis
 * Access: All authenticated users
 */
router.get('/storm', async (req: Request, res: Response) => {
  try {
    const stormRisk = await calculateStormRisk();

    return res.json({
      success: true,
      data: {
        pillar: 'storm',
        title: 'Storm Risk (พายุ)',
        ...stormRisk,
      },
    });
  } catch (error) {
    console.error('Error calculating storm risk:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate storm risk',
    });
  }
});

/**
 * GET /api/risk/disease
 * Get detailed Disease risk analysis (BUS Algorithm)
 * Access: All authenticated users
 */
router.get('/disease', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 10;
    const diseaseRisk = await calculateDiseaseRisk(days);

    return res.json({
      success: true,
      data: {
        pillar: 'disease',
        title: 'Disease Risk (โรคและแมลงศัตรูพืช)',
        ...diseaseRisk,
      },
    });
  } catch (error) {
    console.error('Error calculating disease risk:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate disease risk',
    });
  }
});

export default router;
