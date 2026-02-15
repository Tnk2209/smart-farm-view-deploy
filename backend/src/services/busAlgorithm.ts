/**
 * BUS Algorithm Service
 * Blast Unit of Severity - Disease Risk Calculation
 * Based on UCAR formula and 7-condition rules
 */

export interface HourlyData {
  timestamp: string;
  temperature: number; // air_temp_c
  humidity: number; // air_rh_pct
}

export interface BUSResult {
  bus_score: number;
  risk_level: 'low' | 'medium' | 'high';
  dew_point_avg: number;
  lwd_hours: number;
  temperature_avg: number;
  humidity_avg: number;
  days_analyzed: number;
}

/**
 * Ground Truth Data for Validation
 * ข้อมูลจริงจากการสำรวจภาคสนาม (Field Survey)
 */
export interface GroundTruthData {
  period: string; // เช่น "2019-09-01 to 2019-09-10"
  actual_disease_severity: number; // ค่าจริงของความรุนแรงโรค (0-10 scale)
  actual_bus_score?: number; // BUS score จากการวิจัย (ถ้ามี)
  infection_rate?: number; // อัตราการติดเชื้อ (%) จากการสำรวจ
  location: string;
}

/**
 * Validation Result with MAE
 * ผลการเปรียบเทียบความแม่นยำ
 */
export interface ValidationResult {
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  correlation: number; // Correlation coefficient
  sample_size: number;
  predictions: Array<{
    predicted: number;
    actual: number;
    error: number;
    period: string;
  }>;
}

/**
 * Calculate Dew Point using UCAR formula
 * Td = T - (100 - RH) / 5
 */
export function calculateDewPoint(temperature: number, humidity: number): number {
  return temperature - (100 - humidity) / 5;
}

/**
 * Calculate Leaf Wetness Duration (LWD)
 * LWD = number of hours where RH > 90%
 */
export function calculateLWD(hourlyData: HourlyData[]): number {
  return hourlyData.filter(data => data.humidity > 90).length;
}

/**
 * Calculate BUS Score according to 7 conditions:
 * 1. If Temp < 15°C or > 38°C → BUS = 0
 * 2. If LWD < 4 hours → BUS = 0
 * 3. If Temp > 14°C → BUS = LWD / 4
 * 4. If RH > 90% for more than 16 hours → BUS = BUS + (hours_RH>90 - 12) / 6
 * 5. If Temp < 23°C or > 26°C → BUS = BUS - 2
 * 6. If Temp < 19°C or > 29°C → BUS = BUS - 2
 * 7. If BUS < 0 → BUS = 0
 */
export function calculateBUS(hourlyData: HourlyData[]): BUSResult {
  if (hourlyData.length === 0) {
    return {
      bus_score: 0,
      risk_level: 'low',
      dew_point_avg: 0,
      lwd_hours: 0,
      temperature_avg: 0,
      humidity_avg: 0,
      days_analyzed: 0,
    };
  }

  // Calculate averages
  const temperature_avg = hourlyData.reduce((sum, d) => sum + d.temperature, 0) / hourlyData.length;
  const humidity_avg = hourlyData.reduce((sum, d) => sum + d.humidity, 0) / hourlyData.length;
  
  // Calculate average dew point
  const dewPoints = hourlyData.map(d => calculateDewPoint(d.temperature, d.humidity));
  const dew_point_avg = dewPoints.reduce((sum, td) => sum + td, 0) / dewPoints.length;

  // Calculate LWD (hours with RH > 90%)
  const lwd_hours = calculateLWD(hourlyData);

  // BUS Calculation - 7 Conditions
  let bus = 0;

  // Condition 1: If Temp < 15°C or > 38°C → BUS = 0
  if (temperature_avg < 15 || temperature_avg > 38) {
    return {
      bus_score: 0,
      risk_level: 'low',
      dew_point_avg,
      lwd_hours,
      temperature_avg,
      humidity_avg,
      days_analyzed: hourlyData.length / 24,
    };
  }

  // Condition 2: If LWD < 4 hours → BUS = 0
  if (lwd_hours < 4) {
    return {
      bus_score: 0,
      risk_level: 'low',
      dew_point_avg,
      lwd_hours,
      temperature_avg,
      humidity_avg,
      days_analyzed: hourlyData.length / 24,
    };
  }

  // Condition 3: If Temp > 14°C → BUS = LWD / 4
  if (temperature_avg > 14) {
    bus = lwd_hours / 4;
  }

  // Condition 4: If RH > 90% for more than 16 hours → BUS = BUS + (hours_RH>90 - 12) / 6
  if (lwd_hours > 16) {
    bus = bus + (lwd_hours - 12) / 6;
  }

  // Condition 5: If Temp < 23°C or > 26°C → BUS = BUS - 2
  if (temperature_avg < 23 || temperature_avg > 26) {
    bus = bus - 2;
  }

  // Condition 6: If Temp < 19°C or > 29°C → BUS = BUS - 2
  if (temperature_avg < 19 || temperature_avg > 29) {
    bus = bus - 2;
  }

  // Condition 7: If BUS < 0 → BUS = 0
  if (bus < 0) {
    bus = 0;
  }

  // Determine risk level based on BUS ≥ 2.25
  let risk_level: 'low' | 'medium' | 'high';
  if (bus >= 2.25) {
    risk_level = 'high';
  } else if (bus >= 1.5) {
    risk_level = 'medium';
  } else {
    risk_level = 'low';
  }

  return {
    bus_score: Math.round(bus * 100) / 100, // Round to 2 decimal places
    risk_level,
    dew_point_avg: Math.round(dew_point_avg * 100) / 100,
    lwd_hours,
    temperature_avg: Math.round(temperature_avg * 100) / 100,
    humidity_avg: Math.round(humidity_avg * 100) / 100,
    days_analyzed: hourlyData.length / 24,
  };
}

