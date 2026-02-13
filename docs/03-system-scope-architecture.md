# STEP 3: System Scope & Architecture (DEMO)

> **ทำให้ทุกคนในทีมเห็น "ภาพเดียวกัน" ของระบบ**  
> กำหนดขอบเขตชัดเจนก่อนแตกเป็น Use Case, DFD, ERD

---

## 🎯 เป้าหมายของ STEP 3

- ทำให้ทุกคนในทีมเห็น **"ภาพเดียวกัน"** ของระบบ
- อธิบายระบบให้คนทั่วไปเข้าใจได้ภายใน **2–3 นาที**
- กำหนดขอบเขตชัดเจนก่อนแตกเป็น Use Case, DFD, ERD
- ใช้เป็น **baseline** สำหรับออกแบบ Web Demo

---

## 🔎 คำถามหลักที่ STEP 3 ต้องตอบ

1. ระบบนี้ประกอบด้วย **component** อะไรบ้าง?
2. ข้อมูลไหลจาก**ไหน → ไปไหน**?
3. ผู้ใช้เข้ามาเกี่ยวข้องตรงจุดใดของระบบ?
4. อะไรอยู่**ใน scope** ของ demo และอะไรอยู่**นอก scope**?

---

## 🧠 HIGH-LEVEL SYSTEM OVERVIEW

ระบบ **Smart Agriculture Monitoring** นี้เป็นระบบเว็บสำหรับติดตาม  
**สถานีเกษตรอัจฉริยะ (Station)** ที่กระจายอยู่หลายพื้นที่ในประเทศไทย

### แนวคิดหลัก: Station-first Architecture

ลำดับการทำงานโดยภาพรวม:

```
Sensor (Mock Data) 
    ↓
API Layer
    ↓
Database
    ↓
Processing Logic
    ↓
Dashboard (Map-based)
    ↓
User (Drill-down: Country → Station → Sensor)
```

**ระบบรับข้อมูลจาก Sensor** ภายในแต่ละ Station (mock data)  
↓  
**ข้อมูลถูกส่งผ่าน API** เข้าสู่ Database  
↓  
**Logic Layer** ประมวลผลสถานะและตรวจจับความผิดปกติ  
↓  
**Web Dashboard** แสดงผลในรูปแบบ Map และ Station Overview  
↓  
**ผู้ใช้สามารถ drill-down** จากระดับประเทศ → Station → Sensor

---

## 🧱 SYSTEM COMPONENTS (ระดับกล่อง)

### 1️⃣ Data Source Layer

**Keyword จาก TOR:**
- Sensor
- IoT Gateway
- Modbus
- Environmental Data

**บทบาท:**
- เป็นแหล่งกำเนิดข้อมูลของระบบ
- สร้างข้อมูลเชิงเวลา (time-series)
- ข้อมูลถูกผูกอยู่ภายใต้แต่ละ Station

**Demo Scope:**
- ❌ ไม่มี hardware จริง
- ✅ ใช้ mock data generator แทน sensor
- ✅ จำลองข้อมูลหลาย Station (ประมาณ 40 แห่ง)

---

### 2️⃣ Data Ingestion / API Layer

**Keyword:**
- RESTful API
- Data Integration

**บทบาท:**
- รับข้อมูลจาก Data Source
- ตรวจสอบรูปแบบข้อมูล (basic validation)
- ส่งข้อมูลต่อเข้า Database
- เป็นจุดเชื่อมระหว่าง Station / Sensor กับระบบส่วนอื่น

**Demo Scope:**
- ✅ API รับ mock data
- ✅ โครงสร้าง API ออกแบบให้รองรับหลาย Station
- ❌ ไม่ต้องรองรับ protocol จริง (เช่น Modbus จริง)

---

### 3️⃣ Database Layer 

**Keyword:**
- Database
- Time-series
- Data Model
- ER Diagram
- Audit Trail **New Update:2**
- GIS / Spatial Data **New Update:2**

