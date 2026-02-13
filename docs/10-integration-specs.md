# STEP 10: Integration Specifications **New Update:2**

> **การเชื่อมต่อกับระบบภายนอก**  
> API Integration, External Systems และ Third-party Services

---

## 🎯 เป้าหมายของ STEP 10

- กำหนดวิธีการเชื่อมต่อกับระบบภายนอก
- ระบุ API Endpoints และ Data Format
- อธิบาย Authentication และ Security
- วางแผน Error Handling และ Retry Logic

---

## 🌐 ระบบภายนอกที่ต้องเชื่อมต่อ (4 ระบบหลัก) **New Update:2**

---

## 1️⃣ ALLRice App Integration (กรมการข้าว) **New Update:2**

### วัตถุประสงค์

ส่งการแจ้งเตือนภัยจากระบบไปยังแอปพลิเคชัน **"ALLRice"** ของกรมการข้าว

### แนวทางการเชื่อมต่อ

**Option 1: Push Notification API** (แนะนำ)
```
POST https://allrice-api.example.com/api/v1/notifications/push
```

**Option 2: Webhook**  
กรมการข้าวให้ระบบนี้เรียก webhook เมื่อมี alert ใหม่

### API Specification

#### Endpoint: Send Alert to ALLRice **New Update:2**

```http
POST /api/integration/allrice/alert
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "alert_id": 12345,
  "alert_type": "DISEASE",
  "severity": "HIGH",
  "title": "โรคไหม้ระบาดในพื้นที่จังหวัดเชียงใหม่",
  "message": "พบความเสี่ยงโรคไหม้สูง (BUS Score: 3.2) ในพื้นที่อำเภอแม่ริม จ.เชียงใหม่",
  "target": {
    "type": "PROVINCE",
    "value": "Chiang Mai"
  },
  "location": {
    "province": "Chiang Mai",
    "district": "Mae Rim",
    "lat": 18.7883,
    "lon": 98.9853
  },
  "risk_level": "HIGH",
  "recommendations": [
    "ฉีดพ่นสารป้องกันโรค",
    "เฝ้าระวังอาการใบไหม้",
    "ติดต่อเจ้าหน้าที่เกษตร"
  ],
  "created_at": "2026-02-13T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert sent to ALLRice successfully",
  "allrice_notification_id": "AR-20260213-0001",
  "recipients_count": 842,
  "timestamp": "2026-02-13T10:30:05Z"
}
```

### Error Handling **New Update:2**

| Error Code | คำอธิบาย | การจัดการ |
|------------|----------|----------|
| **401** | Invalid API Key | ตรวจสอบ credentials |
| **429** | Rate limit exceeded | Retry with exponential backoff |
| **503** | Service unavailable | Retry ภายใน 5 นาที |

### Authentication **New Update:2**

- ใช้ **API Key** ที่กรมการข้าวออกให้
- ส่งผ่าน HTTP Header: `Authorization: Bearer {API_KEY}`
- API Key ต้องเก็บใน Environment Variable (ห้าม hardcode)

---

## 2️⃣ กรมการข้าว - Farmer Registry API **New Update:2**

### วัตถุประสงค์

ดึงข้อมูลเกษตรกรที่ลงทะเบียนกับกรมการข้าว

### API Specification

#### Endpoint: Get Farmer Data **New Update:2**

```http
GET /api/integration/doa/farmers?province={province}&page={page}
Authorization: Bearer {DOA_API_KEY}
```

**Query Parameters:**
- `province` (optional): จังหวัด
- `district` (optional): อำเภอ
- `page`: หมายเลขหน้า (pagination)
- `limit`: จำนวนรายการต่อหน้า (default: 50)

**Response:**
```json
{
  "data": [
    {
      "farmer_id": "F-2026-001234",
      "name": "นายสมชาย ใจดี",
      "phone": "081-234-5678",
      "province": "Chiang Mai",
      "district": "Mae Rim",
      "subdistrict": "Rim Tai",
      "registered_plots_count": 2,
      "total_area_rai": 15.5
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 42,
    "total_records": 2100,
    "per_page": 50
  }
}
```

### Rate Limiting **New Update:2**

- **100 requests / minute**
- ถ้าเกิน → HTTP 429 (Too Many Requests)

---

