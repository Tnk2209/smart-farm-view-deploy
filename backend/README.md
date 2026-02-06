# Smart Farm Backend

Backend server สำหรับระบบ Smart Farm ที่รองรับการรับข้อมูลจาก IoT devices ผ่าน MQTT และให้บริการ REST API

## 🏗️ Architecture

```
IoT Devices (MQTT) ──→ MQTT Broker ──→ Backend (MQTT Subscriber)
                                            ↓
                                    Parse & Normalize
                                            ↓
                                    PostgreSQL Database
                                            ↓
Frontend ──→ REST API ──→ Backend ──→ Query Data & Return
```

## 🔧 Tech Stack

- **Node.js + TypeScript** - Runtime & Language
- **Express** - HTTP Server & REST API
- **MQTT.js** - MQTT Client for subscribing to telemetry
- **PostgreSQL** - Relational Database
- **pg** - PostgreSQL client

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **MQTT Broker** (Mosquitto, EMQX, หรือ cloud-based)

## ⚙️ Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup PostgreSQL Database

สร้าง database ใหม่:

```sql
CREATE DATABASE smart_farm;
```

### 3. Configure Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไขค่าใน `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_farm
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_SSL=false

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=smartfarm/telemetry/#

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Run Database Migrations

สร้าง tables ในฐานข้อมูล:

```bash
npm run db:migrate
```

### 5. Seed Initial Data

ใส่ข้อมูลตัวอย่าง (stations, sensors, thresholds):

```bash
npm run db:seed
```

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

Server จะรันที่ `http://localhost:3001`

## 📡 MQTT Setup

### Install Mosquitto (MQTT Broker) - Windows

1. ดาวน์โหลด: https://mosquitto.org/download/
2. ติดตั้งและรัน service
3. ทดสอบ:
```bash
mosquitto_pub -t "test" -m "hello"
mosquitto_sub -t "test"
```

### MQTT Topic Structure

Backend subscribe topic: `smartfarm/telemetry/#`

ตัวอย่าง topic ที่ IoT device ส่งมา:
- `smartfarm/telemetry/IG502-ABC123`
- `smartfarm/telemetry/station/chiang-mai`

## 📨 Telemetry Message Format

IoT devices ต้องส่งข้อมูลในรูปแบบ JSON:

```json
{
  "device_id": "IG502-ABC123",
  "ts": "2026-02-06T10:30:00Z",
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
    "battery_v": 12.4
  },
  "sim_serial": "243038645779",
  "sim_rssi": -40
}
```

### ทดสอบส่งข้อมูลด้วย MQTT

```bash
mosquitto_pub -t "smartfarm/telemetry/IG502-ABC123" -m '{
  "device_id": "IG502-ABC123",
  "ts": "2026-02-06T10:30:00Z",
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
    "battery_v": 12.4
  }
}'
```

## 🌐 REST API Endpoints

### Health Check
```
GET /health
```

### Stations
```
GET    /api/stations              # Get all stations
GET    /api/stations/:id          # Get station by ID
GET    /api/stations/:id/data/latest  # Get latest sensor data
```

### Sensors
```
GET    /api/sensors/:id           # Get sensor by ID
GET    /api/sensors/:id/data?from=<ISO_DATE>&to=<ISO_DATE>  # Get time-series data
GET    /api/sensors/:id/data/latest  # Get latest reading
```

### Alerts
```
GET    /api/alerts                # Get recent alerts
GET    /api/alerts/unacknowledged # Get unacknowledged alerts
GET    /api/alerts/station/:id    # Get alerts by station
POST   /api/alerts/:id/acknowledge # Acknowledge an alert
```

### Thresholds
```
GET    /api/thresholds            # Get all sensor thresholds
```

## 📊 Data Flow

### 1. Telemetry Ingestion (MQTT → Database)

```
1. IoT Device ส่ง MQTT message
   ↓
2. Backend รับที่ topic: smartfarm/telemetry/#
   ↓
3. Validate message structure
   ↓
4. ค้นหา Station จาก device_id
   ↓
5. Parse telemetry.data object
   ↓
6. Map field names → sensor_type:
   • wind_speed_ms → wind_speed
   • air_temp_c → air_temperature
   • etc.
   ↓
7. บันทึก SensorData records (1 message → 11 records)
   ↓
8. ตรวจสอบ Threshold แต่ละค่า
   ↓
9. ถ้าเกิน threshold → สร้าง Alert
   ↓
10. Return success response
```

### 2. Time-series Query (Frontend → API → Database)

```
1. Frontend request: GET /api/sensors/:id/data?from=...&to=...
   ↓
2. Backend query PostgreSQL
   ↓
3. Return sorted time-series array
```

## 🧪 Testing

### Test Database Connection

```bash
npm run db:migrate
```

### Test MQTT Connection

ดูใน terminal ว่า backend connect สำเร็จหรือไม่:
```
✅ Connected to MQTT broker
📡 Subscribed to topic: smartfarm/telemetry/#
```

### Test API Endpoints

```bash
# Get all stations
curl http://localhost:3001/api/stations

# Get station sensors with latest data
curl http://localhost:3001/api/stations/1/data/latest

# Get sensor time-series
curl "http://localhost:3001/api/sensors/1/data?from=2026-02-01T00:00:00Z&to=2026-02-06T23:59:59Z"
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config.ts                 # Configuration & environment
│   ├── types.ts                  # TypeScript type definitions
│   ├── server.ts                 # Main server entry point
│   ├── database/
│   │   ├── connection.ts         # PostgreSQL connection pool
│   │   ├── migrate.ts            # Database migration script
│   │   ├── seed.ts               # Seed initial data
│   │   └── queries.ts            # Database queries
│   ├── mqtt/
│   │   └── subscriber.ts         # MQTT subscriber & handler
│   ├── services/
│   │   └── telemetryService.ts   # Telemetry parsing & processing
│   └── routes/
│       ├── stations.ts           # Station endpoints
│       ├── sensors.ts            # Sensor endpoints
│       ├── alerts.ts             # Alert endpoints
│       └── thresholds.ts         # Threshold endpoints
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔒 Security Notes

- ใช้ `.env` สำหรับ credentials (อย่า commit!)
- Database password ควร strong
- MQTT broker ควรมี authentication
- Production ควรใช้ HTTPS & MQTTS

## 🐛 Troubleshooting

### Database connection error

ตรวจสอบ:
1. PostgreSQL running หรือไม่
2. Database name ถูกต้อง
3. Username/password ถูกต้อง
4. Port (default: 5432)

### MQTT connection error

ตรวจสอบ:
1. MQTT broker running หรือไม่
2. MQTT_BROKER_URL ถูกต้อง
3. Port (default: 1883)
4. Network/firewall

### No data received from MQTT

ตรวจสอบ:
1. IoT device ส่งข้อมูลหรือไม่
2. Topic ถูกต้องหรือไม่
3. Message format ถูกต้องตาม spec

## 📝 Development Tips

### Watch Database Logs

```sql
-- Check recent sensor data
SELECT * FROM SensorData ORDER BY recorded_at DESC LIMIT 10;

-- Check alerts
SELECT * FROM Alert ORDER BY created_at DESC LIMIT 10;

-- Check station status
SELECT * FROM Station;
```

### Monitor MQTT Messages

```bash
mosquitto_sub -v -t "smartfarm/telemetry/#"
```

## 🤝 Contributing

ถ้ามีปัญหาหรือข้อเสนอแนะ สามารถติดต่อได้ที่ทีมพัฒนา

## 📄 License

Internal project for Smart Farm POC
