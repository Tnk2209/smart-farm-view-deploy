import { Router, Request, Response } from 'express';
import { calculateBUS, type HourlyData, type BUSResult } from '../services/busAlgorithm.js';
import { getHourlyTempHumidityData, getStationById, getFarmPlotById } from '../database/queries.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/disease-risk/station/:station_id
 * Get disease risk (BUS score) for a specific station
 * Access: Manager, User, Super User
 */
router.get('/station/:station_id', async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.station_id);
    
    if (isNaN(stationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid station ID',
      });
    }

    // Verify station exists
    const station = await getStationById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Station not found',
      });
    }

    // Get hourly temperature and humidity data for the last 10 days
    const days = parseInt(req.query.days as string) || 10;
    const hourlyData = await getHourlyTempHumidityData(stationId, days);

    if (hourlyData.length === 0) {
      return res.json({
        success: true,
        data: {
          station_id: stationId,
          station_name: station.station_name,
          bus_score: 0,
          risk_level: 'low',
          dew_point_avg: 0,
          lwd_hours: 0,
          temperature_avg: 0,
          humidity_avg: 0,
          days_analyzed: 0,
          message: 'No data available for BUS calculation',
        },
      });
    }

    // Calculate BUS score
    const busResult: BUSResult = calculateBUS(hourlyData);

    return res.json({
      success: true,
      data: {
        station_id: stationId,
        station_name: station.station_name,
        ...busResult,
        data_points: hourlyData.length,
      },
    });
  } catch (error) {
    console.error('Error calculating disease risk for station:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate disease risk',
    });
  }
});

/**
 * GET /api/disease-risk/plot/:plot_id
 * Get disease risk (BUS score) for a farm plot based on nearest station
 * Access: User (own plots), Manager, Super User (all plots)
 */
router.get('/plot/:plot_id', async (req: Request, res: Response) => {
  try {
    const plotId = parseInt(req.params.plot_id);
    
    if (isNaN(plotId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plot ID',
      });
    }

    // Get farm plot
    const plot = await getFarmPlotById(plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Farm plot not found',
      });
    }

    // Check access control
    if (req.user?.role === 'USER' && plot.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you can only view your own plots',
      });
    }

    // Check if plot has been approved and has a nearest station
    if (!plot.nearest_station_id) {
      return res.status(400).json({
        success: false,
        error: 'Farm plot not approved yet or no nearest station assigned',
      });
    }

    // Get station info
    const station = await getStationById(plot.nearest_station_id);
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Nearest station not found',
      });
    }

    // Get hourly data and calculate BUS
    const days = parseInt(req.query.days as string) || 10;
    const hourlyData = await getHourlyTempHumidityData(plot.nearest_station_id, days);

    if (hourlyData.length === 0) {
      return res.json({
        success: true,
        data: {
          plot_id: plotId,
          station_id: plot.nearest_station_id,
          station_name: station.station_name,
          bus_score: 0,
          risk_level: 'low',
          dew_point_avg: 0,
          lwd_hours: 0,
          temperature_avg: 0,
          humidity_avg: 0,
          days_analyzed: 0,
          message: 'No data available for BUS calculation',
        },
      });
    }

    // Calculate BUS score
    const busResult: BUSResult = calculateBUS(hourlyData);

    return res.json({
      success: true,
      data: {
        plot_id: plotId,
        station_id: plot.nearest_station_id,
        station_name: station.station_name,
        ...busResult,
        data_points: hourlyData.length,
      },
    });
  } catch (error) {
    console.error('Error calculating disease risk for plot:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate disease risk',
    });
  }
});

/**
 * GET /api/disease-risk/all-stations
 * Get disease risk summary for all stations
 * Access: Manager, Super User
 */
router.get('/all-stations', async (req: Request, res: Response) => {
  try {
    // Only Manager and Super User can view all stations
    if (req.user?.role === 'USER') {
      return res.status(403).json({
        success: false,
        error: 'Access denied - Manager or Super User role required',
      });
    }

    const { getAllStations } = await import('../database/queries.js');
    const stations = await getAllStations();
    
    const days = parseInt(req.query.days as string) || 10;
    
    // Calculate BUS for each station
    const results = await Promise.all(
      stations.map(async (station) => {
        try {
          const hourlyData = await getHourlyTempHumidityData(station.station_id, days);
          
          if (hourlyData.length === 0) {
            return {
              station_id: station.station_id,
              station_name: station.station_name,
              province: station.province,
              bus_score: 0,
              risk_level: 'low' as const,
              has_data: false,
            };
          }

          const busResult = calculateBUS(hourlyData);
          
          return {
            station_id: station.station_id,
            station_name: station.station_name,
            province: station.province,
            bus_score: busResult.bus_score,
            risk_level: busResult.risk_level,
            lwd_hours: busResult.lwd_hours,
            has_data: true,
          };
        } catch (error) {
          console.error(`Error calculating BUS for station ${station.station_id}:`, error);
          return {
            station_id: station.station_id,
            station_name: station.station_name,
            province: station.province,
            bus_score: 0,
            risk_level: 'low' as const,
            has_data: false,
          };
        }
      })
    );

    // Summary statistics
    const totalStations = results.length;
    const highRisk = results.filter(r => r.risk_level === 'high' && r.has_data).length;
    const mediumRisk = results.filter(r => r.risk_level === 'medium' && r.has_data).length;
    const lowRisk = results.filter(r => r.risk_level === 'low' && r.has_data).length;

    return res.json({
      success: true,
      data: {
        summary: {
          total_stations: totalStations,
          high_risk: highRisk,
          medium_risk: mediumRisk,
          low_risk: lowRisk,
        },
        stations: results,
      },
    });
  } catch (error) {
    console.error('Error calculating disease risk for all stations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate disease risk summary',
    });
  }
});

export default router;