// ==================== VALIDATION & ACCURACY TESTING ====================

/**
 * Calculate Mean Absolute Error (MAE)
 * MAE = (1/n) * Σ|predicted - actual|
 * 
 * ใช้สำหรับวัดความแม่นยำของ BUS Algorithm
 * ตาม TOR ที่ระบุให้เทียบค่า MAE กับข้อมูลจริง
 */
export function calculateMAE(predictions: number[], actuals: number[]): number {
  if (predictions.length !== actuals.length || predictions.length === 0) {
    throw new Error('Predictions and actuals must have the same non-zero length');
  }

  const sumAbsoluteErrors = predictions.reduce((sum, pred, i) => {
    return sum + Math.abs(pred - actuals[i]);
  }, 0);

  return sumAbsoluteErrors / predictions.length;
}

/**
 * Calculate Root Mean Square Error (RMSE)
 * RMSE = √[(1/n) * Σ(predicted - actual)²]
 */
export function calculateRMSE(predictions: number[], actuals: number[]): number {
  if (predictions.length !== actuals.length || predictions.length === 0) {
    throw new Error('Predictions and actuals must have the same non-zero length');
  }

  const sumSquaredErrors = predictions.reduce((sum, pred, i) => {
    const error = pred - actuals[i];
    return sum + (error * error);
  }, 0);

  return Math.sqrt(sumSquaredErrors / predictions.length);
}

/**
 * Calculate Pearson Correlation Coefficient
 * r = Σ[(x - x̄)(y - ȳ)] / √[Σ(x - x̄)² * Σ(y - ȳ)²]
 */
export function calculateCorrelation(predictions: number[], actuals: number[]): number {
  if (predictions.length !== actuals.length || predictions.length === 0) {
    return 0;
  }

  const n = predictions.length;
  const predMean = predictions.reduce((sum, val) => sum + val, 0) / n;
  const actualMean = actuals.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let predSumSq = 0;
  let actualSumSq = 0;

  for (let i = 0; i < n; i++) {
    const predDiff = predictions[i] - predMean;
    const actualDiff = actuals[i] - actualMean;
    numerator += predDiff * actualDiff;
    predSumSq += predDiff * predDiff;
    actualSumSq += actualDiff * actualDiff;
  }

  const denominator = Math.sqrt(predSumSq * actualSumSq);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Validate BUS Algorithm against Ground Truth Data
 * เทียบผล BUS ที่คำนวณได้กับข้อมูลจริงจากภาคสนาม
 * 
 * @param testDatasets - ชุดข้อมูลทดสอบ (Hourly Temp/Humidity + Ground Truth)
 * @returns ValidationResult with MAE, RMSE, and correlation
 */
export function validateBUSAlgorithm(
  testDatasets: Array<{
    hourlyData: HourlyData[];
    groundTruth: GroundTruthData;
  }>
): ValidationResult {
  const predictions: number[] = [];
  const actuals: number[] = [];
  const details: Array<{
    predicted: number;
    actual: number;
    error: number;
    period: string;
  }> = [];

  // คำนวณ BUS สำหรับแต่ละชุดทดสอบ
  for (const dataset of testDatasets) {
    const busResult = calculateBUS(dataset.hourlyData);
    const predicted = busResult.bus_score;
    const actual = dataset.groundTruth.actual_bus_score || 
                    dataset.groundTruth.actual_disease_severity;

    predictions.push(predicted);
    actuals.push(actual);
    details.push({
      predicted,
      actual,
      error: Math.abs(predicted - actual),
      period: dataset.groundTruth.period,
    });
  }

  // คำนวณค่าความแม่นยำ
  const mae = calculateMAE(predictions, actuals);
  const rmse = calculateRMSE(predictions, actuals);
  const correlation = calculateCorrelation(predictions, actuals);

  return {
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    correlation: Math.round(correlation * 1000) / 1000,
    sample_size: testDatasets.length,
    predictions: details,
  };
}

