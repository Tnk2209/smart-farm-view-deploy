import express from 'express';
import {
  createFarmPlot,
  getAllFarmPlots,
  getFarmPlotsByUserId,
  getFarmPlotById,
  updateFarmPlotStatus,
  findNearestStation,
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/plots
 * Register new farm plot (UC10)
 * ตามเอกสาร: 04-use-case-diagram.md#UC10
 * Access: USER (Farmer)
 * 
 * Request Body:
 * {
 *   "lat": number,
 *   "lon": number,
 *   "utm_coords": string (optional),
 *   "land_title_deed": string (optional),
 *   "area_size_rai": number (optional)
 * }
 */
router.post('/', authenticateToken, requireRole('USER', 'MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const { lat, lon, utm_coords, land_title_deed, area_size_rai } = req.body;
    const userId = req.user!.user_id;

    // Validation
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: lat, lon',
      });
    }

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'lat and lon must be numbers',
      });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lat/lon values',
      });
    }

    // Create farm plot (status = 'pending')
    const plot = await createFarmPlot(
      userId,
      lat,
      lon,
      utm_coords,
      land_title_deed,
      area_size_rai
    );

    // Find nearest station for reference
    const nearestStation = await findNearestStation(lat, lon);

    res.status(201).json({
      success: true,
      data: {
        ...plot,
        nearest_station: nearestStation,
      },
      message: 'Farm plot registered successfully. Waiting for approval.',
    });
  } catch (error) {
    console.error('Error creating farm plot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create farm plot',
    });
  }
});

/**
 * GET /api/plots/me
 * Get current user's farm plots
 * Access: Authenticated users
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const plots = await getFarmPlotsByUserId(userId);

    res.json({
      success: true,
      data: plots,
    });
  } catch (error) {
    console.error('Error fetching user plots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farm plots',
    });
  }
});

/**
 * GET /api/plots
 * Get all farm plots (UC11 - for approval)
 * Access: SUPER_USER only
 */
router.get('/', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const plots = await getAllFarmPlots();

    res.json({
      success: true,
      data: plots,
    });
  } catch (error) {
    console.error('Error fetching all plots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farm plots',
    });
  }
});

/**
 * GET /api/plots/:id
 * Get farm plot by ID
 * Access: Owner or SUPER_USER
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const plotId = parseInt(req.params.id);
    const plot = await getFarmPlotById(plotId);

    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Farm plot not found',
      });
    }

    // Check access: owner or super user
    if (plot.user_id !== req.user!.user_id && req.user!.role !== 'SUPER_USER') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: plot,
    });
  } catch (error) {
    console.error('Error fetching plot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farm plot',
    });
  }
});

/**
 * PUT /api/plots/:id/approve
 * Approve farm plot registration (UC11)
 * ตามเอกสาร: 04-use-case-diagram.md#UC11
 * Access: SUPER_USER only
 * 
 * Request Body:
 * {
 *   "status": "active" | "rejected",
 *   "nearest_station_id": number (optional)
 * }
 */
router.put('/:id/approve', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const plotId = parseInt(req.params.id);
    const { status, nearest_station_id } = req.body;

    // Validation
    if (!status || !['active', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "active" or "rejected"',
      });
    }

    const plot = await getFarmPlotById(plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Farm plot not found',
      });
    }

    // If approving, calculate nearest station if not provided
    let stationId = nearest_station_id;
    if (status === 'active' && !stationId) {
      const nearestStation = await findNearestStation(plot.lat, plot.lon);
      stationId = nearestStation?.station_id;
    }

    const updatedPlot = await updateFarmPlotStatus(plotId, status, stationId);

    res.json({
      success: true,
      data: updatedPlot,
      message: `Farm plot ${status === 'active' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error approving plot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update farm plot status',
    });
  }
});

export default router;
