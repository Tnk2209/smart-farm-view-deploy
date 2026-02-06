import mqtt from 'mqtt';

/**
 * Test script to publish telemetry message to MQTT broker
 * Usage: tsx scripts/test-mqtt-publish.ts
 */

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const TOPIC = 'smartfarm/telemetry/IG502-ABC123';

const telemetryMessage = {
  device_id: 'IG502-ABC123',
  ts: new Date().toISOString(),
  boot_id: Date.now(),
  seq: Math.floor(Math.random() * 10000),
  msg_id: `IG502-ABC123-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  data: {
    wind_speed_ms: 3.42 + Math.random() * 2,
    air_temp_c: 31.7 + Math.random() * 5,
    air_rh_pct: 68.2 + Math.random() * 10,
    air_pressure_hpa: 1006.3 + Math.random() * 5,
    rain_rate_mmph: Math.random() * 2,
    soil_moisture_pct: 24.1 + Math.random() * 10, // May trigger alert if < 25
    soil_temp_c: 29.3 + Math.random() * 3,
    cabinet_temp_c: 44.8 + Math.random() * 5,
    cabinet_rh_pct: 50.2 + Math.random() * 10,
    solar_v: 18.6 + Math.random() * 3,
    battery_v: 12.4 + Math.random() * 0.5,
  },
  sim_serial: '243038645779',
  sim_rssi: -40 + Math.floor(Math.random() * 20),
};

console.log('🚀 Connecting to MQTT broker:', BROKER_URL);

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log('\n📡 Publishing telemetry message...');
  console.log('Topic:', TOPIC);
  console.log('Message:', JSON.stringify(telemetryMessage, null, 2));

  client.publish(TOPIC, JSON.stringify(telemetryMessage), (err) => {
    if (err) {
      console.error('❌ Failed to publish:', err);
    } else {
      console.log('\n✅ Message published successfully!');
    }
    client.end();
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT error:', error);
  process.exit(1);
});
