# ✅ Backend Testing & Integration Checklist

## 🔧 Pre-Integration Testing

### 1. Database Setup
```bash
cd backend
```

- [ ] **Run Migration**
  ```bash
  npm run db:migrate
  ```
  ✅ ต้องเห็น: "Table station_status created"

- [ ] **Run Seeding**
  ```bash
  npm run db:seed
  ```
  ✅ ต้องเห็น:
  - "8 sensors inserted" (ไม่ใช่ 20)
  - "8 thresholds inserted" (ไม่ใช่ 20)

- [ ] **ตรวจสอบ Database**
  ```sql
  SELECT * FROM station_status LIMIT 1;
  -- ต้องมี table นี้
  
  SELECT COUNT(*) FROM sensor WHERE station_id = 1;
  -- ต้องได้ 8 (ไม่ใช่ 20)
  ```

---

### 2. Backend Server
```bash
npm run dev
```

- [ ] **Server starts successfully**
  ```
  ✅ Connected to MQTT broker
  ✅ Subscribed successfully
  Server running on port 3001
  ```

- [ ] **No TypeScript errors**
  ```
  (ไม่ควรมี compile errors)
  ```

- [ ] **Health check works**
  ```bash
  curl http://localhost:3001/health
  # {"status":"ok",...}
  ```

---

### 3. MQTT Simulation
```bash
# Terminal ใหม่
npm run simulate
```

- [ ] **Simulator starts**
  ```
  ✅ Connected to MQTT broker
  📤 Publishing messages...
  ```

- [ ] **Backend receives messages**
  ดูใน terminal ของ server:
  ```
  📨 MQTT MESSAGE RECEIVED!
  📍 Topic: env/v1/RDS0001/RDG0001/sensor
  ✅ Sensor data saved successfully
  
  📨 MQTT MESSAGE RECEIVED!
  📍 Topic: env/v1/RDS0001/RDG0001/status
  ✅ Status data saved successfully
  ```

- [ ] **Data saved to database**
  ```sql
  -- ตรวจสอบ sensor data
  SELECT COUNT(*) FROM sensor_data;
  -- ต้องเพิ่มขึ้นทุก 60 วินาที
  
  -- ตรวจสอบ status data
  SELECT COUNT(*) FROM station_status;
  -- ต้องเพิ่มขึ้นทุก 60 วินาที
  ```

---

### 4. API Testing

#### Test Sensor Data APIs (เดิม)
```bash
# ดูข้อมูล sensor ล่าสุด
curl http://localhost:3001/api/stations/1/data/latest

# Response ตัวอย่าง:
{
  "success": true,
  "data": [
    {
      "sensor_type": "air_temp_c",
      "value": 28.5,
      "recorded_at": "2026-02-18..."
    }
  ]
}
```

- [ ] GET `/api/stations/1/data/latest` - Returns sensor data

#### Test Status Data APIs (ใหม่) 🆕
```bash
# ดูสถานะล่าสุด
curl http://localhost:3001/api/stations/1/status/latest

# Response ตัวอย่าง:
{
  "success": true,
  "data": {
    "status_id": 123,
    "station_id": 1,
    "batt_v": 12.8,
    "batt_cap": 85,
    "pv_v": 18.2,
    "pv_a": 1.5,
    "cbn_temp_c": 35.2,
    ...
  }
}
```

- [ ] GET `/api/stations/1/status/latest` - Returns latest status
- [ ] GET `/api/stations/1/status/recent?limit=10` - Returns 10 records
- [ ] GET `/api/stations/1/status/range?from=...&to=...` - Returns range data

---

### 5. Alert System
```bash
# Force alert by adjusting threshold
curl -X PUT http://localhost:3001/api/thresholds/1 \
  -H "Content-Type: application/json" \
  -d '{"min_value": 50, "max_value": 60}'

# Wait for next MQTT message...
# Check alerts
curl http://localhost:3001/api/alerts
```

- [ ] **Sensor alerts created** (air_temp_c, soil_rh_pct, etc.)
- [ ] **No alerts for status data** (batt_v, pv_v, etc.)

---

## 🔗 Frontend Integration Tasks

### 1. Update API Client
File: `frontend/src/lib/api.ts`

```typescript
// เพิ่ม function ใหม่
export async function getStationStatus(stationId: number) {
  return apiClient.get(`/stations/${stationId}/status/latest`);
}

export async function getStationStatusHistory(
  stationId: number,
  limit = 100
) {
  return apiClient.get(`/stations/${stationId}/status/recent?limit=${limit}`);
}
```

- [ ] เพิ่ม `getStationStatus()`
- [ ] เพิ่ม `getStationStatusHistory()`
- [ ] Test API calls ใช้งานได้

---

### 2. Create Status Types
File: `frontend/src/lib/types.ts`

```typescript
export interface StationStatus {
  status_id: number;
  station_id: number;
  batt_v: number;
  batt_cap: number;
  pv_v: number;
  pv_a: number;
  cbn_temp_c: number;
  cbn_rh_pct: number;
  load_w: number;
  recorded_at: string;
}
```

- [ ] เพิ่ม `StationStatus` interface

---

### 3. Create Status Component
File: `frontend/src/components/StationHealth.tsx`

