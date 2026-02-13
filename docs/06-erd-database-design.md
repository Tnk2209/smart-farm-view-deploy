# STEP 6: ERD (Entity Relationship Diagram)

> **แผนที่ฐานข้อมูล**  
> ออกแบบโครงสร้างฐานข้อมูลที่รองรับทุก Use Case และ Data Flow

---

## 🎯 เป้าหมายของ STEP 6

ตอบคำถาม **4 อย่างหลัก ๆ:**

1. ระบบนี้ต้องเก็บข้อมูล**อะไร**บ้าง
2. ข้อมูลแต่ละก้อนหน้าตาเป็น**ยังไง**
3. ข้อมูลไหน**เกี่ยวข้อง**กับข้อมูลไหน
4. ความสัมพันธ์เป็นแบบ **1–1, 1–N หรือ N–N**

---

## 📌 ERD อ้างอิงมาจาก

- **Use Case** (STEP 4) - รู้ว่าต้องเก็บข้อมูลอะไร
- **DFD Level 1** (STEP 5) - รู้ว่าข้อมูลไหลอย่างไร
- **Data Store** (D1-D4) - เป็นจุดเริ่มต้นของ Entity

---

## 🔍 เทคนิคดึง Entity

ดูจาก:
- **คำนามใน Use Case**
- **Data Store ใน DFD**
- **สิ่งที่ "ต้องเก็บลง DB แน่ ๆ"**

---

## 📦 Entity หลักทั้งหมด (7 Entities)

### ✅ Core Entities (หัวใจระบบ)

1. **Station** - สถานีเกษตร
2. **Sensor** - อุปกรณ์ตรวจวัด
3. **SensorData** - ข้อมูลการวัดค่า (Time-series)
4. **Alert** - การแจ้งเตือน

### ✅ System / Control Entities (จัดการระบบ)

5. **User** - ผู้ใช้งาน
6. **Role** - บทบาท / สิทธิ์
7. **Threshold** - เกณฑ์การวัด

---

## 🏭 Entity 1: Station

**แทน:** "สถานีเกษตร / ฟาร์ม / จุดตรวจ"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **station_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| station_name | VARCHAR(255) | ชื่อสถานี | NOT NULL |
| province | VARCHAR(100) | จังหวัด | NOT NULL |
| latitude | FLOAT | พิกัดละติจูด | NOT NULL |
| longitude | FLOAT | พิกัดลองจิจูด | NOT NULL |
| status | ENUM | สถานะสถานี | 'active', 'inactive', 'maintenance' |
| created_at | DATETIME | วันที่สร้าง | DEFAULT CURRENT_TIMESTAMP |

### 📌 ที่มา

- **Concept:** Station-first Architecture
- **DFD:** D4 Station DB
- **Use Case:** View Dashboard, View Station Detail

---

## 🧑‍💻 Entity 2: User **New Update:2**

**แทน:** "ผู้ใช้งานระบบ"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **user_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| username | VARCHAR(50) | ชื่อผู้ใช้ | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | รหัสผ่าน (Hashed) | NOT NULL |
| email | VARCHAR(100) | อีเมล | UNIQUE, NOT NULL |
| **role_id** | INT | Foreign Key → Role | FK, NOT NUL **New Update:2**
| status | ENUM | สถานะผู้ใช้ | 'pending', 'active', 'inactive', 'suspended' | 
| created_at | DATETIME | วันที่สร้าง | DEFAULT CURRENT_TIMESTAMP |
| **phone** | VARCHAR(20) | เบอร์โทรศัพท์ | - |
| **full_name** | VARCHAR(100) | ชื่อ-นามสกุล | - |

### 📌 ที่มา

- **Use Case:** Login, Manage Users
- **DFD:** D1 User Database

> **หมายเหตุ:** ใช้ควบคุมสิทธิ์ ไม่ผูกกับ Station โดยตรงใน demo

---

## 🏷️ Entity 3: Role

**แทน:** "บทบาทและสิทธิ์การใช้งาน"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **role_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| role_name | VARCHAR(50) | ชื่อบทบาท | UNIQUE, NOT NULL |

