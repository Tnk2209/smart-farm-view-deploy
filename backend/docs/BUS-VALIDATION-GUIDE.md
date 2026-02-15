# 🧪 BUS Algorithm Validation Strategy

## ❓ คำถามจาก TOR: "เราจะรู้ได้ยังไงว่ามันมีความแม่นยำมากแค่ไหน?"

### สถานะปัจจุบัน (Current Status)
✅ **เราได้:**
- เขียน BUS Algorithm สำเร็จ (7 conditions)
- คำนวณ Dew Point, LWD, BUS Score ได้ถูกต้อง
- มี API endpoints สำหรับคำนวณความเสี่ยง

❌ **สิ่งที่ยังขาด:**
- ข้อมูล Ground Truth (ข้อมูลจริงจากการสำรวจภาคสนาม)
- Test Dataset ตาม TOR (10 วัน: 2019-09-01 ถึง 2019-09-10)
- การเทียบค่า MAE (Mean Absolute Error)

---

## 📊 ตาม TOR ต้องมีอะไรบ้าง?

### จาก TOR ระบุ:
```
ผู้เข้าทดสอบจะได้รับข้อมูล Temp และ Humidity รายชั่วโมง 
เป็นระยะเวลา 10 วัน (2019-09-01 ถึง 2019-09-10)

และผู้เข้าทดสอบจะต้องคำนวนค่า Blast Unit of Severity (BUS) 
ใน 10 วันดังกล่าว โดยวัดความแม่นยำจากค่า Mean Absolute Error (MAE) 
หากมีค่า MAE น้อยที่สุด จะถือว่ามีความแม่นยำมากที่สุด
```

### สิ่งที่ต้องมี:
1. **Input Data (ข้อมูลทดสอบ)**
   - 📅 10 วัน × 24 ชั่วโมง = 240 data points
   - 🌡️ Temperature รายชั่วโมง (air_temp_c)
   - 💧 Humidity รายชั่วโมง (air_rh_pct)

2. **Ground Truth (ข้อมูลอ้างอิง)**
   - BUS Score จริงที่คำนวณโดยผู้เชี่ยวชาญ/นักวิจัย
   - หรือข้อมูลการเกิดโรคจริงจากการสำรวจแปลง
   - ระดับความรุนแรงของโรค (Disease Severity Index)

3. **Validation Metrics**
   - MAE (Mean Absolute Error) - ค่าความคลาดเคลื่อนเฉลี่ย
   - RMSE (Root Mean Square Error) - ประมาณค่าความแม่นยำ
   - Correlation - ความสัมพันธ์ระหว่างค่าทำนายกับค่าจริง

---

## 🔢 MAE คืออะไร? คำนวณยังไง?

### Mean Absolute Error (MAE)
```
MAE = (1/n) × Σ|predicted - actual|
    = ค่าเฉลี่ยของความต่างสัมบูรณ์
```

### ตัวอย่าง:
```javascript
// สมมติว่าเรามี 5 ชุดทดสอบ:

Predicted BUS:  [3.8, 0.5, 2.1, 4.2, 1.8]
Actual BUS:     [3.5, 0.8, 2.3, 4.0, 2.0]

// คำนวณ error แต่ละชุด:
Error 1: |3.8 - 3.5| = 0.3
Error 2: |0.5 - 0.8| = 0.3
Error 3: |2.1 - 2.3| = 0.2
Error 4: |4.2 - 4.0| = 0.2
Error 5: |1.8 - 2.0| = 0.2

// MAE = (0.3 + 0.3 + 0.2 + 0.2 + 0.2) / 5 = 0.24
```

### การตีความ MAE:
- **MAE < 0.5** → อัลกอริทึมแม่นยำมาก ✅
- **MAE 0.5 - 1.0** → แม่นยำในระดับดี 👍
- **MAE > 1.0** → ควรปรับปรุง algorithm 🔧

---

## 🧪 วิธีการทำ Validation

### **Phase 1: Data Collection (รวบรวมข้อมูล)**