**บทบาท:**
- เก็บข้อมูล Station และแปลงนา (Farm Plot) **New Update:2**
- เก็บข้อมูล Sensor ภายใต้แต่ละ Station
- เก็บข้อมูล Sensor Data (time-series)
- เก็บ Alert และข้อมูลผู้ใช้
- เก็บ Audit Log, Support Ticket, Learning Media **New Update:2**

**Demo Scope:**
- ✅ ใช้ database จริง (หรือ mock storage)
- ✅ โครงสร้าง data model ชัดเจน
- ✅ รองรับ Geospatial Data เบื้องต้น (Lat/Lon, UTM) **New Update:2**
- ❌ ไม่มี HA / Replication / Optimization ระดับ production

---

### 4️⃣ Processing & Logic Layer

**Keyword:**
- Algorithm
- Threshold
- Business Logic
- BUS Algorithm (Disease Risk) **New Update:2**
- Reporting Engine **New Update:2**

**บทบาท:**
- วิเคราะห์ข้อมูลจาก Sensor
- ตรวจจับค่าผิดปกติตาม rule / threshold
- คำนวณความเสี่ยงโรคไหม้ด้วย BUS Algorithm ($T_d$, LWD) **New Update:2**
- สร้างรายงานสรุป (PDF/Excel) **New Update:2**
- ประเมินสถานะของ Sensor และ Station
- สรุป health status ของแต่ละ Station

**Demo Scope:**
- ✅ ใช้ logic แบบ rule-based
- ✅ คำนวณสถานะ Station จาก Sensor ภายใน
- ✅ คำนวณ BUS Risk Score (Mock computation) **New Update:2**
- ✅ สร้างรายงานสรุป (PDF/Excel) **New Update:2**
- ❌ ไม่ใช้ algorithm เชิงวิชาการจริง (ยกเว้น BUS ที่มีสูตรชัดเจน)

---

### 5️⃣ Web Application Layer

**Keyword:**
- Web Application
- Dashboard
- Visualization
- User Role
- GIS Map Picker **New Update:2**
- Digital Lock Control **New Update:2**

**บทบาท:**
- เป็นจุดที่ผู้ใช้โต้ตอบกับระบบ
- แสดง Dashboard แบบ Map-based และ 4 Pillars Dashboard (Risk) **New Update:2**
- แสดง Station Overview และ Drill-down
- แสดงกราฟ, ตาราง และ Alert
- ระบบลงทะเบียนเกษตรกร (ระบุพิกัดเอง) **New Update:2**
- สั่งเปิด-ปิด Digital Lock **New Update:2**
- ระบบแจ้งซ่อม (QR Support) และสื่อการเรียนรู้ **New Update:2**
- จัดการผู้ใช้ตาม role

**Demo Scope:**
- ✅ Dashboard ครบ flow
- ✅ Map แสดงตำแหน่ง Station และแปลงนา **New Update:2**
- ✅ Role พื้นฐาน (User / Manager / Admin)
- ✅ รองรับ Light / Dark Mode
- ✅ UI สำหรับลงทะเบียนและสั่งงาน Control **New Update:2**
- ❌ ไม่มี feature ขั้นสูงระดับ production

---

## 🔄 DATA FLOW (ไหลของข้อมูลแบบง่าย)

```
Mock Sensor Data (per Station)
    ↓
API รับข้อมูล
    ↓
Database
    ↓
Processing Logic (inc. BUS Algo)
    ↓
Dashboard / Alert
    ↓
User
```

### ลักษณะการไหลของข้อมูลใหม่เพิ่มเติม:

**1. Manual Control (Digital Lock):**
```
Super User (Command) → API → Digital Lock (Station) → Update Status (DB)
```

**2. Farmer Registration:**
```
Farmer (Manual Input) → API (Conv to UTM) → DB (Pending) → Super User (Approve) → Active
```

