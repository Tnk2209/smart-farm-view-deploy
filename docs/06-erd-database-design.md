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

## 🧑‍💻 Entity 2: User

**แทน:** "ผู้ใช้งานระบบ"

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **user_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| username | VARCHAR(50) | ชื่อผู้ใช้ | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | รหัสผ่าน (Hashed) | NOT NULL |
| email | VARCHAR(100) | อีเมล | UNIQUE, NOT NULL |
| **role_id** | INT | Foreign Key → Role | FK, NOT NULL |
| status | ENUM | สถานะผู้ใช้ | 'active', 'inactive', 'suspended' |
| created_at | DATETIME | วันที่สร้าง | DEFAULT CURRENT_TIMESTAMP |

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

### ตัวอย่าง sensor_type:

- `temperature`
- `humidity`
- `soil_moisture`
- `rainfall`
- `wind_speed`

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
| recorded_at | DATETIME | เวลาที่บันทึก | NOT NULL, INDEX |

### 🔥 Index สำคัญ:

```sql
INDEX idx_sensor_time (sensor_id, recorded_at)
```

### 📌 ที่มา

- **Requirement:** Priority Level 1 - Data Ingestion
- **DFD:** D2 Sensor Data Database
- **Use Case:** View Sensor Data (กราฟ time-series)

> **หมายเหตุ:** Time-series data ปริมาณมาก ต้องมี Index

---

## 🚨 Entity 6: Alert

**แทน:** "การแจ้งเตือนความผิดปกติ"

> **ผูกทั้ง Sensor และ Station**

### Fields

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| **alert_id** | INT | Primary Key | PK, AUTO_INCREMENT |
| **station_id** | INT | Foreign Key → Station | FK, NOT NULL |
| **sensor_id** | INT | Foreign Key → Sensor | FK, NOT NULL |
| alert_type | VARCHAR(50) | ประเภทการแจ้งเตือน | NOT NULL |
| severity | ENUM | ระดับความรุนแรง | 'LOW', 'MEDIUM', 'HIGH' |
| alert_message | TEXT | ข้อความแจ้งเตือน | NOT NULL |
| created_at | DATETIME | เวลาที่เกิด | DEFAULT CURRENT_TIMESTAMP |
| is_acknowledged | BOOLEAN | รับทราบแล้วหรือไม่ | DEFAULT FALSE |

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

## 🔗 Relationships (ความสัมพันธ์)

### ตารางสรุป:

| From | Relation | To | เหตุผล |
|------|----------|-----|--------|
| **Role** | 1:N | **User** | แยกสิทธิ์ |
| **Station** | 1:N | **Sensor** | 1 สถานีมีหลาย sensor |
| **Sensor** | 1:N | **SensorData** | Time-series |
| **Station** | 1:N | **Alert** | ดู alert ระดับสถานี |
| **Sensor** | 1:N | **Alert** | รู้ว่ามาจาก sensor ไหน |
| **User** | 1:N | **Threshold** | ใครตั้งค่า |

---

## 📊 ERD Diagram (Conceptual)

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
└──────────────┘         │ created_by   │
                         └──────────────┘

┌──────────────┐
│   Station    │
│──────────────│
│station_id(PK)│
│ station_name │
│ province     │
│ latitude     │
│ longitude    │
│ status       │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────▼───────┐
│    Sensor    │
│──────────────│
│ sensor_id(PK)│
│station_id(FK)│
│ sensor_type  │
│ status       │
└──────┬───────┘
       │ 1
       │
       ├────────────┬─────────────┐
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
