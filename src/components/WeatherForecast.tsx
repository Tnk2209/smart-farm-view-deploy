    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Wind, Droplets, Thermometer, Eye } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface WeatherDay {
  date: Date;
  temp: { min: number; max: number };
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  uvIndex: number;
}

// Mock weather forecast data - in real app, this would come from API
const generateMockForecast = (): WeatherDay[] => {
  const baseDate = new Date();
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(baseDate, i),
    temp: {
      min: Math.round(22 + Math.random() * 3),
      max: Math.round(30 + Math.random() * 5),
    },
    humidity: Math.round(60 + Math.random() * 25),
    rainfall: Math.round(Math.random() * 30),
    windSpeed: Math.round(5 + Math.random() * 10),
    condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)] as 'sunny' | 'cloudy' | 'rainy',
    uvIndex: Math.round(3 + Math.random() * 8),
  }));
};

const getWeatherIcon = (condition: string) => {
  switch (condition) {
    case 'sunny':
      return <Sun className="h-8 w-8 text-yellow-500" />;
    case 'cloudy':
      return <Cloud className="h-8 w-8 text-gray-500" />;
    case 'rainy':
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    default:
      return <Cloud className="h-8 w-8" />;
  }
};

const getConditionLabel = (condition: string) => {
  switch (condition) {
    case 'sunny':
      return 'แจ่มใส';
    case 'cloudy':
      return 'มีเมฆ';
    case 'rainy':
      return 'ฝนตก';
    default:
      return 'ไม่ทราบ';
  }
};

export function WeatherForecast() {
  const forecast = generateMockForecast();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          พยากรณ์อากาศ 7 วัน
        </CardTitle>
        <CardDescription>
          การพยากรณ์สภาพอากาศสำหรับพื้นที่สถานี
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {forecast.map((day, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                index === 0 ? 'bg-primary/5 border-primary' : 'bg-muted/30'
              }`}
            >
              <div className="text-center space-y-3">
                {/* Date */}
                <div>
                  <p className="font-semibold">
                    {index === 0 ? 'วันนี้' : format(day.date, 'EEE')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(day.date, 'dd MMM')}
                  </p>
                </div>

                {/* Weather Icon */}
                <div className="flex justify-center py-2">
                  {getWeatherIcon(day.condition)}
                </div>

                {/* Condition */}
                <p className="text-sm font-medium">
                  {getConditionLabel(day.condition)}
                </p>

                {/* Temperature */}
                <div className="flex items-center justify-center gap-1">
                  <Thermometer className="h-4 w-4 text-chart-1" />
                  <span className="text-lg font-bold">{day.temp.max}°</span>
                  <span className="text-sm text-muted-foreground">/ {day.temp.min}°</span>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      <span className="text-muted-foreground">ความชื้น</span>
                    </div>
                    <span className="font-medium">{day.humidity}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <CloudRain className="h-3 w-3 text-blue-600" />
                      <span className="text-muted-foreground">ฝน</span>
                    </div>
                    <span className="font-medium">{day.rainfall} mm</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Wind className="h-3 w-3 text-gray-500" />
                      <span className="text-muted-foreground">ลม</span>
                    </div>
                    <span className="font-medium">{day.windSpeed} km/h</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Sun className="h-3 w-3 text-orange-500" />
                      <span className="text-muted-foreground">UV</span>
                    </div>
                    <span className="font-medium">{day.uvIndex}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium">คำแนะนำการเพาะปลูก</p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                {forecast[0].rainfall > 20
                  ? 'คาดการณ์ว่าจะมีฝนตกหนัก ควรระวังการให้น้ำและระบายน้ำให้ดี'
                  : forecast[0].temp.max > 35
                  ? 'อุณหภูมิสูง ควรให้ความสนใจในการให้น้ำและร่มเงาแก่พืช'
                  : 'สภาพอากาศเหมาะสมสำหรับการเพาะปลูก'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
