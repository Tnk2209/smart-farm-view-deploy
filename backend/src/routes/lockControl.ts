import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { pool } from '../database/connection.js';
import { publishMessage } from '../mqtt/subscriber.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/stations/:id/lock/command
 * Send lock/unlock command to station
 * Access: SUPER_USER only
 */
router.post('/:id/lock/command', requireRole('SUPER_USER'), async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.id);
    const { action } = req.body;

    // Validate action
    if (!action || !['lock', 'unlock'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "lock" or "unlock"',
      });
    }

    // Get station info
    const stationResult = await pool.query(
      'SELECT station_id, device_id, station_name FROM station WHERE station_id = $1',
      [stationId]
    );

    if (stationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Station not found',
      });
    }

    const station = stationResult.rows[0];

    // MQTT Command Topic: cmd/{device_id}/lock
    const topic = `cmd/${station.device_id}/lock`;
    const payload = {
      action,
      timestamp: new Date().toISOString(),
      user_id: req.user?.user_id,
      username: req.user?.username,
    };

    // Publish MQTT command
    console.log(`🔐 Sending ${action.toUpperCase()} command to station ${station.station_name}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Payload:`, payload);

    publishMessage(topic, payload);

    // For demo: Simulate immediate response by updating gate_door sensor
    // In production, this would be updated when device sends telemetry back
    const gateValue = action === 'unlock' ? 1 : 0;

    // Find gate_door sensor for this station
    const sensorResult = await pool.query(
      `SELECT sensor_id FROM sensor 
       WHERE station_id = $1 AND sensor_type = 'gate_door'`,
      [stationId]
    );

    if (sensorResult.rows.length > 0) {
      const sensorId = sensorResult.rows[0].sensor_id;
      
      // Insert mock sensor data to simulate device response
      await pool.query(
        `INSERT INTO sensor_data (sensor_id, value, recorded_at)
         VALUES ($1, $2, NOW())`,
        [sensorId, gateValue]
      );

      console.log(`✅ Mock sensor data created: gate_door = ${gateValue}`);
    } else {
      console.log(`⚠️  No gate_door sensor found for station ${stationId}`);
    }

    // Log the command (audit trail)
    await pool.query(
      `INSERT INTO alert (station_id, sensor_id, alert_type, alert_message, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        stationId,
        sensorResult.rows[0]?.sensor_id || null,
        'LOCK_COMMAND',
        `${req.user?.username} sent ${action.toUpperCase()} command`,
        'low',
      ]
    );

    return res.json({
      success: true,
      message: `${action.toUpperCase()} command sent successfully`,
      data: {
        station_id: stationId,
        station_name: station.station_name,
        action,
        topic,
        timestamp: payload.timestamp,
        user: req.user?.username,
      },
    });

  } catch (error) {
    console.error('Error sending lock command:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send lock command',
    });
  }
});

/**
 * GET /api/stations/:id/lock/status
 * Get current lock status from gate_door sensor
 * Access: All authenticated users
 */
router.get('/:id/lock/status', async (req: Request, res: Response) => {
  try {
    const stationId = parseInt(req.params.id);

    // Get latest gate_door sensor data
    const result = await pool.query(
      `SELECT 
        s.sensor_id,
        s.sensor_type,
        sd.value,
        sd.recorded_at,
        st.station_name
       FROM sensor s
       LEFT JOIN LATERAL (
         SELECT value, recorded_at
         FROM sensor_data
         WHERE sensor_id = s.sensor_id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) sd ON true
       JOIN station st ON s.station_id = st.station_id
       WHERE s.station_id = $1 AND s.sensor_type = 'gate_door'`,
      [stationId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          has_lock: false,
          message: 'No gate_door sensor found for this station',
        },
      });
    }

    const data = result.rows[0];
    
    // Handle case where sensor exists but no data yet
    if (data.value === null || data.value === undefined) {
      return res.json({
        success: true,
        data: {
          has_lock: true,
          station_name: data.station_name,
          status: 'unknown',
          gate_value: null,
          last_update: null,
          last_command: null,
        },
      });
    }
    
    const gateValue = parseFloat(data.value);
    const isUnlocked = gateValue === 1;
    const isLocked = gateValue === 0;

    // Get last command from alerts
    const lastCommandResult = await pool.query(
      `SELECT alert_message, created_at
       FROM alert
       WHERE station_id = $1 AND alert_type = 'LOCK_COMMAND'
       ORDER BY created_at DESC
       LIMIT 1`,
      [stationId]
    );

    return res.json({
      success: true,
      data: {
        has_lock: true,
        station_name: data.station_name,
        status: isUnlocked ? 'unlocked' : 'locked',
        gate_value: gateValue,
        last_update: data.recorded_at,
        last_command: lastCommandResult.rows[0] || null,
      },
    });

  } catch (error) {
    console.error('Error getting lock status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get lock status',
    });
  }
});

export default router;
