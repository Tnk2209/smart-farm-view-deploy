import mqtt from 'mqtt';
import 'dotenv/config';

/**
 * Test script to publish telemetry message to MQTT broker
 * Usage: tsx scripts/test-mqtt-publish.ts
 */

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org:1883';
const TOPIC = 'smartfarm/telemetry/IG502-ABC123';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 MQTT Test Publisher');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📍 Broker:', BROKER_URL);
console.log('📍 Topic:', TOPIC);
console.log('\n🔌 Connecting to MQTT broker...\n');

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
    gate_door: Math.random() > 0.5 ? 1 : 0,
  },
  sim_serial: '243038645779',
  sim_rssi: -40 + Math.floor(Math.random() * 20),
};

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker successfully!\n');
  console.log('⏳ Waiting 2 seconds to ensure backend is ready...\n');
  
  setTimeout(() => {
    console.log('📡 Publishing telemetry message...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Topic:', TOPIC);
    console.log('Message:', JSON.stringify(telemetryMessage, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    client.publish(TOPIC, JSON.stringify(telemetryMessage), { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish:', err);
        process.exit(1);
      } else {
        console.log('✅ Message published successfully!');
        console.log('\n👀 Check your backend terminal for incoming message logs...\n');
        setTimeout(() => {
          client.end();
          process.exit(0);
        }, 2000);
      }
    });
  }, 2000);
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('🔌 Connection closed');
});