### ค่าที่กำหนดไว้:

- `USER`
- `MANAGER`
- `SUPER_USER`

### 📌 ที่มา

- **Requirement:** Priority Level 1 - User & Role
- **Use Case:** Login, Access Control

---

## 🌡️ Entity 4: Sensor

**แทน:** "อุปกรณ์ตรวจวัดในแต่ละสถานี"

> **Sensor สังกัด Station**

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **sensor_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| **station_id** | INT | Foreign Key → Station | FK, NOT NULL |
| sensor_type | VARCHAR(50) | ประเภท Sensor | NOT NULL |
| status | ENUM | สถานะ Sensor | 'active', 'inactive', 'maintenance' |
| installed_at | DATETIME | วันที่ติดตั้ง | DEFAULT CURRENT_TIMESTAMP |

### รายการ sensor_type ทั้งหมด:

#### Weather & Environment (สภาพอากาศและสิ่งแวดล้อม)
- `wind_speed_ms` - ความเร็วลม (m/s)
- `air_temp_c` - อุณหภูมิอากาศ (°C)
- `air_rh_pct` - ความชื้นในอากาศ (%)
- `air_pressure_hpa` - ความดันบรรยากาศ (hPa)
- `rain_rate_mmph` - ปริมาณน้ำฝน (mm/h)

#### Soil Monitoring (ตรวจวัดดิน)
- `soil_moisture_pct` - ความชื้นในดิน (%)
- `soil_temp_c` - อุณหภูมิในดิน (°C)

#### Cabinet/Station Monitoring (ตรวจวัดตู้/สถานี)
- `cabinet_temp_c` - อุณหภูมิในตู้ (°C)
- `cabinet_rh_pct` - ความชื้นในตู้ (%)

#### Power & Energy (พลังงาน)
- `solar_v` - แรงดันแสงอาทิตย์ (Volt)
- `battery_v` - แรงดันแบตเตอรี่ (Volt)

#### Network & Connectivity (เครือข่าย) - Optional
- `sim_serial` - หมายเลขซิมการ์ด ICCID/IMEI (string)
- `sim_rssi` - ความแรงสัญญาณ (dBm)

#### Access Control (ควบคุมการเข้าออก)
- `gate_door` - สถานะประตูรั้ว (0=ปิด, 1=เปิด)

### 📌 ที่มา

- **Concept:** Station-first → Sensor belongs to Station
- **Use Case:** View Station Detail, View Sensor Data

> **หมายเหตุ:** Sensor ไม่มีค่า realtime เป็น metadata เท่านั้น

---

## 📊 Entity 5: SensorData

**แทน:** "ข้อมูลการวัดค่าตามเวลา (Time-series)"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **data_id** | BIGINT | Primary Key | PK, AUTO_INCREMENT |
| **sensor_id** | INT | Foreign Key → Sensor | FK, NOT NULL |
| value | FLOAT | ค่าที่วัดได้ | NOT NULL |
| value_string | VARCHAR(255) | ค่าแบบข้อความ (สำหรับ sim_serial) | NULL |
| recorded_at | DATETIME | เวลาที่บันทึก | NOT NULL, INDEX |

### 📌 หมายเหตุเกี่ยวกับ Data Type:

- **ค่าตัวเลข (Numeric):** ใช้ field `value` (เช่น อุณหภูมิ, ความชื้น, แรงดัน)
- **ค่าข้อความ (String):** ใช้ field `value_string` (เช่น `sim_serial`)
- **ค่า Boolean:** ใช้ field `value` โดย 0 = False, 1 = True (เช่น `gate_door`)
- **ค่า NULL:** กรณี sensor บางตัวไม่ส่งข้อมูล field ใดก็ไม่ต้องบันทึก record นั้น

### 🔥 Index สำคัญ:

```sql
INDEX idx_sensor_time (sensor_id, recorded_at)
```

### 📌 ที่มา

