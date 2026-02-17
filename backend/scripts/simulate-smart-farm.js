
import pg from 'pg';
import mqtt from 'mqtt';
import 'dotenv/config';

const { Pool } = pg;

// --- Configuration ---

// Database Config
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'smart_farm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

// MQTT Config
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const TOPIC_PREFIX = 'smartfarm/telemetry';

// 42 Provinces (North, Northeast, Central)
const PROVINCES = [
    // North (15)
    { name: 'Chiang Mai', lat: 18.7932, lon: 98.9867, region: 'North' },
    { name: 'Chiang Rai', lat: 19.9086, lon: 99.8325, region: 'North' },
    { name: 'Lampang', lat: 18.2923, lon: 99.4928, region: 'North' },
    { name: 'Lamphun', lat: 18.5748, lon: 99.0087, region: 'North' },
    { name: 'Mae Hong Son', lat: 19.3020, lon: 97.9654, region: 'North' },
    { name: 'Nan', lat: 18.7725, lon: 100.7719, region: 'North' },
    { name: 'Phayao', lat: 19.1662, lon: 99.9018, region: 'North' },
    { name: 'Phrae', lat: 18.1446, lon: 100.1403, region: 'North' },
    { name: 'Uttaradit', lat: 17.6201, lon: 100.0993, region: 'North' },
    { name: 'Tak', lat: 16.8840, lon: 99.1259, region: 'North' },
    { name: 'Kamphaeng Phet', lat: 16.4828, lon: 99.5227, region: 'North' },
    { name: 'Sukhothai', lat: 17.0096, lon: 99.8264, region: 'North' },
    { name: 'Phitsanulok', lat: 16.8409, lon: 100.2573, region: 'North' },
    { name: 'Phichit', lat: 16.4411, lon: 100.3489, region: 'North' },
    { name: 'Phetchabun', lat: 16.4190, lon: 101.1567, region: 'North' },

    // Northeast (20)
    { name: 'Nakhon Ratchasima', lat: 14.9799, lon: 102.0977, region: 'Northeast' },
    { name: 'Buriram', lat: 14.9930, lon: 103.1029, region: 'Northeast' },
    { name: 'Surin', lat: 14.8829, lon: 103.4937, region: 'Northeast' },
    { name: 'Sisaket', lat: 15.1186, lon: 104.3227, region: 'Northeast' },
    { name: 'Ubon Ratchathani', lat: 15.2287, lon: 104.8564, region: 'Northeast' },
    { name: 'Yasothon', lat: 15.7924, lon: 104.1486, region: 'Northeast' },
    { name: 'Chaiyaphum', lat: 15.8063, lon: 102.0315, region: 'Northeast' },
    { name: 'Amnat Charoen', lat: 15.8657, lon: 104.6258, region: 'Northeast' },
    { name: 'Bueng Kan', lat: 18.3605, lon: 103.6464, region: 'Northeast' },
    { name: 'Nong Khai', lat: 17.8785, lon: 102.7413, region: 'Northeast' },
    { name: 'Loei', lat: 17.4860, lon: 101.7223, region: 'Northeast' },
    { name: 'Udon Thani', lat: 17.4253, lon: 102.7902, region: 'Northeast' },
    { name: 'Nong Bua Lamphu', lat: 17.2039, lon: 102.4402, region: 'Northeast' },
    { name: 'Sakon Nakhon', lat: 17.1664, lon: 104.1486, region: 'Northeast' },
    { name: 'Nakhon Phanom', lat: 17.3996, lon: 104.7936, region: 'Northeast' },
    { name: 'Mukdahan', lat: 16.5436, lon: 104.7235, region: 'Northeast' },
    { name: 'Kalasin', lat: 16.4322, lon: 103.5061, region: 'Northeast' },
    { name: 'Maha Sarakham', lat: 16.1857, lon: 103.2997, region: 'Northeast' },
    { name: 'Roi Et', lat: 16.0538, lon: 103.6520, region: 'Northeast' },
    { name: 'Khon Kaen', lat: 16.4322, lon: 102.8236, region: 'Northeast' },

    // Central (7)
    { name: 'Bangkok', lat: 13.7563, lon: 100.5018, region: 'Central' },
    { name: 'Ayutthaya', lat: 14.3532, lon: 100.5684, region: 'Central' },
    { name: 'Saraburi', lat: 14.5289, lon: 100.9101, region: 'Central' },
    { name: 'Lopburi', lat: 14.7995, lon: 100.6534, region: 'Central' },
    { name: 'Sing Buri', lat: 14.8906, lon: 100.3968, region: 'Central' },
    { name: 'Chai Nat', lat: 15.1852, lon: 100.1253, region: 'Central' },
    { name: 'Nakhon Sawan', lat: 15.7001, lon: 100.0699, region: 'Central' },
    
    { name: 'Chanthaburi', lat: 12.825192, lon: 102.010803, region: 'Central' },

];

