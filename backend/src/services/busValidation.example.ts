/**
 * BUS Algorithm Validation Example
 * ตัวอย่างการทดสอบความแม่นยำของ BUS Algorithm ตาม TOR
 * 
 * ตาม TOR ระบุให้:
 * - ใช้ข้อมูลรายชั่วโมง (Temp, RH) 10 วัน
 * - เทียบค่า BUS ที่คำนวณได้กับข้อมูลจริงจากการสำรวจ
 * - คำนวณ MAE (Mean Absolute Error) เพื่อวัดความแม่นยำ
 */

import {
  validateBUSAlgorithm,
  calculateMAE,
  type HourlyData,
  type GroundTruthData,
  type ValidationResult,
} from './busAlgorithm.js';

// ==================== TEST DATASET EXAMPLES ====================

/**
 * ตัวอย่างข้อมูลทดสอบ #1: High Risk Period
 * ช่วงที่มีการระบาดของโรคไหม้จริง (จากการสำรวจภาคสนาม)
 */
const testDataset1 = {
  hourlyData: [
    // Day 1-3: ความชื้นสูง อุณหภูมิเหมาะสม
    ...generateHourlyData(72, { temp: 25, tempVar: 3, rh: 92, rhVar: 5 }),
    // Day 4-7: ยังคงเปียก
    ...generateHourlyData(96, { temp: 26, tempVar: 2, rh: 88, rhVar: 8 }),
    // Day 8-10: แห้งขึ้น
    ...generateHourlyData(72, { temp: 28, tempVar: 3, rh: 75, rhVar: 10 }),
  ],
  groundTruth: {
    period: '2019-09-01 to 2019-09-10',
    actual_bus_score: 3.8, // จากการคำนวณด้วย BUS แบบมาตรฐาน
    actual_disease_severity: 8.5, // ระดับความรุนแรง 0-10 จากการสำรวจ
    infection_rate: 65, // 65% ของแปลงมีอาการ
    location: 'Chiang Mai - Mae Rim Station A',
  },
};

/**
 * ตัวอย่างข้อมูลทดสอบ #2: Low Risk Period
 * ช่วงที่ไม่มีการระบาด (สภาพอากาศไม่เอื้อ)
 */
const testDataset2 = {
  hourlyData: [
    // อุณหภูมิต่ำ ความชื้นปานกลาง
    ...generateHourlyData(240, { temp: 18, tempVar: 4, rh: 70, rhVar: 15 }),
  ],
  groundTruth: {
    period: '2019-10-15 to 2019-10-25',
    actual_bus_score: 0.5,
    actual_disease_severity: 1.2,
    infection_rate: 5,
    location: 'Chiang Mai - Mae Rim Station A',
  },
};

/**
 * ตัวอย่างข้อมูลทดสอบ #3: Medium Risk Period
 */
const testDataset3 = {
  hourlyData: [
    ...generateHourlyData(120, { temp: 24, tempVar: 3, rh: 85, rhVar: 10 }),
    ...generateHourlyData(120, { temp: 27, tempVar: 2, rh: 78, rhVar: 8 }),
  ],
  groundTruth: {
    period: '2019-11-05 to 2019-11-15',
    actual_bus_score: 2.1,
    actual_disease_severity: 4.5,
    infection_rate: 30,
    location: 'Chiang Mai - Mae Rim Station B',
  },
};

// ==================== HELPER FUNCTION ====================

/**
 * Generate synthetic hourly data for testing
 * (ในระบบจริงจะใช้ข้อมูลจริงจากสถานี)
 */
function generateHourlyData(
  hours: number,
  params: { temp: number; tempVar: number; rh: number; rhVar: number }
): HourlyData[] {
  const data: HourlyData[] = [];
  const startDate = new Date('2019-09-01T00:00:00');

  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(startDate);
    timestamp.setHours(timestamp.getHours() + i);

    // เพิ่มความผันแปร (variation) แบบสุ่ม
    const tempVariation = (Math.random() - 0.5) * params.tempVar;
    const rhVariation = (Math.random() - 0.5) * params.rhVar;

    data.push({
      timestamp: timestamp.toISOString(),
      temperature: params.temp + tempVariation,
      humidity: Math.max(0, Math.min(100, params.rh + rhVariation)),
    });
  }

  return data;
}

// ==================== RUN VALIDATION ====================

/**
 * ฟังก์ชันหลักสำหรับทดสอบความแม่นยำ
 */
export function runBUSValidation(): ValidationResult {
  console.log('🧪 Starting BUS Algorithm Validation...\n');

  const testDatasets = [testDataset1, testDataset2, testDataset3];

  const result = validateBUSAlgorithm(testDatasets);

  console.log('📊 Validation Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`MAE (Mean Absolute Error): ${result.mae}`);
  console.log(`RMSE (Root Mean Square Error): ${result.rmse}`);
  console.log(`Correlation Coefficient: ${result.correlation}`);
  console.log(`Sample Size: ${result.sample_size}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Detailed Predictions:');
  result.predictions.forEach((pred, i) => {
    console.log(`\nTest ${i + 1}: ${pred.period}`);
    console.log(`  Predicted BUS: ${pred.predicted.toFixed(2)}`);
    console.log(`  Actual BUS:    ${pred.actual.toFixed(2)}`);
    console.log(`  Error:         ${pred.error.toFixed(2)}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Validation Complete!');

  return result;
}

/**
 * ตัวอย่าง Simple MAE Calculation
 */
export function exampleMAECalculation() {
  console.log('\n📐 Example: MAE Calculation\n');

  const predicted = [3.8, 0.5, 2.1, 4.2, 1.8];
  const actual = [3.5, 0.8, 2.3, 4.0, 2.0];

  console.log('Predicted BUS scores:', predicted);
  console.log('Actual BUS scores:   ', actual);

  const mae = calculateMAE(predicted, actual);

  console.log('\nCalculation Steps:');
  predicted.forEach((pred, i) => {
    const error = Math.abs(pred - actual[i]);
    console.log(`  |${pred} - ${actual[i]}| = ${error.toFixed(2)}`);
  });

  console.log(`\nMAE = Sum of errors / n`);
  console.log(`MAE = ${mae.toFixed(3)}\n`);

  return mae;
}

// ==================== USAGE ====================

/**
 * วิธีใช้งานใน production:
 * 
 * 1. เก็บข้อมูล Ground Truth:
 *    - รวบรวมข้อมูลการเกิดโรคจริงจากการสำรวจภาคสนาม
 *    - บันทึก BUS score จากนักวิจัย/ผู้เชี่ยวชาญ
 * 
 * 2. รวบรวม Test Dataset:
 *    - ดึงข้อมูล Temp/RH รายชั่วโมงช่วงเดียวกัน
 *    - ควรมีอย่างน้อย 30-50 ชุดทดสอบ
 * 
 * 3. Run Validation:
 *    const result = validateBUSAlgorithm(testDatasets);
 *    if (result.mae < 0.5) {
 *      console.log('✅ Algorithm is highly accurate');
 *    }
 * 
 * 4. Continuous Monitoring:
 *    - เทียบ BUS predictions กับ actual disease occurrence
 *    - ปรับปรุง algorithm ถ้า MAE เพิ่มขึ้น
 */

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBUSValidation();
  exampleMAECalculation();
}