- **Requirement:** Priority Level 1 - Data Ingestion
- **DFD:** D2 Sensor Data Database
- **Use Case:** View Sensor Data (กราฟ time-series)

### 🔄 Data Flow จาก Telemetry → Database:

**ข้อมูลดิบที่รับมา (Telemetry):**
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
    "gate_door": 0
  },
  "sim_serial": "243038645779",
  "sim_rssi": -40
}
```

**ข้อมูลหลัง Normalization (ใน Database):**

1 Telemetry Message → **หลาย SensorData Records**

| data_id | sensor_id | value | recorded_at |
|---------|-----------|-------|-------------|
| 1001 | 15 (wind_speed_ms) | 3.42 | 2026-02-01 05:25:12 |
| 1002 | 16 (air_temp_c) | 31.7 | 2026-02-01 05:25:12 |
| 1003 | 17 (air_rh_pct) | 68.2 | 2026-02-01 05:25:12 |
| 1004 | 18 (air_pressure_hpa) | 1006.3 | 2026-02-01 05:25:12 |
| 1005 | 19 (rain_rate_mmph) | 0.0 | 2026-02-01 05:25:12 |
| 1006 | 20 (soil_moisture_pct) | 24.1 | 2026-02-01 05:25:12 |
| 1007 | 21 (soil_temp_c) | 29.3 | 2026-02-01 05:25:12 |
| 1008 | 22 (cabinet_temp_c) | 44.8 | 2026-02-01 05:25:12 |
| 1009 | 23 (cabinet_rh_pct) | 50.2 | 2026-02-01 05:25:12 |
| 1010 | 24 (solar_v) | 18.6 | 2026-02-01 05:25:12 |
| 1011 | 25 (battery_v) | 12.4 | 2026-02-01 05:25:12 |
| 1012 | 26 (gate_door) | 0 | 2026-02-01 05:25:12 |
| 1013 | 27 (sim_rssi) | -40 | 2026-02-01 05:25:12 |
| ... | ... | ... | ... |

**เหตุผล:** 
- ทำให้ query time-series ได้เร็ว (1 sensor, time range)
- แต่ละ sensor มี data type และ unit ต่างกัน
- รองรับการเพิ่ม sensor ใหม่ได้ง่าย

> **หมายเหตุ:** Backend จะ **parse และ flatten** telemetry message ให้เป็น normalized records

---

## 🚨 Entity 6: Alert **New Update:2**

**แทน:** "การแจ้งเตือนความผิดปกติ"

> **ผูกทั้ง Sensor และ Station**

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **alert_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| **station_id** | INT | Foreign Key → Station | FK, NOT NULL |
| **sensor_id** | INT | Foreign Key → Sensor | FK, NULL (สำหรับ heartbeat) | **New Update:2**
| alert_type | ENUM | ประเภทการแจ้งเตือน | 'THRESHOLD', 'DEADMAN', 'HEARTBEAT' | **New Update:2**
| severity | ENUM | ระดับความรุนแรง | 'LOW', 'MEDIUM', 'HIGH' |
| alert_message | TEXT | ข้อความแจ้งเตือน | NOT NULL |
| notification_mode | ENUM | รูปแบบการแจ้งเตือน | 'SINGLE', 'MULTI' | **New Update:2**
| created_at | DATETIME | เวลาที่เกิด | DEFAULT CURRENT_TIMESTAMP |
| is_acknowledged | BOOLEAN | รับทราบแล้วหรือไม่ | DEFAULT FALSE |
| acknowledged_at | DATETIME | เวลาที่รับทราบ | NULL | **New Update:2**
| acknowledged_by | INT | FK → User (ใครรับทราบ) | FK, NULL | **New Update:2**

### Alert Types **New Update:2**

| Alert Type | คำอธิบาย | Use Case |
|------------|----------|----------|
| **THRESHOLD** | ค่าเกินกำหนด (min/max) | Temperature > 40°C | **New Update:2**
| **DEADMAN** | ไม่ได้รับข้อมูลเกินระยะเวลากำหนด | Sensor offline > 30 min | **New Update:2**
| **HEARTBEAT** | Gateway/Station ไม่ตอบสนอง | Station down | **New Update:2**

### Notification Mode **New Update:2**

| Mode | พฤติกรรม |
|------|----------|
| **SINGLE** | แจ้งเตือนครั้งเดียว แล้วหยุด | **New Update:2**
| **MULTI** | แจ้งเตือนซ้ำทุก X นาทีจนกว่าจะ acknowledge | **New Update:2**

### 📌 ที่มา

- **Requirement:** Priority Level 2 - Alert & Notification
- **DFD:** D3 Alert Database
- **Use Case:** View Alert, Receive Notification

> **หมายเหตุ:** Dashboard ดู alert "ระดับสถานี" ได้ทันที ไม่ต้อง join ย้อนซับซ้อน

---

## 🎚️ Entity 7: Threshold

**แทน:** "เกณฑ์การวัดค่าปกติ / ผิดปกติ"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **threshold_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| sensor_type | VARCHAR(50) | ประเภท Sensor | UNIQUE, NOT NULL |
| min_value | FLOAT | ค่าต่ำสุดที่ปกติ | NOT NULL |
| max_value | FLOAT | ค่าสูงสุดที่ปกติ | NOT NULL |
| **created_by** | INT | Foreign Key → User | FK |
| updated_at | DATETIME | แก้ไขล่าสุด | ON UPDATE CURRENT_TIMESTAMP |

### Constraint:

- `min_value < max_value`
- `sensor_type` ต้อง UNIQUE (1 type มี 1 threshold)

### 📌 ที่มา

- **Use Case:** Configure Threshold
- **Logic:** ใช้ในการตรวจสอบค่า Sensor Data

> **หมายเหตุ:** ใช้ร่วมกันทั้งระบบ (ไม่ผูก sensor ตัวเดียว)

---

## 📝 Entity 8: FarmPlot (แปลงนา) **New Update:2**

**แทน:** "ข้อมูลแปลงนาของเกษตรกร"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **plot_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| **user_id** | INT | Foreign Key → User | FK, NOT NULL |
| lat | DOUBLE | ละติจูด | NOT NULL |
| lon | DOUBLE | ลองจิจูด | NOT NULL |
| utm_coords | VARCHAR(50) | พิกัด UTM | NOT NULL |
| **nearest_station_id** | INT | FK → Station | FK, NULL |
| land_title_deed | VARCHAR(50) | เลขโฉนด | - |
| area_size_rai | FLOAT | ขนาดพื้นที่ (ไร่) | - |
| created_at | DATETIME | วันที่ลงทะเบียน | DEFAULT CURRENT_TIMESTAMP |

---

## 🛡️ Entity 9: AuditLog **New Update:2**

**แทน:** "บันทึกการกระทำสำคัญในระบบ"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **log_id** | BIGINT | Primary Key | PK, AUTO_INCREMENT |
| **user_id** | INT | FK → User | FK, NOT NULL |
| action | VARCHAR(50) | การกระทำ (e.g. OPEN_LOCK) | NOT NULL |
| resource_id | INT | ID ของสิ่งที่ถูกกระทำ | - |
| details | JSON | รายละเอียดเพิ่มเติม | NULL |
| timestamp | DATETIME | เวลาที่เกิด | DEFAULT CURRENT_TIMESTAMP |

---

## 🎫 Entity 10: SupportTicket **New Update:2**

**แทน:** "การแจ้งซ่อมและดูแล (QR Code Support)"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **ticket_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| **user_id** | INT | FK → User (ผู้แจ้ง) | FK, NOT NULL |
| **station_id** | INT | FK → Station | FK, NULL |
| qr_code | VARCHAR(100) | QR Code ที่ตู้ระบุ Station | UNIQUE, NOT NULL | **New Update:2**
| issue_type | ENUM | ประเภทปัญหา | 'HARDWARE', 'SOFTWARE', 'NETWORK', 'POWER', 'OTHER' | **New Update:2**
| title | VARCHAR(100) | หัวข้อแจ้งซ่อม | NOT NULL |
| description | TEXT | รายละเอียดปัญหา | NULL | **New Update:2**
| severity | ENUM | ความรุนแรง | 'NORMAL', 'URGENT', 'CRITICAL' | **New Update:2**
| status | ENUM | สถานะ | 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED' | **New Update:2**
| assigned_to | INT | FK → User (ช่างที่รับผิดชอบ) | FK, NULL | **New Update:2**
| created_at | DATETIME | วันที่แจ้ง | DEFAULT CURRENT_TIMESTAMP |
| resolved_at | DATETIME | วันที่แก้ไขเสร็จ | NULL | **New Update:2**
| sla_deadline | DATETIME | เวลาที่ต้องแก้ไขให้เสร็จ | NULL | **New Update:2**
| resolution_note | TEXT | บันทึกการแก้ไข | NULL | **New Update:2**

### SLA (Service Level Agreement) **New Update:2**

| Severity | Response Time | Resolution Time |
|----------|---------------|----------------|
| **NORMAL** | 4 ชั่วโมง | 3 วัน | **New Update:2**
| **URGENT** | 2 ชั่วโมง | 1 วัน | **New Update:2**
| **CRITICAL** | ทันที | 24 ชั่วโมง | **New Update:2**

### QR Code Flow **New Update:2**
```
1. Farmer สแกน QR Code ที่ตู้ Control
2. เปิดหน้า Web Form (Pre-fill station_id จาก QR)
3. กรอกรายละเอียดปัญหา
4. Submit → สร้าง Ticket
5. ระบบคำนวณ SLA Deadline
6. แจ้งเตือนช่างผ่านระบบ
7. ช่างรับงานและแก้ไข
8. Update status → Resolved
``` 
**New Update:2**

---

## 🎬 Entity 11: MediaContent **New Update:2**

**แทน:** "สื่อการเรียนรู้ดิจิทัล"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **media_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| title | VARCHAR(255) | ชื่อสื่อ | NOT NULL |
| description | TEXT | คำอธิบาย | NULL | **New Update:2**
| url | TEXT | ลิงก์ (YouTube/PDF/Cloud) | NOT NULL |
| thumbnail_url | TEXT | ลิงก์รูป Preview | NULL | **New Update:2**
| type | ENUM | ประเภท | 'VTR', 'INFOGRAPHIC', 'MANUAL', 'DOCUMENT' | **New Update:2**
| category | VARCHAR(50) | หมวดหมู่ | 'Disease', 'Pest', 'Irrigation', 'General' | **New Update:2**
| file_format | VARCHAR(20) | นามสกุลไฟล์ | 'mp4', 'pdf', 'jpg', 'png' | **New Update:2**
| duration_minutes | INT | ระยะเวลา (สำหรับ VTR) | NULL | **New Update:2**
| views_count | INT | จำนวนครั้งที่เปิดดู | DEFAULT 0 | **New Update:2**
| status | ENUM | สถานะ | 'DRAFT', 'PUBLISHED', 'ARCHIVED' | **New Update:2**
| created_at | DATETIME | วันที่สร้าง | DEFAULT CURRENT_TIMESTAMP | **New Update:2**
| published_at | DATETIME | วันที่เผยแพร่ | NULL | **New Update:2**

### Media Types **New Update:2**

| Type | คำอธิบาย | ตัวอย่าง |
|------|----------|----------|
| **VTR** | วีดีโอสอนงาน (15 นาที, Full HD) | YouTube/Cloud Storage | **New Update:2**
| **INFOGRAPHIC** | รูปภาพข้อมูล (1:1, 16:9) | JPG/PNG | **New Update:2**
| **MANUAL** | คู่มือการใช้งานดิจิทัล | PDF | **New Update:2**
| **DOCUMENT** | เอกสารแผ่นพับดิจิทัล | PDF | **New Update:2**

## 🎯 Entity 12: AlertTarget **New Update:2**

**แทน:** "กลุ่มเป้าหมายที่จะได้รับการแจ้งเตือน"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **target_id** | INT | Primary Key | PK, AUTO_INCREMENT | **New Update:2**
| **alert_id** | INT | FK → Alert | FK, NOT NULL | **New Update:2**
| target_type | ENUM | ประเภทเป้าหมาย | 'PROVINCE', 'DISTRICT', 'SUBDISTRICT', 'INDIVIDUAL', 'GROUP' | **New Update:2**
| target_value | VARCHAR(100) | ชื่อพื้นที่ หรือ user_id/group_id | NOT NULL | **New Update:2**
| notification_channel | ENUM | ช่องทางแจ้งเตือน | 'PUSH', 'SMS', 'EMAIL', 'ALLRICE_APP' | **New Update:2**
| sent_at | DATETIME | เวลาที่ส่งแจ้งเตือน | NULL | **New Update:2**
| delivery_status | ENUM | สถานะการส่ง | 'PENDING', 'SENT', 'FAILED', 'READ' | **New Update:2**

### Target Types **New Update:2**

| Type | คำอธิบาย | ตัวอย่าง |
|------|----------|----------|
| **PROVINCE** | แจ้งทั้งจังหวัด | 'Chiang Mai' | **New Update:2**
| **DISTRICT** | แจ้งทั้งอำเภอ | 'Mae Rim' | **New Update:2**
| **SUBDISTRICT** | แจ้งทั้งตำบล | 'Rim Tai' | **New Update:2**
| **INDIVIDUAL** | แจ้งเฉพาะบุคคล | user_id: 123 | **New Update:2**
| **GROUP** | แจ้งกลุ่ม | group_id: 5 (เกษตรกรภาคเหนือ) | **New Update:2**

### Notification Channels **New Update:2**

| Channel | คำอธิบาย |
|---------|----------|
| **PUSH** | Push Notification บน Web/App | **New Update:2**
| **SMS** | ส่ง SMS | **New Update:2**
| **EMAIL** | ส่ง Email | **New Update:2**
| **ALLRICE_APP** | แจ้งเตือนผ่าน ALLRice App ของกรมการข้าว | **New Update:2**

---

## 🔗 Relationships (ความสัมพันธ์) **New Update:2**

### ตารางสรุป:

| From | Relation | To | เหตุผล |
|------|----------|-----|--------|
| **Role** | 1:N | **User** | แยกสิทธิ์ |
| **Station** | 1:N | **Sensor** | 1 สถานีมีหลาย sensor |
| **Sensor** | 1:N | **SensorData** | Time-series |
| **Station** | 1:N | **Alert** | ดู alert ระดับสถานี |
| **Sensor** | 1:N | **Alert** | รู้ว่ามาจาก sensor ไหน |
| **User** | 1:N | **Threshold** | ใครตั้งค่า |
| **User** | 1:N | **FarmPlot** | เกษตรกรมีหลายแปลงได้ | **New Update:2**
| **User** | 1:N | **AuditLog** | เก็บประวัติการใช้ | **New Update:2**
| **User** | 1:N | **SupportTicket** | ใครแจ้งซ่อม | **New Update:2**
| **Alert** | 1:N | **AlertTarget** | 1 Alert แจ้งหลายกลุ่มได้ | **New Update:2**

---

## 📊 ERD Diagram (Conceptual) **New Update:2**

```
┌──────────────┐
│     Role     │
│──────────────│
│ role_id (PK) │
│ role_name    │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────▼───────┐         ┌──────────────┐
│     User     │         │   Threshold  │
│──────────────│         │──────────────│
│ user_id (PK) │◄────────│threshold_id  │
│ username     │  1   N  │ sensor_type  │
│ role_id (FK) │         │ min_value    │
│ status       │         │ max_value    │
│ phone        │         │ created_by   │
└─┬─┬─┬────────┘         └──────────────┘
  │ │ │
  │ │ └───────────────┐
  │ └───────┐         │ 1:N
  │ 1:N     │ 1:N     ▼
  ▼         ▼    ┌──────────────┐