const SENSOR_TYPES = [
    'wind_speed', 'air_temperature', 'air_humidity', 'air_pressure',
    'rainfall', 'soil_moisture', 'soil_temperature',
    'cabinet_temperature', 'cabinet_humidity', 'solar_voltage', 'battery_voltage', 'gate_door'
];

// --- State Management ---
// Keep track of current values to simulate realistic changes (Random Walk)
const stationStates = new Map();
// Keep track of active anomalies
const stationAnomalies = new Map(); // deviceId -> { sensorKey: { type: 'spike'|'failure', remaining: number } }

function initializeStationState(deviceId) {
    stationStates.set(deviceId, {
        wind_speed_ms: 2.0,
        air_temp_c: 30.0,
        air_rh_pct: 60.0,
        air_pressure_hpa: 1010.0,
        rain_rate_mmph: 0.0,
        soil_moisture_pct: 45.0,
        soil_temp_c: 28.0,
        cabinet_temp_c: 35.0,
        cabinet_rh_pct: 50.0,
        solar_v: 18.0,
        battery_v: 12.5,
        gate_door: 0
    });
}

function updateStationState(deviceId) {
    const current = stationStates.get(deviceId);

    // Random Walk Logic: New = Old + RandomStep
    // Bounded to keep values realistic

    const step = (val, maxStep, min, max) => {
        let change = (Math.random() - 0.5) * maxStep;
        let next = val + change;
        return Math.max(min, Math.min(max, next));
    };

    const newState = {
        wind_speed_ms: step(current.wind_speed_ms, 0.5, 0, 20),
        air_temp_c: step(current.air_temp_c, 0.2, 15, 42),
        air_rh_pct: step(current.air_rh_pct, 1.0, 20, 95),
        air_pressure_hpa: step(current.air_pressure_hpa, 0.5, 990, 1020),
        rain_rate_mmph: Math.random() > 0.9 ? Math.random() * 5 : 0, // Occasional rain
        soil_moisture_pct: step(current.soil_moisture_pct, 0.1, 10, 90),
        soil_temp_c: step(current.soil_temp_c, 0.1, 20, 35),
        cabinet_temp_c: step(current.cabinet_temp_c, 0.2, 30, 60),
        cabinet_rh_pct: step(current.cabinet_rh_pct, 1.0, 10, 80),
        solar_v: step(current.solar_v, 0.5, 0, 24), // Should correlate with time of day in real app, but random is okay for now
        battery_v: step(current.battery_v, 0.1, 11.0, 14.0),
        gate_door: current.gate_door // Toggle rarely?
    };

    // Randomly toggle gate door very rarely (1/1000 chance)
    if (Math.random() < 0.001) {
        newState.gate_door = newState.gate_door === 1 ? 0 : 1;
    }

    stationStates.set(deviceId, newState);

    // --- Anomaly Logic ---
    return applyAnomalies(deviceId, newState);
}

function applyAnomalies(deviceId, data) {
    // 1. Chance to start new anomaly (e.g., 10% chance per station per cycle)
    if (Math.random() < 0.1) {
        const sensors = Object.keys(data).filter(k => k !== 'gate_door');
        const targetSensor = sensors[Math.floor(Math.random() * sensors.length)];
        const type = Math.random() < 0.5 ? 'spike' : 'failure';
        const duration = Math.floor(Math.random() * 5) + 1; // 1-5 minutes

        if (!stationAnomalies.has(deviceId)) {
            stationAnomalies.set(deviceId, {});
        }

        const deviceAnomalies = stationAnomalies.get(deviceId);
        // Only add if not already anomalous
        if (!deviceAnomalies[targetSensor]) {
            deviceAnomalies[targetSensor] = { type, remaining: duration };
            console.log(`⚠️  Starting anomaly on ${deviceId} [${targetSensor}]: ${type} (${duration} min)`);
        }
    }

    // 2. Apply active anomalies
    if (stationAnomalies.has(deviceId)) {
        const deviceAnomalies = stationAnomalies.get(deviceId);
        const activeSensors = Object.keys(deviceAnomalies);

        if (activeSensors.length === 0) return data;

        const anomalousData = { ...data };

        activeSensors.forEach(sensorKey => {
            const anomaly = deviceAnomalies[sensorKey];

            if (anomaly.remaining > 0) {
                if (anomaly.type === 'failure') {
                    // Simulate sensor failure (null or 0)
                    anomalousData[sensorKey] = null;
                } else if (anomaly.type === 'spike') {
                    // Simulate high value spike based on type
                    if (sensorKey.includes('temp')) anomalousData[sensorKey] = 80 + Math.random() * 10;
                    else if (sensorKey.includes('rh') || sensorKey.includes('moisture')) anomalousData[sensorKey] = Math.random() > 0.5 ? 98 : 2;
                    else if (sensorKey.includes('wind')) anomalousData[sensorKey] = 40 + Math.random() * 20;
                    else if (sensorKey.includes('rain')) anomalousData[sensorKey] = 80 + Math.random() * 20;
                    else if (sensorKey.includes('pressure')) anomalousData[sensorKey] = 950 + Math.random() * 10; // Low pressure storm
                    else if (sensorKey.includes('v')) anomalousData[sensorKey] = 9.0; // Low battery
                    else anomalousData[sensorKey] = 999;
                }
                anomaly.remaining--;
            } else {
                // Anomaly finished
                delete deviceAnomalies[sensorKey];
                console.log(`✅ Anomaly ended on ${deviceId} [${sensorKey}]`);
            }
        });

        return anomalousData;
    }

    return data;
}