```typescript
import { useEffect, useState } from 'react';
import { getStationStatus } from '@/lib/api';

export function StationHealth({ stationId }: { stationId: number }) {
  const [status, setStatus] = useState(null);
  
  // Fetch latest status
  // Display:
  // - Battery indicator
  // - Solar power
  // - Cabinet temperature
  // - Load
}
```

- [ ] สร้าง `StationHealth` component
- [ ] แสดง Battery status (icon + percentage)
- [ ] แสดง Solar power (voltage + current)
- [ ] แสดง Cabinet temperature
- [ ] แสดง Load

---

### 4. Update Dashboard
File: `frontend/src/pages/Dashboard.tsx`

```typescript
import { StationHealth } from '@/components/StationHealth';

// เพิ่มใน dashboard
<StationHealth stationId={selectedStation} />
```

- [ ] เพิ่ม StationHealth component ใน Dashboard
- [ ] เพิ่ม Battery indicator ใน Station card
- [ ] เพิ่ม Warning สำหรับแบตต่ำ (< 20%)

---

### 5. Create Status Page (Optional)
File: `frontend/src/pages/StationStatus.tsx`

```typescript
// หน้าแสดงรายละเอียดสุขภาพเครื่องแบบเต็ม
- Battery history chart
- Solar power chart  
- Load chart
- Cabinet temperature chart
```

- [ ] สร้างหน้า Station Status Detail
- [ ] แสดง Charts สำหรับ battery, solar, load
- [ ] แสดงตาราง status history

---

## 🎨 UI/UX Suggestions

### Battery Indicator
```tsx
{status.batt_cap >= 80 && <BatteryFull className="text-green-500" />}
{status.batt_cap >= 50 && status.batt_cap < 80 && <BatteryMedium className="text-yellow-500" />}
{status.batt_cap < 50 && <BatteryLow className="text-red-500" />}
```

### Solar Power Status
```tsx
{status.pv_a > 0 ? (
  <Sun className="text-yellow-500" /> Solar Charging
) : (
  <Moon className="text-gray-400" /> No Solar
)}
```

### Cabinet Temperature Alert
```tsx
{status.cbn_temp_c > 40 && (
  <Alert severity="warning">
    Cabinet temperature high: {status.cbn_temp_c}°C
  </Alert>
)}
```

---

## 📊 Testing Scenarios

### Scenario 1: Normal Operation
```
✅ MQTT messages arrive every 60s
✅ Sensor data saved to sensor_data
✅ Status data saved to station_status
✅ Dashboard shows current values
✅ No alerts
```

### Scenario 2: Battery Low
```
✅ Battery capacity < 20%
✅ Frontend shows warning indicator
✅ Optional: Create manual alert
```

### Scenario 3: Sensor Threshold Violation
```
✅ Air temperature > 40°C
✅ Alert created in alert table
✅ Dashboard shows alert
✅ Station status = 'warning' or 'critical'
```

### Scenario 4: No Solar (Night)
```
✅ pv_a = 0, pv_v < 5
✅ Battery discharging
✅ UI shows "No Solar" status
```

---

## 🐛 Common Issues & Solutions

### Issue: Simulator ไม่ส่งข้อมูล
```bash
# ตรวจสอบ .env
MQTT_BROKER_URL=mqtt://mqtt.winbot.tech:1883

# ตรวจสอบ network
ping mqtt.winbot.tech
```

### Issue: Backend ไม่รับข้อมูล
```bash
# ตรวจสอบ topic subscription
# ดูใน logs ว่า subscribe สำเร็จหรือไม่
✅ Subscribed successfully!
   Granted subscriptions:
      ✓ env/v1/RDS0001/RDG0001/#
```

### Issue: Status data ไม่ถูกบันทึก
```bash
# ตรวจสอบ topic matching
# ใน subscriber.ts -> getMessageType()
# ต้อง return 'status' สำหรับ status topic
```

### Issue: TypeScript errors
```bash
# Re-compile
npm run build

# Check for type mismatches
```

---

## 🎯 Success Criteria

### Backend
- ✅ Migration สำเร็จ
- ✅ Seeding สร้างข้อมูลถูกต้อง (8 sensors)
- ✅ MQTT รับ 2 topics ได้
- ✅ Sensor data บันทึก + สร้าง alert ได้
- ✅ Status data บันทึกได้ (ไม่มี alert)
- ✅ API endpoints ใช้งานได้ทั้งหมด

### Frontend (Coming Soon)
- ✅ แสดง Battery status
- ✅ แสดง Solar power
- ✅ แสดง Cabinet temperature
- ✅ แสดง Load
- ✅ Warning เมื่อแบตต่ำ
- ✅ Charts สำหรับ status history

---

## 📝 Notes

- **Status data ไม่มี threshold/alert** - ใช้เพื่อ monitoring เท่านั้น
- **Sensor data มี threshold/alert** - ใช้เตือนสภาพแวดล้อมผิดปกติ
- **MQTT wildcard `#` รับทุก topics** - ใช้ได้กับโครงสร้างเดิม
- **Simulator ทำงานแบบ random walk** - ค่าเปลี่ยนแปลงแบบค่อยเป็นค่อยไป

---

**Last Updated:** 18 กุมภาพันธ์ 2026
