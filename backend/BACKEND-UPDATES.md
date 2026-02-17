# 🎉 Backend Updates Summary - Status Separation Implementation

**วันที่:** 18 กุมภาพันธ์ 2026

## 📌 ภาพรวมการเปลี่ยนแปลง

แยกการจัดการข้อมูล **Environmental Sensors** และ **Device Status** ออกจากกันเพื่อความชัดเจนและประสิทธิภาพ

---

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. **Database Schema** 🗄️

#### Table ใหม่: `station_status`
```sql
CREATE TABLE station_status (
  status_id BIGSERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES station(station_id),
  
  -- Cabinet Monitoring
  cbn_rh_pct DOUBLE PRECISION,
  cbn_temp_c DOUBLE PRECISION,
  ctrl_temp_c DOUBLE PRECISION,
  batt_temp_c DOUBLE PRECISION,
  
  -- Solar Power
  pv_a DOUBLE PRECISION,
  pv_v DOUBLE PRECISION,
  
  -- Load & Battery
  load_w, load_a, load_v, chg_a DOUBLE PRECISION,
  batt_cap DOUBLE PRECISION,
  batt_v DOUBLE PRECISION,
  
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ไฟล์:** `src/database/migrate.ts` ✏️

---

### 2. **Types & Interfaces** 📝

#### แยก Types
```typescript
// Environmental sensors (เก็บใน sensor table)
type SensorType = 
  | 'wind_speed_ms'
  | 'air_temp_c'
  | 'air_rh_pct'
  | 'air_pressure_kpa'
  | 'rain_rate_mmph'
  | 'rain_mm'
  | 'soil_rh_pct'
  | 'soil_temp_c';

// Device health (เก็บใน station_status table)
type StatusType = 
  | 'cbn_rh_pct'
  | 'cbn_temp_c'
  | 'ctrl_temp_c'
  | 'batt_temp_c'
  | 'pv_a'
  | 'pv_v'
  | 'load_w'
  | 'chg_a'
  | 'load_a'
  | 'load_v'
  | 'batt_cap'
  | 'batt_v';
```

**Interface ใหม่:**
- `StationStatusData` - โครงสร้างข้อมูล status
- `StatusMessage` - MQTT message สำหรับ status
- `STATUS_FIELD_MAPPING` - แมป field names

**ไฟล์:** `src/types.ts` ✏️

---

### 3. **Database Queries** 🔍

#### Functions ใหม่ใน `queries.ts`:
```typescript
insertStationStatus(stationId, data, recordedAt)
getLatestStationStatus(stationId)
getStationStatusRange(stationId, fromDate, toDate)
getRecentStationStatus(stationId, limit)
```

**ไฟล์:** `src/database/queries.ts` ✏️

---

### 4. **Service Layer** ⚙️

#### ไฟล์ใหม่: `statusService.ts` 🆕
```typescript
processStatusMessage(status: StatusMessage)
  → ประมวลผลข้อมูล device health
  → บันทึกลง station_status table
  → ไม่มี threshold checking

validateStatusMessage(payload: any)
  → ตรวจสอบความถูกต้องของ message
```

**ไฟล์:** `src/services/statusService.ts` 🆕

---

### 5. **MQTT Subscriber** 📡

#### แก้ไข `subscriber.ts` ให้แยก Handler:
```typescript
function getMessageType(topic: string) {
  if (topic.includes('sensor')) return 'sensor';
  if (topic.includes('status')) return 'status';
  return 'unknown';
}

processMessage(topic, payload) {
  switch (getMessageType(topic)) {
    case 'sensor':
      → telemetryService.ts
      → บันทึก sensor_data
      → ตรวจสอบ threshold → alert
      
    case 'status':
      → statusService.ts
      → บันทึก station_status
      → (ไม่มี alert)
  }
}
```

**ไฟล์:** `src/mqtt/subscriber.ts` ✏️

---

### 6. **API Endpoints** 🌐

#### Route ใหม่: `stationStatus.ts` 🆕

```
GET /api/stations/:id/status/latest
└─ ดูข้อมูล status ล่าสุด

GET /api/stations/:id/status/recent?limit=100
└─ ดูประวัติ status

GET /api/stations/:id/status/range?from=...&to=...
└─ ดู status ในช่วงเวลา
```

**ไฟล์:** 
- `src/routes/stationStatus.ts` 🆕
- `src/server.ts` ✏️ (เพิ่ม route)

---

### 7. **Database Seeding** 🌱

#### แก้ไข `seed.ts`:
- ลบ status types ออกจาก sensor creation
- ลบ threshold สำหรับ status types
- เหลือแค่ 8 environmental sensors
- เหลือแค่ 8 thresholds

**ไฟล์:** `src/database/seed.ts` ✏️

---

### 8. **MQTT Simulator V2** 🔬

#### Script ใหม่: `simulate-mqtt-v2.js` 🆕
- ส่ง **2 topics แยกกัน:**
  - `env/v1/RDS0001/RDG0001/sensor` - Environmental data
  - `env/v1/RDS0001/RDG0001/status` - Device health
- Random walk simulation
- Time-based solar simulation (กลางวัน/กลางคืน)

**ไฟล์:** `scripts/simulate-mqtt-v2.js` 🆕

**คำสั่ง:**
```bash
npm run simulate
```

---

## 🚀 วิธีใช้งาน (Quick Start)

### 1. **Migration + Seeding**
```bash
cd backend

# สร้าง table ใหม่
npm run db:migrate

