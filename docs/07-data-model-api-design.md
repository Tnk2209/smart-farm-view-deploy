# STEP 7: Data Model Design & Mapping (ERD → API / Backend Design)

> **แปลง ERD เป็น Data Model จริง + ออกแบบ API Endpoints + กำหนดสิทธิ์การใช้งาน**

---

## 🎯 วัตถุประสงค์ของ STEP 7

STEP 7 เป็นขั้นตอนการนำ **ERD (STEP 6)** มาตีความและแปลงเป็น  
**Data Model** ที่ใช้งานจริงในระบบ Backend

โดยมีเป้าหมายหลักคือ:

- แปลงโครงสร้างเชิงแนวคิด → โครงสร้างข้อมูลจริง
- กำหนด **Constraint / Rule / Behavior** ของข้อมูล
- ผูกข้อมูลเข้ากับ **Use Case และ API**
- เตรียมระบบให้พร้อมสำหรับ:
  - Backend Implementation
  - Frontend Dashboard
  - Demo ระบบด้วย Mock / Real-time Data

---

## 📦 Data Model แต่ละ Entity

---

## 1️⃣ ROLE Entity

### 📦 Data Model

```typescript
ROLE {
  role_id: number (PK)
  role_name: string (UNIQUE)
}
```

### 🎯 Purpose

ใช้กำหนด **สิทธิ์การใช้งานระบบ** (Role-Based Access Control: RBAC)  
แยกความสามารถของผู้ใช้แต่ละกลุ่มอย่างชัดเจน

### 📌 Constraints

- `role_name` ต้องไม่ซ้ำ (UNIQUE)
- ค่า `role_name` ที่ใช้ในระบบ:
  - `USER`
  - `MANAGER`
  - `SUPER_USER`

### 🔗 Relationships

- 1 ROLE → N USER

### 🌐 API Mapping

```
GET /api/roles
```

**📌 ใช้สำหรับ:**
- Permission check
- Login flow

**📌 Read-only** (ไม่เปิด CRUD เต็ม)

---

## 2️⃣ USER Entity

### 📦 Data Model **New Update:2**

```typescript
USER {
  user_id: number (PK)
  username: string (UNIQUE)
  password_hash: string
  email: string (UNIQUE)
  role_id: number (FK → ROLE)
  status: 'pending' | 'active' | 'inactive' | 'suspended' ** 
  phone: string
  full_name: string
  created_at: datetime
}
```

### 🎯 Purpose

จัดการข้อมูลผู้ใช้งานทั้งหมดในระบบ  
ใช้สำหรับ **Authentication, Authorization และ Audit**

### 📌 Constraints

- `username` ต้องไม่ซ้ำ (UNIQUE)
- `email` ต้องไม่ซ้ำ (UNIQUE)
- `password` ต้องเก็บแบบ **hash** เท่านั้น
- `status`:
  - `active` - ใช้งานได้
  - `inactive` - ปิดการใช้งาน
  - `suspended` - ระงับชั่วคราว

### 🔗 Relationships

- USER belongs to ROLE
- USER defines THRESHOLD
- USER acknowledges ALERT

### 🌐 API Mapping

```
POST   /api/auth/login
GET    /api/users
GET    /api/users/{id}
POST   /api/users        (Super User Only)
PUT    /api/users/{id}
```

### 🔐 Access Control

- **Super User** → CRUD ผู้ใช้ทั้งหมด
- **User / Manager** → ดูข้อมูลตัวเองเท่านั้น **New Update:2**

---

## 2️⃣.5️⃣ FARM_PLOT Entity (New)

### 📦 Data Model **New Update:2**

```typescript
FARM_PLOT {
  plot_id: number (PK)
  user_id: number (FK → USER)
  lat: number
  lon: number
  utm_coords: string
  nearest_station_id: number (FK → STATION)
  status: 'pending' | 'active' | 'rejected'
  created_at: datetime
}
```

### 🎯 Purpose **New Update:2**

เก็บข้อมูลพิกัดแปลงนาของเกษตรกร เพื่อ:
- Map กับ Station ที่ใกล้ที่สุด
- คำนวณ BUS Algorithm (Disease Risk) เฉพาะพื้นที่

### 🌐 API Mapping **New Update:2**

```
POST /api/plots         (Register Manual)
GET  /api/plots/me      (My Plots)
GET  /api/plots/{id}    (Detail)
```

---

## 3️⃣ STATION Entity (Core Entity)

### 📦 Data Model **New Update:2**

```typescript
STATION {
  station_id: number (PK)
  station_name: string
  province: string
  latitude: float
  longitude: float
  status: 'active' | 'inactive' | 'maintenance'
  created_at: datetime
}
```

