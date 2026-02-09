# STEP 5: Data Flow Diagram (DFD)

> **อธิบายว่าข้อมูลไหลในระบบอย่างไร**  
> เชื่อมความเข้าใจจาก Use Case → ERD

---

## 🎯 เป้าหมายของ STEP 5

- อธิบายว่า **ข้อมูลไหลในระบบอย่างไร**
- เชื่อมความเข้าใจจาก Use Case → ERD
- ทำให้ทีมเห็น **"เส้นทางของข้อมูล"** ตรงกันทั้งหมด

> **STEP นี้ ไม่สน UI / ปุ่ม / หน้าจอ**  
> **สนใจแค่ว่า ข้อมูลมาจากไหน → ผ่านอะไร → ถูกเก็บที่ไหน → ไปหาใคร**

---

## 📘 DFD คืออะไร

**DFD (Data Flow Diagram)**  
คือแผนภาพที่อธิบายการไหลของข้อมูลภายในระบบ

### DFD ต้องตอบให้ได้ว่า:

1. ข้อมูล **มาจากไหน** (External Entity)
2. ข้อมูล **ถูกประมวลผลอย่างไร** (Process)
3. ข้อมูล **ถูกเก็บที่ไหน** (Data Store)
4. ข้อมูล **ถูกส่งให้ใคร** (Output)

---

## 🏗️ โครงสร้างของ DFD ที่ใช้ในโปรเจกต์นี้

โปรเจกต์นี้ใช้ DFD **2 ระดับ:**

1. **DFD Level 0 (Context Diagram)** → มองระบบเป็น "กล่องเดียว"
2. **DFD Level 1** → แตกกล่องออกเป็น process ภายในที่สำคัญ

---

## 1️⃣ DFD Level 0 – Context Diagram

### แนวคิด

มอง **Smart Agriculture Monitoring System** เป็นระบบก้อนเดียว  
ใช้เพื่ออธิบายภาพรวมให้คนที่ไม่ technical เข้าใจได้ภายในไม่กี่นาที

### 🎯 เป้าหมายของ DFD Level 0

- เห็นภาพรวมของระบบทั้งหมด
- รู้ว่า**ใครส่งข้อมูลเข้ามา**
- รู้ว่าระบบ**ส่งข้อมูลออกไปให้ใคร**

### 🧱 องค์ประกอบ

**External Entities (แหล่งข้อมูลภายนอก):**
- Sensor / IoT Device (ใน demo ใช้ Mock Sensor Data)
- User
- Manager
- Super User

**Process:**
- Smart Agriculture Monitoring System (แสดงเป็น process เดียว)

### 🔄 Data Flow (เชิงแนวคิด)

```
Sensor / Mock Data
    ↓
  Sensor Data
    ↓
  Smart Agriculture Monitoring System
    ↕
User / Manager / Super User
(Request Data / View Data / View Alert)
```

> **Level 0 จะไม่แยก process ย่อย**  
> **เน้น "ใครคุยกับระบบบ้าง และคุยด้วยข้อมูลอะไร"**

### 📊 Context Diagram

```
┌──────────────────┐
│  Sensor / Mock   │
│   Data Source    │
└────────┬─────────┘
         │ Sensor Data
         │
         ▼
┌─────────────────────────────────────┐
│                                     │
│   Smart Agriculture Monitoring      │
│            System                   │
│                                     │
└──┬──────────────────────────────┬───┘
   │                              │
   │ View Data / Alert            │ View Data / Alert
   │ Request Data                 │ Manage System
   ▼                              ▼
┌──────────────┐           ┌──────────────┐
│   Manager    │           │  Super User  │
│              │           │              │
└──────────────┘           └──────────────┘
         ▲
         │ View Data / Notification
         │
┌──────────────┐
│     User     │
│              │
└──────────────┘
```

---

## 2️⃣ DFD Level 1 – Process Decomposition

### แนวคิด

แตก **Smart Agriculture Monitoring System** ออกเป็น process ภายในที่ระบบทำจริง