#### A. Historical Weather Data
```sql
-- ดึงข้อมูล Temp/RH จาก sensor_data
SELECT 
  DATE_TRUNC('hour', recorded_at) AS hour,
  AVG(temp.value) AS temperature,
  AVG(hum.value) AS humidity
FROM sensor_data temp
JOIN sensor_data hum ON ...
WHERE recorded_at BETWEEN '2019-09-01' AND '2019-09-10'
GROUP BY hour
ORDER BY hour;
```

#### B. Ground Truth Data (ข้อมูลอ้างอิง)
ต้องได้มาจาก:
- **งานวิจัยทางการเกษตร** - Paper/Journal ที่มี BUS score จริง
- **กรมการข้าว** - ข้อมูลการระบาดจริงในปี 2019
- **ผู้เชี่ยวชาญ** - นักวิจัยคำนวณ BUS แบบมาตรฐาน
- **Field Survey** - สำรวจแปลงจริง บันทึกอาการโรค

ตัวอย่าง Ground Truth:
```typescript
{
  period: "2019-09-01 to 2019-09-10",
  location: "Chiang Mai - Mae Rim",
  actual_bus_score: 3.5,
  disease_severity_index: 7.8,
  infection_rate_percent: 60,
  data_source: "Rice Department Field Survey"
}
```

---

### **Phase 2: Algorithm Validation (ทดสอบความแม่นยำ)**

#### Step 1: Prepare Test Datasets
```typescript
const testDatasets = [
  {
    hourlyData: [...],  // 240 hours of Temp/RH
    groundTruth: {
      period: "2019-09-01 to 2019-09-10",
      actual_bus_score: 3.5,
    }
  },
  // ... อีก 10-50 ชุดทดสอบ
];
```

#### Step 2: Run Validation
```typescript
import { validateBUSAlgorithm } from './services/busAlgorithm';

const result = validateBUSAlgorithm(testDatasets);

console.log(`MAE:  ${result.mae}`);
console.log(`RMSE: ${result.rmse}`);
console.log(`Correlation: ${result.correlation}`);
```

#### Step 3: Analyze Results
```typescript
if (result.mae < 0.5) {
  console.log('✅ Algorithm is highly accurate!');
} else if (result.mae < 1.0) {
  console.log('👍 Good accuracy, minor tuning needed');
} else {
  console.log('🔧 Need algorithm improvement');
}
```

---

### **Phase 3: Continuous Monitoring (ติดตามต่อเนื่อง)**

#### A. Real-time Validation
```typescript
// เมื่อมีรายงานการเกิดโรคจริง
const predicted = calculateBUS(hourlyData).bus_score;
const actual = fieldSurveyReport.disease_severity;

// บันทึก error
database.store({
  prediction_date: '2026-02-15',
  predicted_bus: predicted,
  actual_severity: actual,
  error: Math.abs(predicted - actual),
});

// คำนวณ MAE ทุกเดือน
const monthlyMAE = calculateMAE(monthly_predictions, monthly_actuals);
```

#### B. Algorithm Tuning
หาก MAE เพิ่มขึ้น → ปรับ parameters:
- Threshold สำหรับ LWD
- Temperature ranges
- BUS condition weights

---

## 📁 ไฟล์ที่เพิ่มเข้ามา

### 1. `busAlgorithm.ts` (Updated)
```typescript
// เพิ่ม interfaces:
- GroundTruthData
- ValidationResult

// เพิ่ม functions:
- calculateMAE()
- calculateRMSE()
- calculateCorrelation()
- validateBUSAlgorithm()
```

### 2. `busValidation.example.ts` (New)
```typescript
// ตัวอย่างการใช้งาน:
- exampleMAECalculation()
- runBUSValidation()
- generateHourlyData() // helper for testing
```

---

## 🎯 Action Plan สำหรับ Production

### ขั้นตอนที่ควรทำต่อ:

#### 1️⃣ **ขอข้อมูล Ground Truth**
```
📧 ติดต่อ:
- กรมการข้าว (Rice Department)
- มหาวิทยาลัยที่มีงานวิจัยโรคข้าว
- ศูนย์วิจัยข้าว (Rice Research Center)

📋 ขอข้อมูล:
- Historical disease outbreak data ปี 2019
- BUS scores จากการคำนวณมาตรฐาน
- Weather data + disease severity index
```