┌────────┐ ┌─────┴──┐  │   AuditLog   │
│FarmPlot│ │Ticket  │  │──────────────│
│────────│ │────────│  │ log_id (PK)  │
│plot_id │ │tick_id │  │ action       │
│coords  │ │status  │  └──────────────┘
└────────┘ └────────┘

┌──────────────┐
│   Station    │
│──────────────│
│station_id(PK)│<────────┐ (Nearest)
│ station_name │         │
│ province     │         │
│ latitude     │         │
│ longitude    │         │
│ status       │         │
└──────┬───────┘         │
       │ 1               │
       │                 │
       │ N               │
┌──────▼───────┐         │
│    Sensor    │         │
│──────────────│         │
│ sensor_id(PK)│         │
│station_id(FK)│         │
│ sensor_type  │         │
│ status       │         │
└──────┬───────┘         │
       │ 1               │
       │                 │
       ├────────────┬────┴────────┐
       │ N          │ N           │
┌──────▼─────────┐  │    ┌────────▼──────┐
│  SensorData    │  │    │     Alert     │
│────────────────│  │    │───────────────│
│ data_id (PK)   │  │    │ alert_id (PK) │
│ sensor_id (FK) │  │    │station_id(FK) │
│ value          │  │    │ sensor_id(FK) │
│ recorded_at    │  │    │ alert_type    │
└────────────────┘  │    │ severity      │
                    │    │ is_acknowledged│
                    │    └───────────────┘
                    │
                    └──────► Alert
                       (N:1)