> **ทุก process ใน Level 1 ต้อง:**
> - รองรับ Use Case ที่ออกแบบไว้
> - มีความสัมพันธ์กับ ERD ใน STEP ถัดไป

---

## 🧱 Process หลักในระบบ (6 Processes)

### P1: Authenticate User

**หน้าที่:**
- รับ username / password
- ตรวจสอบ role และสิทธิ์
- คืนผลการยืนยันตัวตน

**ความเชื่อมโยง:**
- สอดคล้องกับ Use Case: **Login**
- ใช้ข้อมูลจาก **D1: User Database**

---

### P2: Ingest Sensor Data

**หน้าที่:**
- รับข้อมูลจาก Sensor หรือ Mock Data
- ตรวจสอบรูปแบบข้อมูลเบื้องต้น
- ส่งข้อมูลต่อไปเก็บในระบบ

**ความเชื่อมโยง:**
- ตรงกับ **Data Source Layer** ใน STEP 3
- เป็นจุดเริ่มต้นของข้อมูลทั้งหมดในระบบ

---

### P3: Store & Manage Data

**หน้าที่:**
- บันทึกข้อมูล sensor
- จัดการข้อมูลผู้ใช้
- จัดการข้อมูลที่เกี่ยวข้องกับระบบ

**ความเชื่อมโยง:**
- เป็นที่มาของการออกแบบ **ERD** ใน STEP 6
- เชื่อมกับทุก process หลัก

---

### P4: Analyze & Check Threshold

**หน้าที่:**
- วิเคราะห์ค่าที่รับเข้ามา
- ตรวจสอบเงื่อนไข threshold
- สร้าง alert เมื่อพบค่าผิดปกติ

**ความเชื่อมโยง:**
- ตรงกับ Use Case: **View Alert, Receive Notification**
- ใน demo ใช้ logic จำลอง (mock algorithm)

---

### P5: Display Dashboard & Alert

**หน้าที่:**
- ดึงข้อมูล Sensor / Station / Alert ที่ถูกจัดการและเตรียมไว้แล้ว
- มาแสดงผลตาม role ของผู้ใช้

**ความเชื่อมโยง:**
- ตรงกับ Use Case: **View Dashboard, View Sensor Data, View Alert**
- เป็นจุดที่ข้อมูลทั้งหมดถูกนำเสนอ

---

### P6: Manage Station

**หน้าที่:**
- สร้าง / แก้ไข / ปิดใช้งานสถานี
- กำหนดความสัมพันธ์ระหว่าง Station ↔ Sensor
- จัดการ metadata ของสถานี (ชื่อ, ตำแหน่ง, สถานะ)

**ความเชื่อมโยง:**
- ตรงกับ Use Case: **Manage Station** (โดย Super User)
- ใช้ข้อมูลจาก **D4: Station Database**
- ทำให้ Station เป็น entity หลักของระบบ ไม่ใช่แค่กล่องครอบ sensor

---

## 🗄️ Data Store (ที่เก็บข้อมูล)

### D1: User Database

**เก็บข้อมูล:**
- ผู้ใช้และ role
- Username, Password Hash, Email

**เกี่ยวข้องกับ:**
- P1: Authenticate
- P3: Store
- P6: Manage Station (สิทธิ์การเข้าถึง)

---

### D2: Sensor Data Database

**เก็บข้อมูล:**
- ข้อมูล sensor แบบ time-series
- Value, Timestamp

**เกี่ยวข้องกับ:**
- P2: Ingest
- P3: Store
- P4: Analyze
- P5: Display

---

### D3: Alert / Notification Data

**เก็บข้อมูล:**
- ประวัติการแจ้งเตือนที่ระบบสร้างขึ้น
- Alert History, Acknowledge Status

**เกี่ยวข้องกับ:**
- P4: Create Alert
- P5: Display Alert

---

### D4: Station Database

**เก็บข้อมูล:**
- รายละเอียดสถานี (Station Name, Location, Status)
- ความสัมพันธ์กับ Sensor

**เกี่ยวข้องกับ:**
- P3: Store
- P5: Display Dashboard
- P6: Manage Station