### 🎯 Purpose **New Update:2**

แทน **"สถานีตรวจวัด"** ซึ่งเป็น **ศูนย์กลางของระบบ** Smart Agriculture

### 📌 Constraints **New Update:2**

- `latitude` / `longitude` ต้องอยู่ในช่วงที่ถูกต้อง
- `status`:
  - `active` - ใช้งานปกติ
  - `inactive` - ปิดการใช้งาน
  - `maintenance` - อยู่ระหว่างซ่อมบำรุง

### 🔗 Relationships **New Update:2**

- 1 STATION → N SENSOR
- 1 STATION → N ALERT

### 🌐 API Mapping **New Update:2**

```
GET  /api/stations
POST /api/stations        (Manager, Super User)
GET  /api/stations/{id}
PUT  /api/stations/{id}
```

---

## 4️⃣ SENSOR Entity

### 📦 Data Model **New Update:2**

```typescript
SENSOR {
  sensor_id: number (PK)
  station_id: number (FK → STATION)
  sensor_type: string
  status: 'active' | 'inactive' | 'maintenance'
  installed_at: datetime
}
```

### 🎯 Purpose **New Update:2**

แทนอุปกรณ์ **IoT / Sensor** จริงที่ติดตั้งอยู่ในแต่ละสถานี

### 📌 Constraints **New Update:2**

- `sensor_type` เช่น:
  - `temperature`
  - `humidity`
  - `soil_moisture`
  - `rainfall`
  - `wind_speed`

- `status`:
  - `active` - ทำงานปกติ
  - `inactive` - ปิดใช้งาน
  - `maintenance` - ซ่อมบำรุง

### 🔗 Relationships **New Update:2**

- SENSOR belongs to STATION
- SENSOR generates SENSOR_DATA
- SENSOR triggers ALERT

### 🌐 API Mapping **New Update:2**

```
GET  /api/sensors
POST /api/sensors        (Manager, Super User)
GET  /api/sensors/{id}
PUT  /api/sensors/{id}
```

---

## 5️⃣ SENSOR_DATA Entity (หัวใจระบบ 🔥)

### 📦 Data Model **New Update:2**

```typescript
SENSOR_DATA {
  data_id: bigint (PK)
  sensor_id: number (FK → SENSOR)
  value: float
  recorded_at: datetime
}
```

### 🎯 Purpose **New Update:2**

เก็บข้อมูลค่าที่ sensor ส่งเข้ามา  
ใช้สำหรับ:
- Dashboard
- Analytics
- Forecast / Machine Learning
- Trigger Alert

### 📌 Constraints **New Update:2**

- `sensor_id` ต้องมีอยู่จริง
- `recorded_at` ไม่ควรซ้ำใน sensor เดียวกัน
- `value` ต้องอยู่ในช่วงที่ sensor รองรับ

### 📈 Index (สำคัญมาก) **New Update:2**

```sql
INDEX idx_sensor_time (sensor_id, recorded_at)
```

### 🔗 Relationships **New Update:2**

- Many SENSOR_DATA → One SENSOR

### 🌐 API Mapping **New Update:2**

**สำหรับ IoT Device (Ingest):**
```
POST /api/telemetry        (รับ telemetry message แบบเต็ม)
```

**สำหรับ Frontend (Query):**
```
GET  /api/sensors/{id}/data?from=&to=  (query time-series)
GET  /api/stations/{id}/data/latest    (ดูค่าล่าสุดทุก sensor)
```

### 📡 Telemetry Ingest API **New Update:2**

**Endpoint:** `POST /api/telemetry`

**Request Body:**
```json
{
  "device_id": "IG502-ABC123",
  "ts": "2026-02-01T05:25:12Z",
  "boot_id": 1706760000,
  "seq": 1524,
  "msg_id": "IG502-ABC123-1706760000-1524",
  "data": {
    "wind_speed_ms": 3.42,
    "air_temp_c": 31.7,
    "air_rh_pct": 68.2,
    "air_pressure_hpa": 1006.3,
    "rain_rate_mmph": 0.0,
    "soil_moisture_pct": 24.1,
    "soil_temp_c": 29.3,
    "cabinet_temp_c": 44.8,
    "cabinet_rh_pct": 50.2,
    "solar_v": 18.6,
    "battery_v": 12.4,
    "gate_door": "0 | 1"
  },
  "sim_serial": "243038645779",
  "sim_rssi": -40
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telemetry data ingested successfully",
  "records_created": 11,
  "station_id": 5
}
```

### 🔄 Business Logic Flow