```

---

## 📌 Normalization Level

ระบบออกแบบตาม **3NF (Third Normal Form)**:

- ✅ ไม่มี Repeating Groups
- ✅ ไม่มี Partial Dependency
- ✅ ไม่มี Transitive Dependency

---

## 🎯 ข้อสังเกตสำคัญ

### 1. Station-first Design

```
Station (1) → (N) Sensor → (N) SensorData
```

การ query ใด ๆ ควรเริ่มจาก Station

### 2. Alert ผูกทั้ง Station และ Sensor

ทำให้:
- Query Alert by Station ได้เร็ว
- รู้ว่า Alert มาจาก Sensor ไหน

### 3. Threshold แยกตาม sensor_type

- ไม่ผูกกับ Sensor ตัวเดียว
- ทุก Sensor ประเภทเดียวกันใช้ Threshold เดียวกัน

### 4. Time-series Data (SensorData)

- ข้อมูลปริมาณมาก
- ต้องมี Index ที่ (sensor_id, recorded_at)
- ควรพิจารณา Partition ในอนาคต

---

## 📌 OUTPUT ของ STEP 6

หลังจบ STEP 6 จะได้:

1. ✅ โครงสร้างฐานข้อมูลครบทุก Entity
2. ✅ ความสัมพันธ์ชัดเจน (1:N, N:N)
3. ✅ Field และ Constraint ครบถ้วน
4. ✅ พร้อมแปลงเป็น SQL Schema
5. ✅ พร้อมนำไปออกแบบ API (STEP 7)

---

## 📝 หมายเหตุสำหรับ AI Agent

**เมื่อทำงานกับ Database:**

- ห้ามเปลี่ยนโครงสร้าง Entity ที่กำหนดไว้
- ห้ามเพิ่ม Field ที่ไม่มีใน ERD
- ถ้าต้องการเพิ่ม Field ใหม่ → ต้องอัพเดท ERD ก่อน
- ทุก Query ต้องเคารพ Relationship ที่กำหนด

**การตั้งชื่อ:**
- Table: **PascalCase** (Station, SensorData)
- Column: **snake_case** (station_id, sensor_type)
- Foreign Key: **table_id** (station_id, sensor_id)

---

**Next Step**: [07-data-model-api-design.md](07-data-model-api-design.md) - แปลง ERD เป็น Data Model และออกแบบ API

---

**หมายเหตุ:**  
ERD นี้เป็น "สัญญา" ของโครงสร้างฐานข้อมูล  
ทุก Feature ที่พัฒนาต้องอ้างอิง ERD นี้เท่านั้น

**New Update:2 (13/02/2026)**