---

## 📊 DFD Level 1 Diagram (Complete)

```
┌──────────────────┐
│  Sensor / Mock   │
│   Data Source    │
└────────┬─────────┘
         │ Sensor Data
         │
         ▼
    ┌────────────────┐
    │   P2: Ingest   │
    │   Sensor Data  │
    └────┬───────────┘
         │
         ▼
    ┌────────────────────┐
    │   P3: Store &      │
    │   Manage Data      │
    └───┬────────────┬───┘
        │            │
        ▼            ▼
   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
   │   D1   │   │   D2   │   │   D3   │   │   D4   │
   │  User  │   │ Sensor │   │ Alert  │   │Station │
   │   DB   │   │Data DB │   │   DB   │   │   DB   │
   └───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
       │            │            │            │
       ▼            ▼            ▼            ▼
   ┌────────────────────────────────────────────┐
   │         P4: Analyze & Check Threshold      │
   └───────────────┬────────────────────────────┘
                   │ Create Alert
                   │
                   ▼
   ┌────────────────────────────────────────────┐
   │      P5: Display Dashboard & Alert         │
   └───┬───────────────────────────────────┬────┘
       │                                   │
       ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│   Manager    │                    │  Super User  │
│              │                    │              │
└──────────────┘                    └──────┬───────┘
       ▲                                   │
       │                                   │ Manage
       │                                   ▼
┌──────────────┐                    ┌──────────────┐
│     User     │                    │  P6: Manage  │
│              │                    │   Station    │
└──────────────┘                    └──────────────┘
       ▲
       │
       │ Authenticate
       ▼
   ┌────────────────┐
   │ P1: Authenticate│
   │      User      │
   └────────────────┘
```

---

## 🔄 Data Flow ตามสถานการณ์การใช้งาน

### Scenario 1: ข้อมูล Sensor ไหลเข้าระบบ

```
Sensor Data
  → P2: Ingest Sensor Data
  → P3: Store & Manage Data
  → D2: Sensor Data DB
  → P4: Analyze & Check Threshold
  → (ถ้าเกิน) D3: Alert DB
```

### Scenario 2: ผู้ใช้ Login และดู Dashboard

```
User Input (Username/Password)
  → P1: Authenticate User
  → D1: User DB (Check)
  → P5: Display Dashboard
  → D2, D3, D4 (Query Data)
  → User (View)
```

### Scenario 3: Super User จัดการ Station

```
Super User
  → P1: Authenticate (Check Role)
  → P6: Manage Station
  → D4: Station DB (CRUD)
```

---

## 📌 OUTPUT ของ STEP 5

หลังจาก STEP นี้ เราจะได้:

1. ✅ เข้าใจเส้นทางข้อมูลของระบบทั้งหมด
2. ✅ รู้ว่าข้อมูลแต่ละชุดถูกสร้าง / ใช้ / เก็บที่ไหน
3. ✅ พร้อมแตกไปสู่ ERD (STEP 6) และ Backend Design (STEP 7)
4. ✅ เข้าใจว่า Process ไหนต้องการ Data Store ไหน

---

## 📝 หมายเหตุสำหรับ AI Agent

**เมื่อพัฒนา Feature:**

1. ตรวจสอบว่า Feature นี้อยู่ใน Process ไหน?
2. Process นี้ใช้ Data Store ไหนบ้าง?
3. มี Data Flow ระหว่าง Process หรือไม่?
4. ต้องตรวจสอบสิทธิ์จาก D1 หรือไม่?

**การเพิ่ม Process ใหม่:**
- ต้องมี Use Case รองรับ
- ต้องระบุ Input / Output ชัดเจน
- ต้องระบุ Data Store ที่เกี่ยวข้อง

---

**Next Step**: [06-erd-database-design.md](06-erd-database-design.md) - ออกแบบโครงสร้างฐานข้อมูล

---

**หมายเหตุ:**  
DFD คือ "แผนที่การไหล" ของข้อมูล  
ทุก API Endpoint และ Backend Function ต้องสอดคล้องกับ DFD นี้
