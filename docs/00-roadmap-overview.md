# 🔰 ROADMAP ทั้งโปรเจ็ค

> **Smart Agriculture Monitoring System**  
> การพัฒนาระบบติดตามการเกษตรอัจฉริยะแบบ Step-by-Step

---

## 📋 ขั้นตอนการพัฒนาทั้งหมด (8 STEPS)

| STEP | หัวข้อ | สถานะ | เอกสารอ้างอิง |
|------|--------|-------|---------------|
| 1 | Requirement Extraction | 📝 | [01-requirement-extraction.md](01-requirement-extraction.md) |
| 2 | Requirement Grouping & Priority | 📝 | [02-requirement-grouping-priority.md](02-requirement-grouping-priority.md) |
| 3 | System Scope & Architecture | 📝 | [03-system-scope-architecture.md](03-system-scope-architecture.md) |
| 4 | Use Case Diagram | 📝 | [04-use-case-diagram.md](04-use-case-diagram.md) |
| 5 | Data Flow Diagram (DFD) | 📝 | [05-data-flow-diagram.md](05-data-flow-diagram.md) |
| 6 | Entity Relationship Diagram (ERD) | 📝 | [06-erd-database-design.md](06-erd-database-design.md) |
| 7 | Data Model & API Design | 📝 | [07-data-model-api-design.md](07-data-model-api-design.md) |
| 8 | Web Demo Flow | 🔄 | (รอการพัฒนา) |

---

## 🎯 ภาพรวมโปรเจค

### วัตถุประสงค์
พัฒนาระบบติดตามข้อมูลทางการเกษตรจากอุปกรณ์ IoT ในรูปแบบ Dashboard ที่:
- แสดงผลแบบ **Real-time** / **Near Real-time**
- สามารถ**แจ้งเตือน**เมื่อเกิดความผิดปกติ
- รองรับ**หลายระดับผู้ใช้งาน** (Role-Based Access Control)
- รองรับ **Farmer** ลงทะเบียนแปลงนา (GIS) และ **Digital Lock** ควบคุมการเปิด-ปิด **New Update:2**
- มีระบบ **Reporting** และ **Learning Media** **New Update:2**

### แนวคิดหลัก: Station-first Architecture
- ระบบหมุนรอบ **Station** (สถานีเกษตร) เป็นศูนย์กลาง
- แต่ละ Station มี **Sensor** หลายตัว
- ข้อมูลจาก Sensor เป็น **Time-series Data**
- Dashboard แสดงผลจาก **Map-based View** → **Station Detail** → **Sensor Data**

---

## 🧩 ขั้นตอนการทำงานแบบย่อ

### STEP 1: Requirement Extraction
**จาก TOR → ความต้องการจริง**

สกัดความต้องการออกเป็น 7 กลุ่มหลัก:
1. User & Role
2. Data Source & IoT
3. Data Management & Database
4. Web Application & Dashboard
5. Alert & Notification
6. Algorithm & Analysis
7. API & Integration

### STEP 2: Requirement Grouping & Priority
**จัดระเบียบ + เลือกสิ่งที่ต้องทำก่อน**

แบ่งเป็น 3 ระดับ:
- 🔴 **Priority Level 1: CORE** (ต้องมีใน Demo)
- 🟠 **Priority Level 2: DEMO VALUE** (ควรมีเพื่อความสมบูรณ์)
- 🟡 **Priority Level 3: FUTURE** (รู้ไว้ แต่อย่าเพิ่งทำ)

### STEP 3: System Scope & Architecture
**ทำให้ทุกคนเห็นภาพเดียวกัน**

กำหนด:
- System Components (5 Layers)
- Data Flow หลัก
- Scope Control (อะไรอยู่ใน/นอก Demo)

### STEP 4: Use Case Diagram
**ระบุว่าใครใช้ระบบทำอะไร**

Actors:
- Manager (ผู้บริหาร)
- User (เจ้าหน้าที่)
- Super User (ผู้ดูแลระบบ)

Use Cases หลัก: Login, View Dashboard, View Station Detail, View Sensor Data, View Alert, Manage Users, Configure Threshold