**3. Reporting:**
```
Manager (Request) → Reporting Engine → Query DB → PDF/Excel → Manager (Download)
```

### ลักษณะการไหลของข้อมูล:

- **Sensor Data** ถูกผูกกับ **Station** เสมอ
- **Dashboard** แสดงผลจากมุมมอง **Station** เป็นหลัก
- **Alert** ถูกสร้างจาก **Sensor** แต่แสดงในระดับ **Station** ได้

---

## 🎯 SCOPE CONTROL (กันงานบาน)

### ✅ สิ่งที่อยู่ใน Demo

- Mock sensor data
- Station-based Dashboard
- Map visualization
- Alert แบบ rule-based
- Role พื้นฐาน
- Database structure และ data model

### ❌ สิ่งที่อยู่นอก Demo

- Hardware จริง
- Protocol จริง (Modbus, IoT device)
- HA / Replication
- Security ขั้นลึก
- Algorithm ระดับ production

---

## 🏗️ Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Browser)                           │
│            Manager / User (Farmer) / Super User                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              WEB APPLICATION LAYER                          │
│  - Dashboard (Map View, 4 Pillars Risk)                     │
│  - Station List & Detail / Digital Lock UI                  │
│  - Registration & Plot Management (Manual Input)              │
│  - Helpdesk & Learning Media / Reporting UI                 │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│           PROCESSING & LOGIC LAYER                          │
│  - Threshold Checking / Alert Generation                    │
│  - Station Status Calculation                               │
│  - BUS Algorithm (Disease Risk Analysis) [NEW]              │
│  - Reporting Engine (PDF/Excel) [NEW]                       │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 DATABASE LAYER                              │
│  D1: User & Farm Plot DB (GIS)                              │
│  D2: Sensor Data DB (Time-series)                           │
│  D3: Alert & Audit Log DB                                   │
│  D4: Station & Support Ticket DB                            │
│  D5: Media Content DB                                       │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│           DATA INGESTION / API LAYER                        │
│  - POST /api/sensors/{id}/data                              │
│  - Data Validation                                          │   
│  - POST /api/control/lock (Command)                         │
│  - GIS Services (Lat/Lon <-> UTM)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA SOURCE LAYER                              │
│         Mock Sensor Data Generator                          │
│         (Sensors + Digital Lock Status)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📌 OUTPUT ของ STEP 3

หลังจบ STEP 3 จะได้:

1. ✅ อธิบายภาพรวมระบบได้ชัดเจนในไม่กี่นาที
2. ✅ รู้ว่าระบบมี component อะไรบ้าง
3. ✅ เข้าใจ data flow หลักของระบบ
4. ✅ พร้อมนำไปแตกเป็น Use Case Diagram, DFD และ ERD

---

## 🔑 Key Decisions

| Decision | Rationale |
|----------|-----------|
| Station-first Architecture | ให้ความสำคัญกับ Station เป็นหน่วยหลัก ง่ายต่อการ scale |
| Mock Data Generator | ไม่ต้องพึ่ง Hardware จริง ทำ Demo ได้เร็ว |
| Map-based Dashboard | เหมาะกับการแสดงข้อมูลที่กระจายทางภูมิศาสตร์ |
| Rule-based Alert | เริ่มจากง่าย ขยายเป็น ML ได้ในอนาคต |
| Time-series Database | รองรับข้อมูล Sensor ที่มีปริมาณมาก |

---

**Next Step**: [04-use-case-diagram.md](04-use-case-diagram.md) - ระบุว่าใครใช้ระบบทำอะไร

---

**หมายเหตุสำหรับ AI Agent:**  
STEP 3 นี้เป็น "แผนที่ใหญ่" ของระบบทั้งหมด  
ทุกครั้งที่สร้าง Component ใหม่ ต้องตรวจสอบว่าอยู่ใน Layer ไหน และสอดคล้องกับ Data Flow หรือไม่

**New Update:2 (13/02/2026)** 