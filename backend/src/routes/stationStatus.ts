import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getLatestStationStatus,
  getStationStatusRange,
  getRecentStationStatus,
  getStationById,
} from '../database/queries.js';
import type { ApiResponse } from '../types.js';

const router = Router();

/**
 * GET /api/stations/:stationId/status/latest
 * Get the latest device status for a specific station
 */
router.get('/:stationId/status/latest', async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.stationId, 10);

    if (isNaN(stationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid station ID',
      } as ApiResponse);
    }

    // Check if station exists
    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: `Station not found with ID: ${stationId}`,
      } as ApiResponse);
    }

    const latestStatus = await getLatestStationStatus(stationId);

    if (!latestStatus) {
      return res.status(404).json({
        success: false,
        error: `No status data found for station: ${station.station_name}`,
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: latestStatus,
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching latest station status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/stations/:stationId/status/recent
 * Get recent device status records for a specific station
 * Query params: limit (default: 100)
 */
router.get('/:stationId/status/recent', async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.stationId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 100;

    if (isNaN(stationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid station ID',
      } as ApiResponse);
    }

    // Check if station exists
    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: `Station not found with ID: ${stationId}`,
      } as ApiResponse);
    }

    const recentStatus = await getRecentStationStatus(stationId, limit);

    res.json({
      success: true,
      data: recentStatus,
      message: `Retrieved ${recentStatus.length} status records`,
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching recent station status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/stations/:stationId/status/range
 * Get device status within a date range
 * Query params: from (ISO date), to (ISO date)
 */
router.get('/:stationId/status/range', async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.stationId, 10);
    const fromParam = req.query.from as string;
    const toParam = req.query.to as string;

    if (isNaN(stationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid station ID',
      } as ApiResponse);
    }

    if (!fromParam || !toParam) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: from, to (ISO date format)',
      } as ApiResponse);
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
      } as ApiResponse);
    }

    // Check if station exists
    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: `Station not found with ID: ${stationId}`,
      } as ApiResponse);
    }

    const statusData = await getStationStatusRange(stationId, fromDate, toDate);

    res.json({
      success: true,
      data: statusData,
      message: `Retrieved ${statusData.length} status records from ${fromParam} to ${toParam}`,
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching station status range:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
