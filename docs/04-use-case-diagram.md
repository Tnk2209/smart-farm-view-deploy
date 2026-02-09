# STEP 4: Use Case Diagram

> **ระบุว่าใครใช้ระบบ และใช้ทำอะไร**  
> กำหนด Actors และ Use Cases ทั้งหมดของระบบ

---

## 🎯 เป้าหมายของ STEP 4

- ระบุ **Actor** (ผู้ใช้งานระบบ) ทั้งหมด
- ระบุว่าแต่ละ Actor เข้ามา **"ทำอะไรกับระบบ"**
- ทำให้เห็นขอบเขตความสามารถของระบบจากมุมมองผู้ใช้
- ใช้เป็นฐานก่อนทำ DFD และออกแบบหน้าจอ Web Application

---

## 🧠 วิธีคิดของ Use Case

> **"คน ๆ นี้ เข้ามา เพื่ออะไร"**  
> **ไม่ใช่ "เข้ามาแล้ว กดปุ่มอะไร"**

Use Case จะอธิบาย **ความต้องการของผู้ใช้**  
ไม่ใช่รายละเอียดทางเทคนิคหรือ UI

---

## 👤 Actors (คนที่ใช้ระบบ)

### 1️⃣ Manager

**บทบาท:**
- ผู้บริหาร / ผู้ตัดสินใจ
- ไม่ตั้งค่า ไม่แก้ระบบ
- เข้ามาเพื่อ **"ดูภาพรวมของสถานการณ์ทั้งหมด"**

**Use Case:**
- Login
- View Dashboard
- View Station Overview
- View Alert

**จุดสนใจหลักของ Manager คือ:**
> "ตอนนี้สถานีไหนปกติ / ผิดปกติ"

---

### 2️⃣ User

**บทบาท:**
- ผู้ใช้งานทั่วไป / เจ้าหน้าที่ภาคสนาม
- ใช้งานระบบเป็นประจำ
- สนใจข้อมูลเชิงรายละเอียดและการแจ้งเตือน

**Use Case:**
- Login
- View Dashboard
- View Station Detail
- View Sensor Data
- Receive Notification

**User จะเริ่มจาก Dashboard**  
แล้ว **drill-down** ลงไปดูข้อมูลระดับ Station และ Sensor

---

### 3️⃣ Super User

**บทบาท:**
- ผู้ดูแลระบบ
- ควบคุมโครงสร้างและกติกาของระบบ
- มีสิทธิ์สูงสุด

**Use Case:**
- Login
- Configure Threshold
- Manage Users
- View Alert
- View Dashboard

---

## 🧩 Use Case หลัก (ระบบทำอะไรให้ผู้ใช้)

### 🔹 UC01: Login

**Actor:** Manager, User, Super User (ทุกคน)

**จุดประสงค์:**
- จุดเริ่มต้นของการใช้งานระบบ
- ใช้ระบุตัวตนและ Role
- ควบคุมสิทธิ์การเข้าถึงฟังก์ชันต่าง ๆ

**Flow:**
1. ผู้ใช้กรอก username / password
2. ระบบตรวจสอบข้อมูล
3. ระบบระบุ Role
4. เข้าสู่ Dashboard

> **Login คือ "ประตูของระบบ"**

---

### 🔹 UC02: View Dashboard

**Actor:** Manager, User, Super User (ทุกคน)

**จุดประสงค์:**
- หน้าหลักของระบบ
- แสดงภาพรวมระดับประเทศ
- แสดงสถานะของแต่ละ Station
- ใช้ **Map** เป็นตัวนำทางหลัก

**Includes:**
- View Station Overview

**แปลความหมาย:**
> ทุกครั้งที่ดู Dashboard  
> ระบบต้องแสดงข้อมูลระดับ Station เสมอ

---

### 🔹 UC03: View Station Overview

**Actor:** Manager, User, Super User (ทุกคน)

**จุดประสงค์:**
- ดูรายชื่อสถานีทั้งหมด
- ดูสถานะ (Normal / Warning / Critical)
- ดูจำนวน Sensor และ Alert ต่อ Station
- เป็นหัวใจของแนวคิด **Station-first**

**Output:**
- รายการ Station พร้อมสถานะ
- จำนวน Sensor ในแต่ละ Station
- จำนวน Active Alert

---

### 🔹 UC04: View Station Detail

**Actor:** User, Manager, Super User

**จุดประสงค์:**
- ดูข้อมูลเชิงลึกของ Station ที่เลือก
- ดู Sensor ภายใน Station
- เป็นจุดเริ่มของการ **drill-down**

**Includes:**
- View Sensor Data

**Flow:**
1. เลือก Station จาก Dashboard
2. แสดงรายละเอียด Station
3. แสดงรายการ Sensor ภายใน
4. แสดง Alert ของ Station นี้

---

### 🔹 UC05: View Sensor Data

**Actor:** User, Manager, Super User

**จุดประสงค์:**
- ดูค่าปัจจุบันและประวัติของ Sensor
- ดูกราฟข้อมูลแบบ **time-series**
- เป็นแหล่งข้อมูลหลักของระบบทั้งหมด

**Output:**
- กราฟแสดงค่าตามเวลา
- ค่าปัจจุบัน
- ค่าสถิติ (min, max, avg)
- Threshold line

---

### 🔹 UC06: View Alert

