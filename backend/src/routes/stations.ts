import express from 'express';
import {
  getAllStations,
  getStationById,
  getLatestStationData,
} from '../database/queries.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/stations
 * Get all stations
 * Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const stations = await getAllStations();
    res.json({
      success: true,
      data: stations,
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stations',
    });
  }
});

/**
 * GET /api/stations/:id
 * Get station by ID
 * Requires authentication
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const station = await getStationById(stationId);
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Station not found',
      });
    }

    res.json({
      success: true,
      data: station,
    });
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station',
    });
  }
});

/**
 * GET /api/stations/:id/data/latest
 * Get latest sensor data for all sensors in a station
 * Requires authentication
 */
router.get('/:id/data/latest', authenticateToken, async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const data = await getLatestStationData(stationId);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching latest station data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest data',
    });
  }
});

export default router;