// --- Main Logic ---

async function ensureStationsExist() {
    console.log('🌱 Checking/Seeding 42 stations...');
    const client = await pool.connect();

    try {
        for (const prov of PROVINCES) {
            const deviceId = `IG502-${prov.name.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}`;
            const stationName = `${prov.name} Smart Station`;

            // 1. Check Stations
            const res = await client.query('SELECT station_id FROM station WHERE device_id = $1', [deviceId]);

            let stationId;
            if (res.rowCount === 0) {
                // Insert
                console.log(`   Creating station: ${prov.name} (${deviceId})`);
                const ins = await client.query(
                    `INSERT INTO station (device_id, station_name, province, latitude, longitude, status)
           VALUES ($1, $2, $3, $4, $5, 'normal')
           RETURNING station_id`,
                    [deviceId, stationName, prov.name, prov.lat, prov.lon]
                );
                stationId = ins.rows[0].station_id;
            } else {
                stationId = res.rows[0].station_id;
            }

            // 2. Ensure Sensors
            for (const type of SENSOR_TYPES) {
                await client.query(
                    `INSERT INTO sensor (station_id, sensor_type, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (station_id, sensor_type) DO NOTHING`,
                    [stationId, type]
                );
            }

            // 3. Update Alert Table Constraint (Support 'critical')
            try {
                // Find existing constraint name
                const checkRes = await client.query(`
                    SELECT conname 
                    FROM pg_constraint 
                    WHERE conrelid = 'alert'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%severity%'
                `);

                if (checkRes.rows.length > 0) {
                    const conName = checkRes.rows[0].conname;
                    await client.query(`ALTER TABLE alert DROP CONSTRAINT "${conName}"`);
                    console.log(`   Dropped old alert constraint: ${conName}`);
                }

                // Add new constraint
                await client.query(`
                    ALTER TABLE alert 
                    ADD CONSTRAINT alert_severity_check 
                    CHECK (severity IN ('low', 'medium', 'high', 'critical'))
                `);
                // console.log('   ✅ Alert severity constraint updated (includes critical)');
            } catch (e) {
                console.warn('   ⚠️ Note: Could not update alert constraint (might be locked or permission issue):', e.message);
            }

            // Initialize simulation state
            initializeStationState(deviceId);
        }
    } catch (err) {
        console.error('❌ Database Error:', err);
        process.exit(1);
    } finally {
        client.release();
    }
    console.log('✅ Stations ensured.');
}

function startSimulation() {
    console.log(`🚀 Starting Simulation... connecting to ${BROKER_URL}`);

    const client = mqtt.connect(BROKER_URL);

    client.on('connect', () => {
        console.log('✅ MQTT Connected.');
        console.log('📡 Publishing data every 60 seconds...');

        // Initial publish
        publishAllStations(client);

        // Interval publish
        setInterval(() => {
            publishAllStations(client);
        }, 60000);
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err);
    });
}

function publishAllStations(client) {
    console.log(`\n[${new Date().toISOString()}] Publishing to ${stationStates.size} stations...`);

    stationStates.forEach((state, deviceId) => {
        // Update state first
        const data = updateStationState(deviceId);

        const payload = {
            device_id: deviceId,
            ts: new Date().toISOString(),
            boot_id: 1,
            seq: Math.floor(Date.now() / 1000),
            msg_id: `${deviceId}-${Date.now()}`,
            data: data,
            sim_serial: 'SIM-' + deviceId,
            sim_rssi: -60 - Math.floor(Math.random() * 20)
        };

        const topic = `${TOPIC_PREFIX}/${deviceId}`;
        client.publish(topic, JSON.stringify(payload));
    });
}

// --- Run ---
(async () => {
    await ensureStationsExist();
    await pool.end(); // Close DB pool, we don't need it for simulation loop
    startSimulation();
})();