**Actor:** Manager, User, Super User (ทุกคน)

**จุดประสงค์:**
- ดูเหตุการณ์ผิดปกติที่ระบบตรวจพบ
- Alert เกิดจากข้อมูล Sensor และ Threshold
- สามารถดูได้ทั้งภาพรวมและราย Station

**Output:**
- รายการ Alert ทั้งหมด
- Severity Level (LOW, MEDIUM, HIGH)
- Timestamp
- Station / Sensor ที่เกี่ยวข้อง
- Acknowledge Status

---

### 🔹 UC07: Receive Notification (extend)

**Actor:** User, Manager

**จุดประสงค์:**
- การแจ้งเตือนเกิดเฉพาะบางกรณี
- เกิดเมื่อค่าผิดปกติตามเงื่อนไขที่กำหนด

**extends** แปลว่า:
> ไม่ได้เกิดทุกครั้ง  
> แต่ถ้ามีเงื่อนไข → ระบบจะทำสิ่งนี้เพิ่ม

---

### 🔹 UC08: Configure Threshold

**Actor:** Super User **เท่านั้น**

**จุดประสงค์:**
- ตั้งค่าขอบเขตค่าปกติ / ผิดปกติ
- เป็นตัวกำหนดความ **"ฉลาด"** ของระบบ

**Flow:**
1. เลือก Sensor Type
2. กำหนด min_value, max_value
3. บันทึก
4. ระบบใช้ค่านี้ตรวจสอบ Sensor Data

---

### 🔹 UC09: Manage Users

**Actor:** Super User **เท่านั้น**

**จุดประสงค์:**
- สร้าง / แก้ไข / ปิดการใช้งานผู้ใช้
- กำหนด Role และสิทธิ์
- เป็นฟังก์ชันด้านการบริหารระบบ

**Operations:**
- Create User
- Edit User
- Deactivate User
- Assign Role

---

## 📊 Use Case Diagram (ภาพรวม)

```
                    ┌─────────────────────────────────────┐
                    │  Smart Agriculture Monitoring       │
                    │           System                    │
                    └─────────────────────────────────────┘
                              ▲
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Manager │         │  User   │         │  Super  │
    │         │         │         │         │  User   │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                    │
         │                   │                    │
    ┌────┴────────────────────┴────────────────────┴────┐
    │                                                    │
    │  Use Cases:                                        │
    │  • Login                         (All)             │
    │  • View Dashboard                (All)             │
    │  • View Station Overview         (All)             │
    │  • View Station Detail           (All)             │
    │  • View Sensor Data              (All)             │
    │  • View Alert                    (All)             │
    │  • Receive Notification          (User, Manager)   │
    │  • Configure Threshold           (Super User)      │
    │  • Manage Users                  (Super User)      │
    │                                                    │
    └────────────────────────────────────────────────────┘
```

---

## 📋 Use Case Summary Table

| Use Case | Manager | User | Super User | Priority |
|----------|---------|------|------------|----------|
| Login | ✅ | ✅ | ✅ | Level 1 |
| View Dashboard | ✅ | ✅ | ✅ | Level 1 |
| View Station Overview | ✅ | ✅ | ✅ | Level 1 |
| View Station Detail | ✅ | ✅ | ✅ | Level 1 |
| View Sensor Data | ✅ | ✅ | ✅ | Level 1 |
| View Alert | ✅ | ✅ | ✅ | Level 2 |
| Receive Notification | ✅ | ✅ | ❌ | Level 2 |
| Configure Threshold | ❌ | ❌ | ✅ | Level 2 |
| Manage Users | ❌ | ❌ | ✅ | Level 1 |

---

## 📌 OUTPUT ของ STEP 4

หลังจบ STEP 4 จะได้:

1. ✅ เห็นชัดว่าใครใช้ระบบ และใช้ทำอะไร
2. ✅ เห็นขอบเขตความสามารถของระบบจากมุมผู้ใช้
3. ✅ พร้อมนำไปวาด Use Case Diagram (Mermaid / UML)
4. ✅ พร้อมแตกเป็น DFD และออกแบบหน้าจอเว็บตาม flow จริง

---

## 🔑 Relationships

### Include
- View Dashboard **includes** View Station Overview
- View Station Detail **includes** View Sensor Data

### Extend
- View Alert **extends to** Receive Notification (เมื่อมีเงื่อนไข)

---

## 📝 หมายเหตุสำหรับ AI Agent

**เมื่อพัฒนา Feature ใหม่:**

1. ตรวจสอบว่า Feature นี้ตรงกับ Use Case ไหน?
2. Use Case นี้ใช้ได้กับ Actor ไหนบ้าง?
3. ต้องตรวจสอบ Role หรือไม่?
4. มี Data Model รองรับหรือไม่? (ดู STEP 6-7)

**ห้ามสร้าง Feature ที่:**
- ไม่มี Use Case รองรับ
- ไม่มีใน Priority Level 1-2
- ไม่มี Actor ที่เกี่ยวข้อง

---

**Next Step**: [05-data-flow-diagram.md](05-data-flow-diagram.md) - อธิบายการไหลของข้อมูล

---

**หมายเหตุ:**  
Use Case นี้เป็น "สัญญา" ระหว่างระบบกับผู้ใช้  
ทุก Feature ที่สร้างต้องตอบโจทย์ Use Case อย่างน้อย 1 ตัว
