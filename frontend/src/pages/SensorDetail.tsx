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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [, setUpdateTrigger] = useState(0);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '7d' | '30d'>('12h');

  // Auto-refresh for live data
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
      // Refetch sensor data
      if (id) {
        const now = new Date();
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        getSensorData(parseInt(id), past.toISOString(), now.toISOString()).then(res => {
          if (res.success) setSensorData(res.data);
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const sensorId = parseInt(id);
        const now = new Date();
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        const [sensorRes, dataRes, thresholdsRes] = await Promise.all([
          getSensorById(sensorId),
          getSensorData(sensorId, past.toISOString(), now.toISOString()),
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

  // Filter data based on selected time range
  const getDataForTimeRange = () => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    
    const cutoffTime = now - timeRanges[timeRange];
    return sensorData.filter(d => new Date(d.recorded_at).getTime() >= cutoffTime);
  };

  const filteredData = getDataForTimeRange();

  // Prepare chart data with appropriate sampling
  const getChartData = () => {
    const data = filteredData;
    let samplingRate = 1;
    
    // Adjust sampling based on time range to keep chart readable
    if (timeRange === '7d') samplingRate = 20;
    else if (timeRange === '30d') samplingRate = 60;
    else if (timeRange === '24h') samplingRate = 4;
    else if (timeRange === '12h') samplingRate = 2;
    
    return data
      .filter((_, index) => index % samplingRate === 0)
      .map(d => ({
        time: format(new Date(d.recorded_at), 
          timeRange === '7d' || timeRange === '30d' ? 'MMM d' : 'HH:mm'
        ),
        value: d.value,
        fullTime: format(new Date(d.recorded_at), 'MMM d, HH:mm'),
      }));
  };

  const chartData = getChartData();

  // Time range labels
  const timeRangeLabels = {
    '1h': 'Last Hour',
    '6h': 'Last 6 Hours',
    '12h': 'Last 12 Hours',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
  };

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Sensor Data ({timeRangeLabels[timeRange]})</CardTitle>
                <CardDescription>
                  {threshold && (
                    <span>
                      Threshold: {threshold.min_value} - {threshold.max_value} {unit}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6">
                  <TabsTrigger value="1h" className="text-xs">1H</TabsTrigger>
                  <TabsTrigger value="6h" className="text-xs">6H</TabsTrigger>
                  <TabsTrigger value="12h" className="text-xs">12H</TabsTrigger>
                  <TabsTrigger value="24h" className="text-xs">24H</TabsTrigger>
                  <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                  <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ComposedChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  tickMargin={8}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  tickMargin={8}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  label={{ 
                    value: unit, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
                  }}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {data.fullTime}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {data.value.toFixed(2)} {unit}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                {threshold && (
                  <>
                    <ReferenceLine 
                      y={threshold.max_value} 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{ 
                        value: `Max ${threshold.max_value}`,
                        position: 'insideTopRight',
                        fontSize: 11,
                        fill: 'hsl(var(--destructive))',
                        fontWeight: 600
                      }}
                    />
                    <ReferenceLine 
                      y={threshold.min_value} 
                      stroke="hsl(var(--chart-4))" 
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{ 
                        value: `Min ${threshold.min_value}`,
                        position: 'insideBottomRight',
                        fontSize: 11,
                        fill: 'hsl(var(--chart-4))',
                        fontWeight: 600
                      }}
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="url(#colorValue)"
                  stroke="none"
                  animationDuration={800}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2
                  }}
                  animationDuration={800}
                  animationEasing="ease-in-out"
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