```
1. IoT Device ส่ง Telemetry Message
   ↓
2. Backend รับที่ POST /api/telemetry
   ↓
3. ค้นหา Station จาก device_id
   ↓
4. Parse "data" object → แยกเป็น sensor readings
   ↓
5. Map field names → sensor_type:
   • wind_speed_ms → sensor_type: "wind_speed"
   • air_temp_c → sensor_type: "air_temperature"
   • soil_moisture_pct → sensor_type: "soil_moisture"
   ฯลฯ
   ↓
6. สร้าง SENSOR_DATA records (1 message → หลาย records)
   ↓
7. ตรวจสอบ Threshold แต่ละค่า
   ↓
8. ถ้าค่าเกิน → สร้าง ALERT
   ↓
9. Return success response
```

### 🗺️ Field Mapping (Telemetry → Sensor Type)

| Telemetry Field | Sensor Type | Unit |
|----------------|-------------|------|
| `wind_speed_ms` | `wind_speed` | m/s |
| `air_temp_c` | `air_temperature` | °C |
| `air_rh_pct` | `air_humidity` | % |
| `air_pressure_hpa` | `air_pressure` | hPa |
| `rain_rate_mmph` | `rainfall` | mm/h |
| `soil_moisture_pct` | `soil_moisture` | % |
| `soil_temp_c` | `soil_temperature` | °C |
| `cabinet_temp_c` | `cabinet_temperature` | °C |
| `cabinet_rh_pct` | `cabinet_humidity` | % |
| `solar_v` | `solar_voltage` | V |
| `battery_v` | `battery_voltage` | V |
| `gate_door` | `gate_door` | 0 | 1 |

---

## 6️⃣ THRESHOLD Entity

### 📦 Data Model

```typescript
THRESHOLD {
  threshold_id: number (PK)
  sensor_type: string (UNIQUE)
  min_value: float
  max_value: float
  created_by: number (FK → USER)
  updated_at: datetime
}
```

### 🎯 Purpose

กำหนดเกณฑ์**ค่าปกติ / ผิดปกติ** ของ sensor แต่ละประเภท

### 📌 Constraints

- 1 `sensor_type` → 1 threshold (UNIQUE)
- `min_value` < `max_value`
- แก้ไขได้เฉพาะ **Super User**

### 🔗 Relationships

- USER defines THRESHOLD

### 🌐 API Mapping

```
GET  /api/thresholds
POST /api/thresholds        (Super User Only)
PUT  /api/thresholds/{id}   (Super User Only)
```

---

## 7️⃣ ALERT Entity

### 📦 Data Model

```typescript
ALERT {
  alert_id: number (PK)
  station_id: number (FK → STATION)
  sensor_id: number (FK → SENSOR)
  alert_type: string
  alert_message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  created_at: datetime
  is_acknowledged: boolean
}
```

### 🎯 Purpose

แจ้งเตือนเหตุการณ์ผิดปกติในระบบ  
ใช้สำหรับ **monitoring แบบ real-time** และเก็บเป็นประวัติ

### 📌 Constraints

- `severity`:
  - `LOW` - แจ้งเตือนเบา
  - `MEDIUM` - ต้องติดตาม
  - `HIGH` - ต้องดำเนินการทันที

- `is_acknowledged` ค่าเริ่มต้น = `false`

### 🔗 Relationships

- SENSOR triggers ALERT
- STATION generates ALERT
- USER acknowledges ALERT

### 🌐 API Mapping

```
GET /api/alerts
PUT /api/alerts/{id}/ack
```

**📌 ❌ ไม่อนุญาต DELETE** (เก็บเป็น log)

---

## 🔐 Role-Based Access Control (สรุป)

### Access Control Matrix

| Function / Feature | User | Manager | Super User |
|--------------------|------|---------|------------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Sensor Data | ✅ | ✅ | ✅ |
| View Alert | ✅ | ✅ | ✅ |
| Manage Station | ❌ | ✅ | ✅ |
| Manage Sensor | ❌ | ✅ | ✅ |
| Configure Threshold | ❌ | ❌ | ✅ |
| Manage User | ❌ | ❌ | ✅ |

---

## 🌐 API Endpoints Summary

### Authentication

```
POST /api/auth/login
POST /api/auth/logout
```

### Users (Super User Only)

```
GET  /api/users
GET  /api/users/{id}
POST /api/users
PUT  /api/users/{id}
```

### Roles (Read-only)

```
GET /api/roles
```

### Stations

```
GET  /api/stations
GET  /api/stations/{id}
POST /api/stations          (Manager, Super User)
PUT  /api/stations/{id}     (Manager, Super User)
```

### Sensors

```
GET  /api/sensors
GET  /api/sensors/{id}
POST /api/sensors           (Manager, Super User)
PUT  /api/sensors/{id}      (Manager, Super User)
```

