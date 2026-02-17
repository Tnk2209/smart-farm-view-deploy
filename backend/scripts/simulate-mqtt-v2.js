/**
 * MQTT Simulator V2 - สำหรับทดสอบระบบที่แยก sensor/status topics
 * 
 * ส่ง 2 topics แยกกัน:
 * - env/v1/RDS0001/{device_id}/sensor - ข้อมูลสิ่งแวดล้อม
 * - env/v1/RDS0001/{device_id}/status - ข้อมูลสุขภาพเครื่อง
 */

import mqtt from 'mqtt';
import 'dotenv/config';

// Configuration
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://mqtt.winbot.tech:1883';
const SITE_ID = 'RDS0001';
const DEVICE_ID = 'RDG0001';
const INTERVAL_MS = 60000; // 60 seconds

let bootId = generateBootId();
let seq = 0;

// State management for realistic random walk
const state = {
  // Environmental sensors
  rain_mm: 0,
  soil_rh_pct: 45,
  soil_temp_c: 28,
  air_pressure_kpa: 101,
  air_temp_c: 30,
  air_rh_pct: 70,
  wind_speed_ms: 2,
  rain_rate_mmph: 0,
  
  // Device status
  cbn_rh_pct: 55,
  cbn_temp_c: 35,
  ctrl_temp_c: 32,
  batt_temp_c: 30,
  pv_a: 0.5,
  pv_v: 18,
  load_w: 15,
  chg_a: 1.2,
  load_a: 1.5,
  load_v: 12.8,
  batt_cap: 85,
  batt_v: 12.8,
};

function generateBootId() {
  return Math.random().toString(36).substring(2, 15);
}

function generateMsgId() {
  return `${bootId}-${String(seq).padStart(6, '0')}`;
}

/**
 * Random walk: value changes gradually
 */
function randomWalk(current, step, min, max) {
  const change = (Math.random() - 0.5) * step * 2;
  const next = current + change;
  return Math.max(min, Math.min(max, next));
}

/**
 * Update sensor values with realistic changes
 */
function updateSensorValues() {
  // Environmental sensors
  state.air_temp_c = randomWalk(state.air_temp_c, 0.5, 20, 38);
  state.air_rh_pct = randomWalk(state.air_rh_pct, 2, 40, 95);
  state.air_pressure_kpa = randomWalk(state.air_pressure_kpa, 0.2, 98, 104);
  state.wind_speed_ms = randomWalk(state.wind_speed_ms, 0.3, 0, 15);
  state.soil_temp_c = randomWalk(state.soil_temp_c, 0.2, 22, 32);
  state.soil_rh_pct = randomWalk(state.soil_rh_pct, 1, 25, 75);
  
  // Rain (occasional)
  if (Math.random() < 0.1) {
    state.rain_rate_mmph = Math.random() * 10;
    state.rain_mm = state.rain_mm + state.rain_rate_mmph / 60;
  } else {
    state.rain_rate_mmph = 0;
  }
}

/**
 * Update status/device health values
 */
function updateStatusValues() {
  // Time of day simulation for solar
  const hour = new Date().getHours();
  const isDaytime = hour >= 7 && hour <= 18;
  
  if (isDaytime) {
    state.pv_v = randomWalk(state.pv_v, 1, 15, 22);
    state.pv_a = randomWalk(state.pv_a, 0.3, 0.5, 5);
    state.chg_a = randomWalk(state.chg_a, 0.2, 0.5, 3);
  } else {
    state.pv_v = randomWalk(state.pv_v, 0.5, 0, 5);
    state.pv_a = 0;
    state.chg_a = 0;
  }
  
  // Battery
  state.batt_v = randomWalk(state.batt_v, 0.1, 12.2, 13.8);
  state.batt_cap = randomWalk(state.batt_cap, 2, 60, 100);
  state.batt_temp_c = randomWalk(state.batt_temp_c, 0.3, 25, 40);
  
  // Load
  state.load_w = randomWalk(state.load_w, 2, 10, 30);
  state.load_a = state.load_w / state.load_v;
  state.load_v = state.batt_v;
  
  // Cabinet
  state.cbn_temp_c = randomWalk(state.cbn_temp_c, 0.5, 28, 45);
  state.cbn_rh_pct = randomWalk(state.cbn_rh_pct, 2, 40, 70);
  state.ctrl_temp_c = randomWalk(state.ctrl_temp_c, 0.3, 26, 40);
}

/**
 * Create sensor data payload
 */
