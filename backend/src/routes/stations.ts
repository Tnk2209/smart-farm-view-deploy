import express from 'express';
import {
  getAllStations,
  getStationById,
  getLatestStationData,
  createStation,
  updateStation,
  findStationByDeviceId,
  findStationByName,
  findStationByCoords,
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

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

/**
 * POST /api/stations
 * Create new station
 * ตามเอกสาร: 07-data-model-api-design.md#stations
 * Access: Manager, Super User
 * 
 * Request Body:
 * {
 *   "device_id": "string",
 *   "station_name": "string",
 *   "province": "string",
 *   "latitude": number,
 *   "longitude": number
 * }
 */
router.post('/', authenticateToken, requireRole('MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const { device_id, station_name, province, latitude, longitude } = req.body;

    // Validation
    if (!device_id || !station_name || !province || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: device_id, station_name, province, latitude, longitude',
      });
    }

    // ตรวจสอบว่า device_id ซ้ำหรือไม่
    const existingStation = await findStationByDeviceId(device_id);
    if (existingStation) {
      return res.status(409).json({
        success: false,
        error: 'Device ID already exists (Device ID ซ้ำในระบบ)',
      });
    }

    // ตรวจสอบว่า station_name ซ้ำหรือไม่
    const existingName = await findStationByName(station_name);
    if (existingName) {
      return res.status(409).json({
        success: false,
        error: 'Station name already exists (ชื่อสถานีซ้ำในระบบ)',
      });
    }

    // ตรวจสอบว่าพิกัดซ้ำหรือไม่
    const existingCoords = await findStationByCoords(latitude, longitude);
    if (existingCoords) {
      return res.status(409).json({
        success: false,
        error: 'Station with these coordinates already exists (พิกัดนี้ซ้ำกับสถานีอื่นในระบบ)',
      });
    }

    // Validate latitude/longitude range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude values',
      });
    }

    const newStation = await createStation(device_id, station_name, province, latitude, longitude);

    res.status(201).json({
      success: true,
      message: 'Station created successfully',
      data: newStation,
    });
  } catch (error) {
    console.error('Error creating station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create station',
    });
  }
});

/**
 * PUT /api/stations/:id
 * Update station
 * ตามเอกสาร: 07-data-model-api-design.md#stations
 * Access: Manager, Super User
 * 
 * Request Body:
 * {
 *   "station_name": "string",
 *   "province": "string",
 *   "latitude": number,
 *   "longitude": number,
 *   "status": "normal" | "warning" | "critical"
 * }
 */
router.put('/:id', authenticateToken, requireRole('MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const { station_name, province, latitude, longitude, status } = req.body;

    if (isNaN(stationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid station ID',
      });
    }

    // Validation
    if (!station_name || !province || latitude === undefined || longitude === undefined || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: station_name, province, latitude, longitude, status',
      });
    }

    // ตรวจสอบว่า station มีอยู่จริง
    const existingStation = await getStationById(stationId);
    if (!existingStation) {
      return res.status(404).json({
        success: false,
        error: 'Station not found',
      });
    }

    // Validate latitude/longitude range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude values',
      });
    }

    // Validate status
    if (!['normal', 'warning', 'critical'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: normal, warning, or critical',
      });
    }

    const updatedStation = await updateStation(stationId, station_name, province, latitude, longitude, status);

    res.json({
      success: true,
      message: 'Station updated successfully',
      data: updatedStation,
    });
  } catch (error) {
    console.error('Error updating station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update station',
    });
  }
});

export default router;