### Sensor Data

```
GET  /api/sensors/{id}/data?from=&to=
POST /api/sensors/{id}/data
```

### Alerts

```
GET  /api/alerts
GET  /api/alerts?station_id={id}
GET  /api/alerts/{id}
PUT  /api/alerts/{id}/ack
```

### Thresholds (Super User Only)

```
GET  /api/thresholds
POST /api/thresholds
PUT  /api/thresholds/{id}
```

---

## 📊 API Design Principles

### 1. RESTful Standards

- ใช้ HTTP Methods ตามความหมาย:
  - `GET` - ดึงข้อมูล
  - `POST` - สร้างข้อมูลใหม่
  - `PUT` - แก้ไขข้อมูล
  - `DELETE` - ลบข้อมูล (ไม่ใช้ใน Alert)

### 2. Resource-based URLs

```
/api/{resource}
/api/{resource}/{id}
/api/{resource}/{id}/{sub-resource}
```

### 3. Query Parameters สำหรับ Filter

```
/api/alerts?station_id=1
/api/sensors/{id}/data?from=2026-01-01&to=2026-01-31
```

### 4. Response Format (JSON)

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### 5. Error Handling

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access denied"
  }
}
```

---

## 🔄 Business Logic Flow

### Flow 1: ข้อมูล Sensor เข้าระบบ

```
1. POST /api/sensors/{id}/data
2. บันทึกลง SENSOR_DATA
3. ดึง THRESHOLD ตาม sensor_type
4. ตรวจสอบ value vs threshold
5. ถ้าเกิน → สร้าง ALERT
6. Response success
```

### Flow 2: ผู้ใช้ดู Dashboard

```
1. GET /api/stations
2. JOIN SENSOR count
3. JOIN ALERT count (where is_acknowledged = false)
4. คำนวณ status จาก alerts
5. Response station list with summary
```

### Flow 3: Super User ตั้งค่า Threshold

```
1. Login (ตรวจ role = SUPER_USER)
2. POST /api/thresholds
3. Validate min < max
4. บันทึกลง THRESHOLD
5. Response success
```

---

## 🎯 Data Model Best Practices

### 1. ใช้ Enum สำหรับ Status

```typescript
status: 'active' | 'inactive' | 'maintenance'
```

ไม่ใช้ string เปล่า ๆ

### 2. Timestamp ทุก Entity

```typescript
created_at: datetime
updated_at: datetime (optional)
```

### 3. Foreign Key Constraints

```sql
FOREIGN KEY (station_id) REFERENCES Station(station_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE
```

### 4. Index สำหรับ Time-series

```sql
INDEX (sensor_id, recorded_at)
```

### 5. Soft Delete (สำหรับ Alert)

ไม่ลบจริง แค่ mark เป็น `is_acknowledged`

---

## 📌 OUTPUT ของ STEP 7

หลังจบ STEP 7 จะได้:

1. ✅ Data Model แต่ละ Entity ที่พร้อมใช้งาน
2. ✅ API Endpoints ครบทุก Use Case
3. ✅ Access Control Matrix ชัดเจน
4. ✅ Business Logic Flow สำหรับแต่ละ Operation
5. ✅ พร้อม Implement Backend และ Frontend

---

## 📝 หมายเหตุสำหรับ AI Agent

**เมื่อพัฒนา API:**

1. ตรวจสอบ Access Control ทุก Endpoint
2. Validate Input ตาม Constraints
3. Handle Error อย่างชัดเจน
4. Response Format เป็น JSON เสมอ
5. ใช้ HTTP Status Code ให้ถูกต้อง:
   - `200` - Success
   - `201` - Created
   - `400` - Bad Request
   - `401` - Unauthorized
   - `403` - Forbidden
   - `404` - Not Found
   - `500` - Internal Server Error

**ห้ามสร้าง Endpoint ที่:**
- ไม่มี Use Case รองรับ
- ไม่มีใน API Mapping นี้
- ไม่มีการตรวจสอบสิทธิ์

---

**Next Step**: พร้อม Implement Backend และ Frontend Dashboard

---

## 🔥 บทสรุป STEP 7

STEP 7 เป็นการนำ ERD มาแปลงเป็น **Data Model ที่ใช้งานจริง**ในระบบ Backend โดยกำหนด:

- ✅ โครงสร้างข้อมูล
- ✅ Constraint
- ✅ Business Logic
- ✅ API Mapping
- ✅ Access Control

เพื่อให้ทีมสามารถพัฒนา **Backend, Frontend และ Demo ระบบ**  
บนโครงสร้างเดียวกันได้อย่างเป็นระบบและขยายต่อได้ในอนาคต 🚀

**New Update:2 (13/02/2026)**