### STEP 5: Data Flow Diagram
**อธิบายว่าข้อมูลไหลอย่างไร**

- DFD Level 0: Context Diagram
- DFD Level 1: Process Decomposition (6 Processes + 4 Data Stores)

### STEP 6: ERD (Database Design)
**แผนที่ฐานข้อมูล**

Core Entities:
- Station
- Sensor
- SensorData
- Alert
- User, Role, Threshold

### STEP 7: Data Model & API Design
**แปลง ERD → โครงสร้างจริง + API Endpoints**

กำหนด:
- Data Model แต่ละ Entity
- API Endpoints
- Access Control Matrix

### STEP 8: Web Demo Flow
**ออกแบบหน้าจอและการใช้งาน**
(รอการพัฒนา)

---

## 🎯 Demo Scope (สิ่งที่ต้องทำ)

### ✅ สิ่งที่อยู่ใน Demo
- Mock sensor data (ไม่ใช่ hardware จริง)
- Station-based Dashboard
- Map visualization
- Alert แบบ rule-based
- Role พื้นฐาน (User, Manager, Super User, Farmer) **New Update:2**
- Database structure และ data model
- Digital Lock Control (Simulation) **New Update:2**
- Manual Lat/Lon Registration for Farmers **New Update:2**
- Reporting (Basic export) **New Update:2**

### ❌ สิ่งที่อยู่นอก Demo
- Hardware จริง
- Protocol จริง (Modbus, IoT device)
- HA / Replication
- Security ขั้นลึก
- Algorithm ระดับ production

---

## 📊 ลำดับการอ่านเอกสาร (Recommended Reading Order)

### สำหรับ AI Agent ที่ต้องการเข้าใจระบบทั้งหมด:
1. **อ่านไฟล์นี้ก่อน** (00-roadmap-overview.md) - เพื่อเข้าใจภาพรวม
2. [02-requirement-grouping-priority.md](02-requirement-grouping-priority.md) - เพื่อรู้ Priority
3. [03-system-scope-architecture.md](03-system-scope-architecture.md) - เพื่อเข้าใจโครงสร้าง
4. [04-use-case-diagram.md](04-use-case-diagram.md) - เพื่อรู้ว่าผู้ใช้ทำอะไร
5. [06-erd-database-design.md](06-erd-database-design.md) - เพื่อเข้าใจโครงสร้างข้อมูล
6. [07-data-model-api-design.md](07-data-model-api-design.md) - เพื่อรู้ API และสิทธิ์

### สำหรับ AI Agent ที่ต้องการทำงานเฉพาะส่วน:
- **Backend Developer**: อ่าน 06, 07
- **Frontend Developer**: อ่าน 04, 07
- **Database Designer**: อ่าน 05, 06, 07

---

## 🔑 Key Concepts (สำคัญ)

### 1. Station-first Architecture
```
Country Level (Map View)
    ↓
Station Overview (40 stations)
    ↓
Station Detail (Sensors in this station)
    ↓
Sensor Data (Time-series graph)
```

### 2. Data Relationship
```
Station (1) ─→ (N) Sensor ─→ (N) SensorData
   ↓                ↓
   └────→ (N) Alert ←┘
```

### 3. Role-Based Access Control
```
Super User → Full Access
Manager → View + Manage Station/Sensor
User → View Only
```

---

## 📌 กฎเหล็กสำหรับ AI Agent

1. **ห้ามคิดเอง** - ทำตามเอกสารเท่านั้น
2. **ห้ามเพิ่มฟีเจอร์** - ที่ไม่อยู่ใน Priority Level 1-2
3. **ห้ามเปลี่ยน Data Model** - ที่กำหนดไว้ใน ERD
4. **ห้ามเปลี่ยน API Endpoint** - ที่ระบุไว้
5. **ถามเมื่อไม่แน่ใจ** - อย่าสมมติเอง

---

**อัพเดทล่าสุด**: February 1, 2026  
**สถานะ**: Requirements & Design Complete, Implementation In Progress

**New Update:2 (13/02/2026)**