function createSensorPayload() {
  seq++;
  return {
    schema_ver: "1.0",
    site_id: SITE_ID,
    device_id: DEVICE_ID,
    ts: new Date().toISOString(),
    boot_id: bootId,
    seq: seq,
    msg_id: generateMsgId(),
    data: {
      rain_mm: parseFloat(state.rain_mm.toFixed(1)),
      soil_rh_pct: parseFloat(state.soil_rh_pct.toFixed(1)),
      soil_temp_c: parseFloat(state.soil_temp_c.toFixed(1)),
      air_pressure_kpa: parseFloat(state.air_pressure_kpa.toFixed(1)),
      air_temp_c: parseFloat(state.air_temp_c.toFixed(1)),
      air_rh_pct: parseFloat(state.air_rh_pct.toFixed(1)),
      wind_speed_ms: parseFloat(state.wind_speed_ms.toFixed(1)),
      rain_rate_mmph: parseFloat(state.rain_rate_mmph.toFixed(1)),
    }
  };
}

/**
 * Create status data payload
 */
function createStatusPayload() {
  seq++;
  return {
    schema_ver: "1.0",
    site_id: SITE_ID,
    device_id: DEVICE_ID,
    ts: new Date().toISOString(),
    boot_id: bootId,
    seq: seq,
    msg_id: generateMsgId(),
    data: {
      cbn_rh_pct: parseFloat(state.cbn_rh_pct.toFixed(1)),
      cbn_temp_c: parseFloat(state.cbn_temp_c.toFixed(1)),
      ctrl_temp_c: parseFloat(state.ctrl_temp_c.toFixed(1)),
      batt_temp_c: parseFloat(state.batt_temp_c.toFixed(1)),
      pv_a: parseFloat(state.pv_a.toFixed(2)),
      pv_v: parseFloat(state.pv_v.toFixed(1)),
      load_w: parseFloat(state.load_w.toFixed(1)),
      chg_a: parseFloat(state.chg_a.toFixed(2)),
      load_a: parseFloat(state.load_a.toFixed(2)),
      load_v: parseFloat(state.load_v.toFixed(1)),
      batt_cap: parseFloat(state.batt_cap.toFixed(0)),
      batt_v: parseFloat(state.batt_v.toFixed(1)),
    }
  };
}

/**
 * Main simulation
 */
function startSimulation() {
  console.log('🚀 MQTT Simulator V2 Starting...');
  console.log(`📡 Broker: ${BROKER_URL}`);
  console.log(`📍 Site: ${SITE_ID}`);
  console.log(`🔌 Device: ${DEVICE_ID}`);
  console.log(`⏱️  Interval: ${INTERVAL_MS / 1000}s\n`);

  const client = mqtt.connect(BROKER_URL, {
    clientId: `simulator-${DEVICE_ID}-${Date.now()}`,
    clean: true,
  });

  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker\n');
    console.log('📤 Publishing messages...\n');

    // Initial publish
    publishMessages(client);

    // Periodic publish
    setInterval(() => {
      publishMessages(client);
    }, INTERVAL_MS);
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
  });

  client.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

/**
 * Publish both sensor and status messages
 */
function publishMessages(client) {
  const timestamp = new Date().toISOString();
  
  // Update values
  updateSensorValues();
  updateStatusValues();

  // Create payloads
  const sensorPayload = createSensorPayload();
  const statusPayload = createStatusPayload();

  // Topics
  const sensorTopic = `env/v1/${SITE_ID}/${DEVICE_ID}/sensor`;
  const statusTopic = `env/v1/${SITE_ID}/${DEVICE_ID}/status`;

  // Publish sensor data
  client.publish(sensorTopic, JSON.stringify(sensorPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Failed to publish sensor data:', err);
    } else {
      console.log(`[${timestamp}] 🌡️  Sensor data published to: ${sensorTopic}`);
      console.log(`   Air: ${sensorPayload.data.air_temp_c}°C, ${sensorPayload.data.air_rh_pct}% RH`);
      console.log(`   Soil: ${sensorPayload.data.soil_temp_c}°C, ${sensorPayload.data.soil_rh_pct}% moisture`);
    }
  });

  // Publish status data
  client.publish(statusTopic, JSON.stringify(statusPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Failed to publish status data:', err);
    } else {
      console.log(`[${timestamp}] 🔋 Status data published to: ${statusTopic}`);
      console.log(`   Battery: ${statusPayload.data.batt_v}V, ${statusPayload.data.batt_cap}%`);
      console.log(`   Solar: ${statusPayload.data.pv_v}V, ${statusPayload.data.pv_a}A`);
      console.log('');
    }
  });
}

// Start
startSimulation();
