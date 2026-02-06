# 🚀 Quick Start Guide - Smart Farm Backend

คู่มือเริ่มต้นใช้งาน Backend แบบ step-by-step

---

## 📋 สิ่งที่ต้องเตรียม

1. ✅ Node.js (v18+)
2. ✅ PostgreSQL (v14+)
3. ✅ MQTT Broker (Mosquitto)

---

## 🎯 ขั้นตอนการติดตั้ง

### STEP 1: ติดตั้ง PostgreSQL

#### Windows:
1. ดาวน์โหลด: https://www.postgresql.org/download/windows/
2. ติดตั้งและจดจำ password ของ user `postgres`
3. เปิด pgAdmin หรือ psql terminal
4. สร้าง database:
```sql
CREATE DATABASE smart_farm;
```

### STEP 2: ติดตั้ง Mosquitto (MQTT Broker)

#### Windows:
1. ดาวน์โหลด: https://mosquitto.org/download/
2. ติดตั้ง (ติ๊กเครื่องหมาย "Service")
3. ทดสอบว่า Mosquitto ทำงาน:

เปิด Command Prompt 2 หน้าต่าง:

**หน้าต่าง 1 (Subscribe):**
```cmd
mosquitto_sub -t "test"
```

**หน้าต่าง 2 (Publish):**
```cmd
mosquitto_pub -t "test" -m "Hello MQTT!"
```

ถ้าเห็น "Hello MQTT!" ในหน้าต่าง 1 แปลว่าทำงานแล้ว ✅

### STEP 3: ติดตั้ง Backend

```cmd
cd backend
npm install
```

### STEP 4: ตั้งค่า Environment Variables

แก้ไขไฟล์ `.env` (มีอยู่แล้วใน folder backend):

```env
# แก้เฉพาะ password ให้ตรงกับ PostgreSQL
DB_PASSWORD=yourpassword

# ที่เหลือใช้ default ได้
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_farm
DB_USER=postgres
MQTT_BROKER_URL=mqtt://localhost:1883
```

### STEP 5: Setup Database

```cmd
npm run db:migrate
npm run db:seed
```

ถ้าเห็น:
```
✅ Table "Station" created
✅ Table "Sensor" created
...
🎉 All migrations completed successfully!
🌱 Seeding database...
✅ 3 stations inserted
✅ 33 sensors inserted
```

แปลว่าสำเร็จ! 🎉

### STEP 6: รัน Backend Server

```cmd
npm run dev
```

ควรเห็น:
```
🚀 Starting Smart Farm Backend...
✅ PostgreSQL connected successfully
✅ Connected to MQTT broker
📡 Subscribed to topic: smartfarm/telemetry/#
✅ Server running on port 3001
```

---

## 🧪 ทดสอบระบบ

### ทดสอบ 1: REST API

เปิด browser หรือใช้ curl:

```bash
# ทดสอบ health check
http://localhost:3001/health

# ดู stations ทั้งหมด
http://localhost:3001/api/stations

# ดูข้อมูลล่าสุดของสถานี
http://localhost:3001/api/stations/1/data/latest
```

### ทดสอบ 2: ส่ง Telemetry ผ่าน MQTT

เปิด Command Prompt ใหม่:

```cmd
cd backend
npm run test:mqtt
```

ควรเห็นใน terminal ของ backend server:
```
📨 Received message on topic: smartfarm/telemetry/IG502-ABC123
✅ Found station: Chiang Mai Agricultural Station (ID: 1)
✅ Found 11 sensors for station
✅ Parsed 11 sensor readings
✅ Successfully processed telemetry
   📊 Records created: 11
   ⚠️  Alerts triggered: 1
```

### ทดสอบ 3: ดู Alerts

```bash
http://localhost:3001/api/alerts
```

---

## 📡 การทดสอบกับ Hardware จริง

เมื่อมี IoT device พร้อมแล้ว:

### 1. เพิ่ม Station ใหม่ใน Database

```sql
-- เชื่อมต่อ PostgreSQL
INSERT INTO Station (device_id, station_name, province, latitude, longitude, status)
VALUES ('IG502-XYZ999', 'Test Hardware Station', 'Bangkok', 13.7563, 100.5018, 'normal');

-- จด station_id ที่ได้
SELECT station_id FROM Station WHERE device_id = 'IG502-XYZ999';

-- เพิ่ม sensors สำหรับ station นี้ (ใช้ station_id จากด้านบน)
INSERT INTO Sensor (station_id, sensor_type, status)
VALUES 
  (4, 'wind_speed', 'active'),
  (4, 'air_temperature', 'active'),
  (4, 'air_humidity', 'active'),
  -- ... (เพิ่มตาม sensor ที่มีจริง)
;
```

### 2. ตั้งค่า IoT Device ให้ส่งไปที่:

- **MQTT Broker**: `mqtt://YOUR_SERVER_IP:1883`
- **Topic**: `smartfarm/telemetry/IG502-XYZ999`
- **Message Format**: ตาม JSON structure ใน README.md

### 3. Monitor การรับข้อมูล

ดูใน terminal ของ backend:
```
📨 Received message on topic: smartfarm/telemetry/IG502-XYZ999
✅ Found station: Test Hardware Station
✅ Successfully processed telemetry
```

---

## 🔧 Troubleshooting

### ❌ Database connection error

**วิธีแก้:**
1. ตรวจสอบว่า PostgreSQL ทำงานอยู่
2. ใช้ pgAdmin เชื่อมต่อทดสอบ
3. ตรวจสอบ password ใน `.env`

### ❌ MQTT connection error

**วิธีแก้:**
1. ตรวจสอบว่า Mosquitto service ทำงาน:
   ```cmd
   sc query mosquitto
   ```
2. ถ้าไม่ทำงาน start ด้วย:
   ```cmd
   net start mosquitto
   ```

### ❌ Station not found for device_id

**วิธีแก้:**
- ตรวจสอบว่า `device_id` ในข้อความที่ส่งมา ตรงกับใน database หรือไม่
```sql
SELECT * FROM Station;
```

---

## 📊 ดูข้อมูลใน Database

```sql
-- ดู stations
SELECT * FROM Station;

-- ดู sensors ของสถานีที่ 1
SELECT * FROM Sensor WHERE station_id = 1;

-- ดูข้อมูลล่าสุด 10 records
SELECT 
  s.sensor_type, 
  sd.value, 
  sd.recorded_at 
FROM SensorData sd
JOIN Sensor s ON sd.sensor_id = s.sensor_id
WHERE s.station_id = 1
ORDER BY sd.recorded_at DESC
LIMIT 10;

-- ดู alerts
SELECT * FROM Alert ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 Next Steps

1. ✅ รัน Backend server
2. ✅ ทดสอบด้วย `npm run test:mqtt`
3. ✅ ตรวจสอบข้อมูลเข้า database
4. 🔄 เชื่อมต่อ Frontend กับ Backend API
5. 🔄 เชื่อมต่อ Hardware จริง

---

## 📞 Support

ถ้ามีปัญหาหรือคำถาม:
1. ตรวจสอบ logs ใน terminal
2. ดูไฟล์ `README.md` สำหรับข้อมูลเพิ่มเติม
3. ติดต่อทีมพัฒนา

---

**Happy Coding! 🚀**
