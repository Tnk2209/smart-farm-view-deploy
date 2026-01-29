import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getSensorById, getSensorData, getThresholds, getStationById } from '@/lib/api';
import { Sensor, SensorData, Threshold, Station } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SensorIcon, sensorTypeLabels, sensorTypeUnits } from '@/components/SensorIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Thermometer, ArrowLeft, Calendar, TrendingUp, TrendingDown, 
  Minus, Radio
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig 
} from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';

const chartConfig: ChartConfig = {
  value: { label: 'Value', color: 'hsl(var(--primary))' },
  min: { label: 'Min Threshold', color: 'hsl(var(--chart-4))' },
  max: { label: 'Max Threshold', color: 'hsl(var(--destructive))' },
};

export default function SensorDetail() {
  const { id } = useParams<{ id: string }>();
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [threshold, setThreshold] = useState<Threshold | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const sensorId = parseInt(id);
        const [sensorRes, dataRes, thresholdsRes] = await Promise.all([
          getSensorById(sensorId),
          getSensorData(sensorId),
          getThresholds(),
        ]);

        if (sensorRes.success && sensorRes.data) {
          setSensor(sensorRes.data);
          
          // Fetch station info
          const stationRes = await getStationById(sensorRes.data.station_id);
          if (stationRes.success && stationRes.data) {
            setStation(stationRes.data);
          }

          // Find matching threshold
          if (thresholdsRes.success) {
            const matchingThreshold = thresholdsRes.data.find(
              t => t.sensor_type === sensorRes.data?.sensor_type
            );
            if (matchingThreshold) setThreshold(matchingThreshold);
          }
        }

        if (dataRes.success) {
          setSensorData(dataRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-4">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sensor) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Thermometer className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Sensor Not Found</h2>
          <p className="text-muted-foreground mb-4">The sensor you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/sensors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sensors
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const values = sensorData.map(d => d.value);
  const currentValue = values[values.length - 1] || 0;
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const unit = sensorTypeUnits[sensor.sensor_type];

  // Prepare chart data (last 24 readings for cleaner view)
  const chartData = sensorData.slice(-48).map(d => ({
    time: format(new Date(d.recorded_at), 'HH:mm'),
    value: d.value,
    fullTime: format(new Date(d.recorded_at), 'MMM d, HH:mm'),
  }));

  // Determine trend
  const recentValues = values.slice(-10);
  const oldValues = values.slice(-20, -10);
  const recentAvg = recentValues.length > 0 ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length : 0;
  const oldAvg = oldValues.length > 0 ? oldValues.reduce((a, b) => a + b, 0) / oldValues.length : 0;
  const trend = recentAvg > oldAvg ? 'up' : recentAvg < oldAvg ? 'down' : 'stable';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/sensors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sensors
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <SensorIcon type={sensor.sensor_type} className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {sensorTypeLabels[sensor.sensor_type]} Sensor
                </h1>
                <p className="text-muted-foreground">
                  Sensor ID: #{sensor.sensor_id}
                </p>
              </div>
            </div>
          </div>
          <StatusBadge status={sensor.status} />
        </div>

        {/* Station Link */}
        {station && (
          <Card>
            <CardContent className="py-4">
              <Link 
                to={`/stations/${station.station_id}`}
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <Radio className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{station.station_name}</p>
                  <p className="text-sm text-muted-foreground">{station.province}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {currentValue.toFixed(2)}
                </span>
                <span className="text-muted-foreground">{unit}</span>
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-chart-4" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 text-chart-2" />}
                {trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{avgValue.toFixed(2)}</span>
                <span className="text-muted-foreground">{unit}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Min (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{minValue.toFixed(2)}</span>
                <span className="text-muted-foreground">{unit}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Max (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{maxValue.toFixed(2)}</span>
                <span className="text-muted-foreground">{unit}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sensor Data (Last 12 Hours)</CardTitle>
            <CardDescription>
              {threshold && (
                <span>
                  Threshold: {threshold.min_value} - {threshold.max_value} {unit}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ComposedChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-sm font-medium">{data.fullTime}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.value.toFixed(2)} {unit}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {threshold && (
                  <>
                    <ReferenceLine 
                      y={threshold.min_value} 
                      stroke="hsl(var(--chart-4))" 
                      strokeDasharray="5 5"
                      label={{ value: 'Min', position: 'left', fontSize: 10 }}
                    />
                    <ReferenceLine 
                      y={threshold.max_value} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      label={{ value: 'Max', position: 'left', fontSize: 10 }}
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="hsl(var(--primary)/0.1)"
                  stroke="none"
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Sensor Info */}
        <Card>
          <CardHeader>
            <CardTitle>Sensor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Sensor Type</p>
                <p className="font-medium">{sensorTypeLabels[sensor.sensor_type]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unit</p>
                <p className="font-medium">{unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Installed Date</p>
                <p className="font-medium">
                  {format(new Date(sensor.installed_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={sensor.status} size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