#### 2️⃣ **สร้าง Test Dataset**
```typescript
// เก็บข้อมูลไว้ใน database table ใหม่:
CREATE TABLE bus_ground_truth (
  id SERIAL PRIMARY KEY,
  period_start DATE,
  period_end DATE,
  station_id INT,
  actual_bus_score DECIMAL(5,2),
  disease_severity_index DECIMAL(5,2),
  infection_rate_percent DECIMAL(5,2),
  data_source VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3️⃣ **สร้าง Validation API Endpoint**
```typescript
// routes/validation.ts
router.post('/api/validation/run-bus-test', async (req, res) => {
  // 1. ดึง test datasets จาก database
  // 2. Run validateBUSAlgorithm()
  // 3. Return MAE, RMSE, correlation
});
```

#### 4️⃣ **สร้าง Validation Dashboard**
```tsx
// pages/ValidationDashboard.tsx
- แสดง MAE timeline
- Plot: Predicted vs Actual
- Accuracy metrics
- Test results table
```

---

## 💡 ตัวอย่าง Use Case จริง

### Scenario: กรมการข้าวต้องการตรวจสอบ

```
1. กรมการข้าวมีข้อมูล:
   - เมื่อวันที่ 2019-09-10 พบโรคไหม้ระบาดหนักที่อำเภอแม่ริม
   - Disease Severity Index: 8.5/10
   - Infection Rate: 65% ของแปลง

2. ระบบของเรา:
   - ดึงข้อมูล Temp/RH ย้อนหลัง 10 วัน (Sep 1-10)
   - คำนวณ BUS = 3.8

3. การเทียบเทียบ:
   - ถ้า BUS 3.8 สอดคล้องกับ Severity 8.5
   - แปลงเป็น scale เดียวกัน: 8.5/10 × 5 = 4.25
   
4. MAE Calculation:
   - |3.8 - 4.25| = 0.45
   - MAE < 0.5 → ถือว่าแม่นยำ! ✅

5. ถ้ามีหลายชุดทดสอบ (30 ชุด):
   - MAE เฉลี่ย = 0.52
   - Correlation = 0.87
   - → Algorithm ใช้งานได้ดี!
```

---

## 🚀 Next Steps

### สิ่งที่ควรทำทันที:
1. ✅ เขียน validation functions (เสร็จแล้ว)
2. ✅ สร้างตัวอย่างการใช้งาน (เสร็จแล้ว)
3. ⏳ ขอข้อมูล Ground Truth จากกรมการข้าว
4. ⏳ สร้าง database table สำหรับเก็บ test data
5. ⏳ สร้าง validation API endpoint
6. ⏳ สร้าง validation dashboard

### สิ่งที่ต้องหาจากภายนอก:
- 📊 Historical disease data (2019)
- 🧑‍🔬 Expert BUS calculations
- 🌾 Field survey reports
- 📈 Disease outbreak records

---

## 🎓 สรุป

### คำถาม: "เราจะรู้ได้ยังไงว่ามีความแม่นยำ?"

**คำตอบ:**
1. ต้องมี **Ground Truth** (ข้อมูลจริง) มาเทียบ
2. ใช้ **MAE** (Mean Absolute Error) วัดความคลาดเคลื่อน
3. ต้องมี **Test Dataset** หลายชุด (≥30 ชุด)
4. **Validate** อย่างต่อเนื่องกับข้อมูลใหม่

### สถานะปัจจุบัน:
✅ Algorithm พร้อมใช้งาน  
✅ Validation functions พร้อม  
⏳ รอข้อมูล Ground Truth  
⏳ รอสร้าง validation pipeline  

### ระบบจริงต้องมี:
```
Sensor Data → BUS Prediction → Compare with Actual → Calculate MAE → Improve
    ↑                                                                    │
    └────────────────────── Feedback Loop ──────────────────────────────┘
```