## 3️⃣ กรมส่งเสริมการเกษตร (กสก.) - Plot Data API **New Update:2**

### วัตถุประสงค์

ดึงข้อมูลแปลงเพาะปลูกที่ลงทะเบียนกับกรมส่งเสริมการเกษตร

### API Specification

#### Endpoint: Get Plot Data **New Update:2**

```http
GET /api/integration/doae/plots?farmer_id={farmer_id}
Authorization: Bearer {DOAE_API_KEY}
```

**Response:**
```json
{
  "data": [
    {
      "plot_id": "PLOT-2026-56789",
      "farmer_id": "F-2026-001234",
      "plot_name": "แปลงนาบ้านแม่ริม 1",
      "location": {
        "lat": 18.7883,
        "lon": 98.9853,
        "province": "Chiang Mai",
        "district": "Mae Rim",
        "subdistrict": "Rim Tai"
      },
      "area_rai": 8.5,
      "crop_type": "rice",
      "planting_date": "2026-01-15",
      "harvest_date_estimate": "2026-05-15"
    }
  ]
}
```

---

## 4️⃣ Coordinate Conversion Service **New Update:2**

### วัตถุประสงค์

แปลงพิกัด Lat/Lon ↔ UTM สำหรับการลงทะเบียนแปลงนา

### API Specification

#### Endpoint: Convert Coordinates **New Update:2**

```http
POST /api/integration/coordinate/convert
Content-Type: application/json
```

**Request Body (Lat/Lon → UTM):**
```json
{
  "source": "latlong",
  "target": "utm",
  "lat": 18.7883,
  "lon": 98.9853
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "utm_zone": "47N",
    "easting": 487234.56,
    "northing": 2076543.21,
    "datum": "WGS84"
  }
}
```

**Request Body (UTM → Lat/Lon):**
```json
{
  "source": "utm",
  "target": "latlong",
  "utm_zone": "47N",
  "easting": 487234.56,
  "northing": 2076543.21
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "lat": 18.7883,
    "lon": 98.9853,
    "datum": "WGS84"
  }
}
```

### Implementation Options **New Update:2**

**Option 1: Third-party Service**
- ใช้ API จากผู้ให้บริการภายนอก (เช่น Google Maps Geocoding API)

**Option 2: Self-hosted Library**
- ใช้ Python library: `pyproj`
- ใช้ JavaScript library: `proj4js`

**แนะนำ: Option 2** (ไม่ต้องพึ่ง external service, ปลอดภัยกว่า)

---

## 🔐 Security & Authentication **New Update:2**

### API Key Management

```typescript
// Environment Variables (Backend)
process.env.ALLRICE_API_KEY = "sk_allrice_xxxxxxxxxxxxx"
process.env.DOA_API_KEY = "doa_api_key_yyyyyyyyyyyyy"
process.env.DOAE_API_KEY = "doae_api_key_zzzzzzzzzzzz"
```

### API Key Storage **New Update:2**

- ✅ เก็บใน `.env` file (ห้าม commit)
- ✅ ใช้ Secret Manager ใน Production
- ❌ ห้าม hardcode ใน source code

### Request Signing (Optional - ถ้า API ต้องการ) **New Update:2**

```typescript
const signature = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(JSON.stringify(requestBody))
  .digest('hex');

headers['X-Signature'] = signature;
```

---

## 🔄 Integration Flow Diagram **New Update:2**

