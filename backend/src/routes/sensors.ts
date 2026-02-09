import express from 'express';
import {
  getSensorById,
  getSensorDataRange,
  getLatestSensorData,
  getAllSensors,
  createSensor,
  updateSensor,
  getStationById,
  findSensorByStationAndType,
  insertSensorData,
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/sensors
 * Get all sensors
 * ตามเอกสาร: 07-data-model-api-design.md#sensors
 * Access: All authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sensors = await getAllSensors();
    res.json({
      success: true,
      data: sensors,
      count: sensors.length,
    });
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensors',
    });
  }
});

/**
 * GET /api/sensors/:id
 * Get sensor by ID
 * Requires authentication
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sensorId = parseInt(req.params.id);
    const sensor = await getSensorById(sensorId);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: 'Sensor not found',
      });
    }

    res.json({
      success: true,
      data: sensor,
    });
  } catch (error) {
    console.error('Error fetching sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor',
    });
  }
});

/**
 * GET /api/sensors/:id/data
 * Get sensor data within time range
 * Query params: from (ISO date), to (ISO date)
 * Requires authentication
 */
router.get('/:id/data', authenticateToken, async (req, res) => {
  try {
    const sensorId = parseInt(req.params.id);
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: from, to',
      });
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    const data = await getSensorDataRange(sensorId, fromDate, toDate);
    
    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor data',
    });
  }
});

/**
 * GET /api/sensors/:id/data/latest
 * Get latest sensor data
 * Requires authentication
 */
router.get('/:id/data/latest', authenticateToken, async (req, res) => {
  try {
    const sensorId = parseInt(req.params.id);
    const data = await getLatestSensorData(sensorId);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'No data found for this sensor',
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest sensor data',
    });
  }
});

/**
 * POST /api/sensors
 * Create new sensor
 * ตามเอกสาร: 07-data-model-api-design.md#sensors
 * Access: Manager, Super User
 * 
 * Request Body:
 * {
 *   "station_id": number,
 *   "sensor_type": string
 * }
 */
router.post('/', authenticateToken, requireRole('MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const { station_id, sensor_type } = req.body;
    
    // Validation
    if (!station_id || !sensor_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: station_id, sensor_type',
      });
    }
    
    // ตรวจสอบว่า station มีอยู่จริง
    const station = await getStationById(station_id);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Station not found',
      });
    }
    
    // ตรวจสอบว่า sensor type ซ้ำในสถานีเดียวกันหรือไม่
    const existingSensor = await findSensorByStationAndType(station_id, sensor_type);
    if (existingSensor) {
      return res.status(409).json({
        success: false,
        error: 'Sensor with this type already exists in this station',
      });
    }
    
    const newSensor = await createSensor(station_id, sensor_type);
    
    res.status(201).json({
      success: true,
      message: 'Sensor created successfully',
      data: newSensor,
    });
  } catch (error) {
    console.error('Error creating sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sensor',
    });
  }
});

/**
 * PUT /api/sensors/:id
 * Update sensor
 * ตามเอกสาร: 07-data-model-api-design.md#sensors
 * Access: Manager, Super User
 * 
 * Request Body:
 * {
 *   "sensor_type": string,
 *   "status": "active" | "inactive" | "maintenance"
 * }
 */
router.put('/:id', authenticateToken, requireRole('MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const sensorId = parseInt(req.params.id);
    const { sensor_type, status } = req.body;
    
    if (isNaN(sensorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sensor ID',
      });
    }
    
    // Validation
    if (!sensor_type || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sensor_type, status',
      });
    }
    
    // ตรวจสอบว่า sensor มีอยู่จริง
    const existingSensor = await getSensorById(sensorId);
    if (!existingSensor) {
      return res.status(404).json({
        success: false,
        error: 'Sensor not found',
      });
    }
    
    // Validate status
    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, inactive, or maintenance',
      });
    }
    
    const updatedSensor = await updateSensor(sensorId, sensor_type, status);
    
    res.json({
      success: true,
      message: 'Sensor updated successfully',
      data: updatedSensor,
    });
  } catch (error) {
    console.error('Error updating sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sensor',
    });
  }
});

/**
 * POST /api/sensors/:id/data
 * Insert sensor data
 * ตามเอกสาร: 07-data-model-api-design.md#sensor-data
 * Access: System/Manager (สำหรับ testing, ในโปรดักชันควรเป็น MQTT เท่านั้น)
 * 
 * Request Body:
 * {
 *   "value": number,
 *   "recorded_at": "ISO8601 datetime string" (optional, default: now)
 * }
 */
router.post('/:id/data', authenticateToken, requireRole('MANAGER', 'SUPER_USER'), async (req, res) => {
  try {
    const sensorId = parseInt(req.params.id);
    const { value, recorded_at } = req.body;
    
    if (isNaN(sensorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sensor ID',
      });
    }
    
    // Validation
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: value',
      });
    }
    
    // ตรวจสอบว่า sensor มีอยู่จริง
    const sensor = await getSensorById(sensorId);
    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: 'Sensor not found',
      });
    }
    
    // ใช้เวลาปัจจุบันถ้าไม่ระบุ
    const recordedAt = recorded_at ? new Date(recorded_at) : new Date();
    
    if (recorded_at && isNaN(recordedAt.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recorded_at format',
      });
    }
    
    const newData = await insertSensorData(sensorId, value, recordedAt);
    
    res.status(201).json({
      success: true,
      message: 'Sensor data inserted successfully',
      data: newData,
    });
  } catch (error) {
    console.error('Error inserting sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to insert sensor data',
    });
  }
});

export default router;