# เพิ่มข้อมูลทดสอบ
npm run db:seed
```

### 2. **เริ่ม Backend Server**
```bash
npm run dev
```

### 3. **ทดสอบด้วย MQTT Simulator** (Terminal ใหม่)
```bash
npm run simulate
```

จะเห็น output:
```
🌡️ Sensor data published to: env/v1/RDS0001/RDG0001/sensor
   Air: 28.5°C, 72.3% RH
   Soil: 27.1°C, 48.2% moisture

🔋 Status data published to: env/v1/RDS0001/RDG0001/status
   Battery: 12.8V, 85%
   Solar: 18.2V, 1.5A
```

---

## 📊 ตัวอย่างการใช้งาน API

### ดูข้อมูล Sensor (Environmental)
```bash
# ดูข้อมูล sensor ล่าสุด
GET /api/stations/1/data/latest

# ดูข้อมูลช่วงเวลา
GET /api/stations/1/data/range?from=2026-02-18T00:00:00Z&to=2026-02-18T23:59:59Z
```

### ดูข้อมูล Status (Device Health) 🆕
```bash
# ดูสถานะล่าสุด
GET /api/stations/1/status/latest

# ดูประวัติ 100 รอบล่าสุด
GET /api/stations/1/status/recent?limit=100

# ดูสถานะในช่วงเวลา
GET /api/stations/1/status/range?from=2026-02-18T00:00:00Z&to=2026-02-18T23:59:59Z
```

---

## 📁 สรุปไฟล์ที่เปลี่ยนแปลง

| ไฟล์ | สถานะ | คำอธิบาย |
|------|-------|----------|
| `src/database/migrate.ts` | ✏️ แก้ไข | เพิ่ม station_status table |
| `src/database/seed.ts` | ✏️ แก้ไข | ลบ status types ออก |
| `src/database/queries.ts` | ✏️ แก้ไข | เพิ่ม status queries |
| `src/types.ts` | ✏️ แก้ไข | แยก SensorType/StatusType |
| `src/services/statusService.ts` | 🆕 ใหม่ | Service สำหรับ status |
| `src/mqtt/subscriber.ts` | ✏️ แก้ไข | แยก handler ตาม topic |
| `src/routes/stationStatus.ts` | 🆕 ใหม่ | API endpoints ใหม่ |
| `src/server.ts` | ✏️ แก้ไข | เพิ่ม status routes |
| `scripts/simulate-mqtt-v2.js` | 🆕 ใหม่ | MQTT simulator แบบใหม่ |
| `package.json` | ✏️ แก้ไข | เพิ่ม npm scripts |

---

## 🎯 ขั้นตอนต่อไป - Frontend Integration

### 1. **สร้าง API Client Functions**
```typescript
// lib/api.ts
export async function getStationStatus(stationId: number) {
  const res = await fetch(`${API_URL}/stations/${stationId}/status/latest`);
  return res.json();
}

export async function getStationStatusHistory(
  stationId: number, 
  limit = 100
) {
  const res = await fetch(
    `${API_URL}/stations/${stationId}/status/recent?limit=${limit}`
  );
  return res.json();
}
```

### 2. **สร้าง Component แสดงสถานะอุปกรณ์**
```typescript
// components/StationHealth.tsx
- แสดงสถานะแบตเตอรี่ (batt_v, batt_cap)
- แสดงโซล่าเซลล์ (pv_v, pv_a)
- แสดงอุณหภูมิตู้ (cbn_temp_c, cbn_rh_pct)
- แสดง Load (load_w, load_a)
```

### 3. **เพิ่มใน Dashboard**
- แสดง Battery indicator
- แสดง Solar power status
- Alert เมื่อแบตต่ำกว่า 20%

---

## 🔍 การทดสอบ

### ✅ ควรทดสอบ:
- [ ] Migration รัน successfully
- [ ] Seeding สร้างข้อมูลครบ (8 sensors)
- [ ] Server start ได้
- [ ] MQTT simulator ส่งข้อมูล 2 topics
- [ ] Backend รับและบันทึกข้อมูล sensor
- [ ] Backend รับและบันทึกข้อมูล status
- [ ] API `/status/latest` ใช้งานได้
- [ ] Alert ถูกสร้างสำหรับ sensor (ไม่มีสำหรับ status)

---

## 📖 อ้างอิง

### MQTT Topics Structure:
```
env/v1/RDS0001/RDG0001/sensor  → Environmental data
env/v1/RDS0001/RDG0001/status  → Device health data
```

### Database Tables:
```
sensor + sensor_data         → Environmental sensors
station_status               → Device health/status
```

### Services:
```
telemetryService.ts          → Process sensor data + alerts
statusService.ts             → Process status data (no alerts)
```

---

## 💡 Tips

### เพิ่ม Battery Alert ในอนาคต:
```typescript
// ใน statusService.ts
if (statusData.batt_cap < 20) {
  await insertAlert(
    station.station_id,
    null, // ไม่มี sensor_id
    null, // ไม่มี data_id
    'battery_low',
    `Battery capacity low: ${statusData.batt_cap}%`,
    'high'
  );
}
```

### Custom Topic Detection:
```typescript
// ใน subscriber.ts - ปรับ logic ตาม topic ที่ใช้จริง
function getMessageType(topic: string) {
  if (topic.includes('telemetry')) return 'sensor';
  if (topic.includes('health')) return 'status';
  return 'unknown';
}
```

---

**สร้างโดย:** GitHub Copilot  
**วันที่:** 18 กุมภาพันธ์ 2026  
**Version:** Backend v2.0 - Status Separation
