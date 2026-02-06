import express from 'express';
import {
  getSensorById,
  getSensorDataRange,
  getLatestSensorData,
} from '../database/queries.js';

const router = express.Router();

/**
 * GET /api/sensors/:id
 * Get sensor by ID
 */
router.get('/:id', async (req, res) => {
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
 */
router.get('/:id/data', async (req, res) => {
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
 */
router.get('/:id/data/latest', async (req, res) => {
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

export default router;