```
┌─────────────────────────────────────────────────────────────┐
│              Smart Agriculture System                       │
└──┬────────────────────┬────────────────────┬────────────────┘
   │                    │                    │
   │ Alert              │ Farmer Data        │ Plot Data
   ▼                    ▼                    ▼
┌──────────────┐   ┌───────────────┐   ┌───────────────┐
│  ALLRice App │   │  กรมการข้าว   │   │   กรมส่งฯ     │
│              │   │  (DOA) API    │   │  (DOAE) API   │
└──────────────┘   └───────────────┘   └───────────────┘
   │                    │                    │
   ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification / Data Sync                       │
│  • Push Notification to Farmers                            │
│  • Sync Farmer Registry                                    │
│  • Import Plot Boundary Data                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Synchronization Strategy **New Update:2**

### 1. Real-time Sync (Alert → ALLRice)

**Trigger:** เมื่อระบบสร้าง Alert ใหม่

```typescript
async function sendAlertToALLRice(alert: Alert) {
  try {
    const response = await fetch('https://allrice-api.example.com/api/v1/notifications/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ALLRICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alert_id: alert.alert_id,
        severity: alert.severity,
        message: alert.alert_message,
        target: alert.target
      })
    });
    
    if (!response.ok) {
      throw new Error(`ALLRice API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Log error และ retry ภายหลัง
    console.error('Failed to send alert to ALLRice:', error);
    // เก็บใน queue สำหรับ retry
    await queueFailedAlert(alert);
  }
}
```

### 2. Batch Sync (Farmer Data)

**Schedule:** ทุกวันเวลา 02:00 AM

```typescript
async function syncFarmerData() {
  const provinces = ['Chiang Mai', 'Bangkok', 'Phuket', /* ... */];
  
  for (const province of provinces) {
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetchFarmersFromDOA(province, page);
      await saveFarmersToDatabase(response.data);
      
      hasMore = page < response.pagination.total_pages;
      page++;
      
      // Rate limiting: พัก 100ms ระหว่าง request
      await sleep(100);
    }
  }
}
```

---

## ⚠️ Error Handling & Retry Logic **New Update:2**

### Retry Strategy

```typescript
async function callExternalAPIWithRetry(
  apiCall: () => Promise<any>,
  maxRetries: number = 3
) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000;
      await sleep(delayMs);
    }
  }
}
```

### Error Logging **New Update:2**

```typescript
interface IntegrationErrorLog {
  service: 'ALLRICE' | 'DOA' | 'DOAE';
  endpoint: string;
  request_body: any;
  response_status?: number;
  error_message: string;
  timestamp: Date;
  retry_count: number;
}

// บันทึก error ลงฐานข้อมูลเพื่อ monitoring
async function logIntegrationError(error: IntegrationErrorLog) {
  await db.integration_errors.insert(error);
}
```

---

## 📝 Integration Checklist **New Update:2**

### ก่อน Production

- [ ] ได้รับ API Key จากทุกระบบภายนอก
- [ ] ทดสอบ API ทั้งหมดใน Staging Environment
- [ ] กำหนด Rate Limiting และ Timeout
- [ ] ตั้งค่า Error Logging และ Monitoring
- [ ] เตรียม Retry Queue สำหรับ failed requests
- [ ] เขียน Integration Tests
- [ ] เตรียม Fallback Plan ถ้า external API down

### Demo Phase

- [ ] ใช้ Mock API สำหรับ external services
- [ ] สร้าง Mock Data สำหรับ Farmer Registry
- [ ] แสดงแนวคิดการเชื่อมต่อผ่าน Diagram
- [ ] อธิบาย Authentication Flow

---

## 🧪 Testing Strategy **New Update:2**

### Unit Tests

```typescript
describe('ALLRice Integration', () => {
  it('should send alert successfully', async () => {
    const alert = createMockAlert();
    const result = await sendAlertToALLRice(alert);
    expect(result.success).toBe(true);
  });
  
  it('should retry on failure', async () => {
    // Mock API ให้ fail 2 ครั้ง แล้ว success ครั้งที่ 3
    const result = await callExternalAPIWithRetry(mockAPICall, 3);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

- ทดสอบกับ Sandbox Environment ของ external APIs
- ตรวจสอบ response format ตรงตาม spec
- ทดสอบ error cases (401, 429, 503)

---

## 📌 หมายเหตุสำหรับ AI Agent

**เมื่อพัฒนา Integration:**

1. ใช้ Environment Variables สำหรับ credentials ทุกครั้ง
2. Implement Retry Logic กับทุก external API call
3. Log ทุก request/response สำหรับ debugging
4. ตั้งค่า Timeout (default: 30 seconds)
5. จัดการ Rate Limiting ตาม API provider

**ใน Demo Phase:**

- ใช้ Mock API แทน real external services
- แสดง Flow Diagram อธิบายการเชื่อมต่อ
- เตรียม Mock Data ที่สมจริง

**ห้าม:**

- Hardcode API Keys ใน source code
- ไม่มี Error Handling
- ไม่มี Timeout
- ไม่ log errors

---

**Next Step:**  
[11-testing-requirements.md](11-testing-requirements.md) - Prototype Testing Requirements

---

**New Update:2 (13/02/2026)**
