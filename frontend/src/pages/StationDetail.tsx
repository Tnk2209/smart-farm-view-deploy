import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StationHealth } from '@/components/StationHealth';
import { getStationById, getStationLatestData, getAlerts, getAlertsByStationId, getLockStatus, sendLockCommand, getRiskDashboardSummary, getStationStatusRange } from '@/lib/api';
import { Station, Sensor, Alert, LockStatusData, RiskDashboardSummary, PillarType, StationStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SensorIcon, sensorTypeLabels, sensorTypeUnits } from '@/components/SensorIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Radio, MapPin, Thermometer, AlertTriangle, ArrowLeft, ArrowRight,
  Calendar, ExternalLink, Edit, Lock, Unlock, Shield, Clock,
  Droplets, Wind, CloudRain, Bug, Activity, Battery, Zap
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, subHours, subDays, subMinutes, isSameMinute, addMinutes, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSensorData } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter } from "lucide-react"

// Colors for chart lines
const CHART_COLORS = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#16a34a', // green-600
  '#d97706', // amber-600
  '#9333ea', // purple-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#f97316', // orange-600
  '#f59e0b', // yellow-600
  '#c80000ff', // red-600
  '#15c8ffff', // green-600
];

// Baseline Y positions for each sensor type (for timeline chart)
const SENSOR_BASELINES: Record<string, number> = {
  wind_speed_ms: 8,
  air_temp_c: 7,
  air_rh_pct: 6,
  air_pressure_kpa: 5,
  rain_rate_mmph: 4,
  rain_mm: 3,
  soil_rh_pct: 2,
  soil_temp_c: 1,
};

// Baseline Y positions for device status fields
const STATUS_BASELINES: Record<string, number> = {
  batt_v: 12,
  batt_cap: 11,
  batt_temp_c: 10,
  pv_v: 9,
  pv_a: 8,
  load_w: 7,
  load_a: 6,
  load_v: 5,
  chg_a: 4,
  cbn_temp_c: 3,
  cbn_rh_pct: 2,
  ctrl_temp_c: 1,
};

// Valid ranges to determine if sensor/status is working normally
const SENSOR_VALID_RANGES: Record<string, { min: number; max: number }> = {
  wind_speed_ms: { min: 0, max: 50 },
  air_temp_c: { min: -10, max: 60 },
  air_rh_pct: { min: 0, max: 100 },
  air_pressure_kpa: { min: 80, max: 120 },
  rain_rate_mmph: { min: 0, max: 200 },
  rain_mm: { min: 0, max: 500 },
  soil_rh_pct: { min: 0, max: 100 },
  soil_temp_c: { min: -5, max: 60 },
};

const STATUS_VALID_RANGES: Record<string, { min: number; max: number }> = {
  batt_v: { min: 8, max: 16 },
  batt_cap: { min: 0, max: 100 },
  batt_temp_c: { min: -10, max: 70 },
  pv_v: { min: 0, max: 30 },
  pv_a: { min: 0, max: 20 },
  load_w: { min: 0, max: 300 },
  load_a: { min: 0, max: 30 },
  load_v: { min: 0, max: 20 },
  chg_a: { min: 0, max: 20 },
  cbn_temp_c: { min: -10, max: 70 },
  cbn_rh_pct: { min: 0, max: 100 },
  ctrl_temp_c: { min: -10, max: 80 },
};

// Check if value is valid (returns baseline if valid, 0 if invalid)
const getStatusValue = (value: number | null | undefined, validRange: { min: number; max: number }, baseline: number): number => {
  if (value === null || value === undefined) return 0;
  if (value >= validRange.min && value <= validRange.max) return baseline;
  return 0; // Invalid/problem - drop to 0
};

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [station, setStation] = useState<Station | null>(null);
  const [latestData, setLatestData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission, user } = useAuth();

  // Risk Data State
  const [riskData, setRiskData] = useState<RiskDashboardSummary | null>(null);

  // Lock Control State
  const [lockStatus, setLockStatus] = useState<LockStatusData | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'lock' | 'unlock' | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'sensors' | 'deviceStatus'>('sensors');

  // Chart State
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [visibleSensorIds, setVisibleSensorIds] = useState<string[]>([]);
  const [visibleStatusFields, setVisibleStatusFields] = useState<string[]>(['batt_v', 'batt_cap', 'pv_v', 'load_w']);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [statusHistoryData, setStatusHistoryData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    // ... existing fetch logic (unchanged) ...
    // Note: I am NOT changing the initial fetch logic here, just the chart logic below.
    const fetchData = async () => {
      // ... same as before ...
      if (!id) return;
      setLoading(true);
      try {
        const stationId = parseInt(id);
        const [stationRes, latestDataRes, alertsRes, lockStatusRes, riskRes] = await Promise.all([
          getStationById(stationId),
          getStationLatestData(stationId),
          getAlertsByStationId(stationId, 50), // Fetch more to ensure we have recent ones, client can slice
          getLockStatus(stationId),
          getRiskDashboardSummary(10),
        ]);

        if (stationRes.success && stationRes.data) setStation(stationRes.data);
        if (latestDataRes.success && latestDataRes.data) setLatestData(latestDataRes.data);
        if (alertsRes.success && alertsRes.data) {
          // No need to filter by ID anymore, API handles it
          setAlerts(alertsRes.data.slice(0, 5));
        }
        if (lockStatusRes.success && lockStatusRes.data) setLockStatus(lockStatusRes.data);
        if (riskRes.success && riskRes.data) setRiskData(riskRes.data);

      } catch (error) {
        console.error('Failed to fetch station data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (latestData.length > 0 && visibleSensorIds.length === 0) {
      const validSensors = latestData
        .filter(d => d.sensor.sensor_type !== 'gate_door')
        .map(d => d.sensor.sensor_id.toString());
      setVisibleSensorIds(validSensors);
    }
  }, [latestData]);

  // Fetch history for ALL sensors when timeRange changes or station loads
  useEffect(() => {
    const fetchAllHistory = async () => {
      const validSensors = latestData.filter(d => d.sensor.sensor_type !== 'gate_door');
      if (validSensors.length === 0) return;

      setChartLoading(true);
      try {
        const endDate = new Date();
        let startDate = new Date();
        let windowSizeMs = 60 * 60 * 1000; // Default 1 hour

        switch (timeRange) {
          case '30m':
            startDate = subMinutes(endDate, 30);
            windowSizeMs = 1 * 60 * 1000; // 1 min
            break;
          case '1h':
            startDate = subHours(endDate, 1);
            windowSizeMs = 1 * 60 * 1000; // 1 min
            break;
          case '3h':
            startDate = subHours(endDate, 3);
            windowSizeMs = 5 * 60 * 1000; // 5 min
            break;
          case '6h':
            startDate = subHours(endDate, 6);
            windowSizeMs = 10 * 60 * 1000; // 10 min
            break;
          case '24h':
            startDate = subHours(endDate, 24);
            windowSizeMs = 30 * 60 * 1000; // 30 min
            break;
          case '3d':
            startDate = subDays(endDate, 3);
            windowSizeMs = 2 * 60 * 60 * 1000; // 2 hours
            break;
          case '7d':
            startDate = subDays(endDate, 7);
            windowSizeMs = 6 * 60 * 60 * 1000; // 6 hours
            break;
          case '14d':
            startDate = subDays(endDate, 14);
            windowSizeMs = 12 * 60 * 60 * 1000; // 12 hours
            break;
          case '30d':
            startDate = subDays(endDate, 30);
            windowSizeMs = 24 * 60 * 60 * 1000; // 24 hours
            break;
          default:
            startDate = subHours(endDate, 24);
        }

        // Fetch all concurrently
        const promises = validSensors.map(item =>
          getSensorData(item.sensor.sensor_id, startDate.toISOString(), endDate.toISOString())
        );

        const results = await Promise.all(promises);

        // Merge Logic with Status Timeline
        let allPoints: any[] = [];
        results.forEach((res, index) => {
          if (res.success && res.data) {
            const sensorId = validSensors[index].sensor.sensor_id.toString();
            const sensorType = validSensors[index].sensor.sensor_type;
            const baseline = SENSOR_BASELINES[sensorType] || 1;
            const validRange = SENSOR_VALID_RANGES[sensorType] || { min: 0, max: 100 };
            
            const data = res.data.map(d => ({
              ...d,
              sensorId,
              sensorType,
              timeMs: new Date(d.recorded_at).getTime(),
              rawValue: d.value,
              statusValue: getStatusValue(d.value, validRange, baseline)
            }));
            allPoints = [...allPoints, ...data];
          }
        });

        if (allPoints.length === 0) {
          setHistoryData([]);
          return;
        }

        // Sort by time
        allPoints.sort((a, b) => a.timeMs - b.timeMs);

        const mergedData: any[] = [];
        let currentBucket: any = null;

        allPoints.forEach(point => {
          const bucketTime = Math.floor(point.timeMs / windowSizeMs) * windowSizeMs;

          if (!currentBucket || currentBucket.bucketTime !== bucketTime) {
            if (currentBucket) mergedData.push(currentBucket);

            // Format time based on range
            let timeFormat = 'HH:mm';
            if (['3d', '7d', '14d', '30d'].includes(timeRange)) {
              timeFormat = 'MMM d HH:mm';
            }
            if (['30d'].includes(timeRange)) {
              timeFormat = 'MMM d';
            }

            currentBucket = {
              bucketTime,
              time: format(new Date(bucketTime), timeFormat),
              originalDate: new Date(bucketTime).toISOString()
            };
          }

          // Store both status value (baseline or 0) and raw values
          currentBucket[point.sensorId] = point.statusValue;
          currentBucket[`${point.sensorId}_raw`] = point.rawValue;
          currentBucket[`${point.sensorId}_type`] = point.sensorType;
        });
        if (currentBucket) mergedData.push(currentBucket);

        setHistoryData(mergedData);

      } catch (error) {
        console.error('Failed to fetch history:', error);
        setHistoryData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchAllHistory();

  }, [timeRange, latestData]); // Re-fetch if timeRange changes or station data reloads

  // Fetch Station Status History when activeTab is 'deviceStatus'
  useEffect(() => {
    if (activeTab !== 'deviceStatus' || !id) return;

    const fetchStatusHistory = async () => {
      setChartLoading(true);
      try {
        const stationId = parseInt(id);
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
          case '30m':
            startDate = subMinutes(endDate, 30);
            break;
          case '1h':
            startDate = subHours(endDate, 1);
            break;
          case '3h':
            startDate = subHours(endDate, 3);
            break;
          case '6h':
            startDate = subHours(endDate, 6);
            break;
          case '24h':
            startDate = subHours(endDate, 24);
            break;
          case '3d':
            startDate = subDays(endDate, 3);
            break;
          case '7d':
            startDate = subDays(endDate, 7);
            break;
          case '14d':
            startDate = subDays(endDate, 14);
            break;
          case '30d':
            startDate = subDays(endDate, 30);
            break;
          default:
            startDate = subHours(endDate, 24);
        }

        const response = await getStationStatusRange(
          stationId,
          startDate.toISOString(),
          endDate.toISOString()
        );

        if (response.success && response.data) {
          // Format status data for chart with normalization
          const formattedData = response.data.map(status => {
            let timeFormat = 'HH:mm';
            if (['3d', '7d', '14d', '30d'].includes(timeRange)) {
              timeFormat = 'MMM d HH:mm';
            }
            if (['30d'].includes(timeRange)) {
              timeFormat = 'MMM d';
            }

            return {
              time: format(new Date(status.recorded_at), timeFormat),
              originalDate: status.recorded_at,
              // Status values (baseline or 0)
              batt_v: getStatusValue(status.batt_v, STATUS_VALID_RANGES.batt_v, STATUS_BASELINES.batt_v),
              batt_cap: getStatusValue(status.batt_cap, STATUS_VALID_RANGES.batt_cap, STATUS_BASELINES.batt_cap),
              batt_temp_c: getStatusValue(status.batt_temp_c, STATUS_VALID_RANGES.batt_temp_c, STATUS_BASELINES.batt_temp_c),
              pv_v: getStatusValue(status.pv_v, STATUS_VALID_RANGES.pv_v, STATUS_BASELINES.pv_v),
              pv_a: getStatusValue(status.pv_a, STATUS_VALID_RANGES.pv_a, STATUS_BASELINES.pv_a),
              load_w: getStatusValue(status.load_w, STATUS_VALID_RANGES.load_w, STATUS_BASELINES.load_w),
              load_a: getStatusValue(status.load_a, STATUS_VALID_RANGES.load_a, STATUS_BASELINES.load_a),
              load_v: getStatusValue(status.load_v, STATUS_VALID_RANGES.load_v, STATUS_BASELINES.load_v),
              chg_a: getStatusValue(status.chg_a, STATUS_VALID_RANGES.chg_a, STATUS_BASELINES.chg_a),
              cbn_temp_c: getStatusValue(status.cbn_temp_c, STATUS_VALID_RANGES.cbn_temp_c, STATUS_BASELINES.cbn_temp_c),
              cbn_rh_pct: getStatusValue(status.cbn_rh_pct, STATUS_VALID_RANGES.cbn_rh_pct, STATUS_BASELINES.cbn_rh_pct),
              ctrl_temp_c: getStatusValue(status.ctrl_temp_c, STATUS_VALID_RANGES.ctrl_temp_c, STATUS_BASELINES.ctrl_temp_c),
              // Raw values (for tooltip)
              batt_v_raw: status.batt_v,
              batt_cap_raw: status.batt_cap,
              batt_temp_c_raw: status.batt_temp_c,
              pv_v_raw: status.pv_v,
              pv_a_raw: status.pv_a,
              load_w_raw: status.load_w,
              load_a_raw: status.load_a,
              load_v_raw: status.load_v,
              chg_a_raw: status.chg_a,
              cbn_temp_c_raw: status.cbn_temp_c,
              cbn_rh_pct_raw: status.cbn_rh_pct,
              ctrl_temp_c_raw: status.ctrl_temp_c,
            };
          });

          setStatusHistoryData(formattedData);
        } else {
          setStatusHistoryData([]);
        }
      } catch (error) {
        console.error('Failed to fetch status history:', error);
        setStatusHistoryData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchStatusHistory();
  }, [timeRange, activeTab, id]);

  const toggleSensorVisibility = (sensorId: string) => {
    setVisibleSensorIds(prev =>
      prev.includes(sensorId)
        ? prev.filter(id => id !== sensorId)
        : [...prev, sensorId]
    );
  };

  const toggleStatusFieldVisibility = (field: string) => {
    setVisibleStatusFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleLockAction = (action: 'lock' | 'unlock') => {
    setPendingAction(action);
    setShowConfirmDialog(true);
  };

  const confirmLockAction = async () => {
    if (!pendingAction || !id) return;

    setLockLoading(true);
    setShowConfirmDialog(false);

    try {
      const stationId = parseInt(id);
      const response = await sendLockCommand(stationId, pendingAction);

      if (response.success) {
        toast({
          title: 'Success!',
          description: `${pendingAction === 'lock' ? 'Lock' : 'Unlock'} command sent successfully`,
        });

        // Refresh lock status after short delay (simulate device response)
        setTimeout(async () => {
          const lockStatusRes = await getLockStatus(stationId);
          if (lockStatusRes.success && lockStatusRes.data) {
            setLockStatus(lockStatusRes.data);
          }
        }, 1000);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to send command',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send lock command',
        variant: 'destructive',
      });
    } finally {
      setLockLoading(false);
      setPendingAction(null);
    }
  };

  const getStationRisk = (pillar: PillarType) => {
    if (!riskData || !station) return null;
    return riskData[pillar].stations.find(s => s.station_id === station.station_id) || null;
  };

  const getPillarConfig = (type: PillarType) => {
    const configs = {
      drought: { titleTh: 'ภัยแล้ง', titleEn: 'Drought Risk', icon: Droplets, color: 'text-orange-600', bgColor: 'bg-orange-50/50' },
      flood: { titleTh: 'น้ำท่วม', titleEn: 'Flood Risk', icon: CloudRain, color: 'text-blue-600', bgColor: 'bg-blue-50/50' },
      storm: { titleTh: 'พายุ', titleEn: 'Storm Risk', icon: Wind, color: 'text-purple-600', bgColor: 'bg-purple-50/50' },
      disease: { titleTh: 'โรค/แมลง', titleEn: 'Disease Risk', icon: Bug, color: 'text-red-600', bgColor: 'bg-red-50/50' },
    };
    return configs[type];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px] lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!station) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Radio className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Station Not Found</h2>
          <p className="text-muted-foreground mb-4">The station you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/stations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stations
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/stations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Stations
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{station.station_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{station.province}</span>
              <StatusBadge status={station.status} />
            </div>
          </div>
          {hasPermission('manage_station') && (
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Station
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Station Info Card */}
          {/* Station Info Card - Redesigned */}
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                Station Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Identity Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identity</h4>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-sm">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">Station ID</span>
                    </div>
                    <span className="font-mono text-sm font-bold">#{station.station_id}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-sm">
                        <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">Device ID</span>
                    </div>
                    <span className="font-mono text-sm">{station.device_id}</span>
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</h4>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to="/map" className="flex items-center gap-1">
                      View on Map <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">Province</span>
                    </div>
                    <span className="text-sm">{station.province}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[10px] text-muted-foreground block mb-1">LATITUDE</span>
                      <span className="font-mono text-xs">{station.latitude.toFixed(6)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[10px] text-muted-foreground block mb-1">LONGITUDE</span>
                      <span className="font-mono text-xs">{station.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h4>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Status</span>
                    <StatusBadge status={station.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Installed Date</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(station.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sensors & Device Status Tabs */}
          <Card className="lg:col-span-2 border-none shadow-none bg-transparent">
            <Tabs defaultValue="sensors" value={activeTab} onValueChange={(val) => setActiveTab(val as 'sensors' | 'deviceStatus')}>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-primary" />
                    Station Data
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'sensors' ? 'Environmental sensor readings' : 'Device health and power status'}
                  </p>
                </div>
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                  <TabsTrigger value="sensors" className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Sensors ({latestData.filter(item => item.sensor.sensor_type !== 'gate_door').length})
                  </TabsTrigger>
                  <TabsTrigger value="deviceStatus" className="flex items-center gap-2">
                    <Battery className="h-4 w-4" />
                    Device Status
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Sensors Tab Content */}
              <TabsContent value="sensors" className="mt-0">
                {latestData.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Thermometer className="h-10 w-10 mb-4 opacity-20" />
                      <p>No sensors installed at this station</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {latestData.map((item, index) => {
                      const { sensor, latestData: data } = item;

                      // Hide gate_door sensor - it's shown in Lock Control Card
                      if (sensor.sensor_type === 'gate_door') {
                        return null;
                      }

                      return (
                        <Link
                          key={`${sensor.sensor_id}-${index}`}
                          to={`/sensors/${sensor.sensor_id}`}
                          className="block group"
                        >
                          <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/50 relative bg-card/50 backdrop-blur-sm border-muted/60">
                            {/* Active Indicator Line */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${sensor.status === 'active' ? 'bg-primary' :
                              sensor.status === 'error' ? 'bg-destructive' : 'bg-muted'
                              }`} />

                            <CardContent className="p-4 pl-5">
                              <div className="flex justify-between items-start mb-3">
                                <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                  <SensorIcon type={sensor.sensor_type} className="h-5 w-5" />
                                </div>
                                {sensor.status === 'active' && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500/30 text-green-600 bg-green-500/10">
                                    Active
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-sm font-medium text-muted-foreground line-clamp-1" title={sensorTypeLabels[sensor.sensor_type]}>
                                  {sensorTypeLabels[sensor.sensor_type]}
                                </p>
                                <div className="flex items-baseline gap-1">
                                  {data?.value !== undefined && data?.value !== null ? (
                                    <>
                                      <span className="text-2xl font-bold tracking-tight text-foreground">
                                        {Number(data.value).toFixed(2)}
                                      </span>
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {sensorTypeUnits[sensor.sensor_type]}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xl font-mono text-muted-foreground/50">--</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Device Status Tab Content */}
              <TabsContent value="deviceStatus" className="mt-0">
                <StationHealth stationId={parseInt(id!)} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Chart Section */}
        <Card>
          <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {activeTab === 'sensors' ? (
                  <>
                    <Activity className="h-5 w-5 text-primary" />
                    Environmental Trends
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-primary" />
                    Device Status Trends
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {activeTab === 'sensors' 
                  ? 'Historical environmental data visualization'
                  : 'Battery, solar, and power system monitoring'}
              </CardDescription>
            </div>
            {/* Filter Dropdown (Sensors or Status Fields) */}
            <div className="flex items-center gap-2">
              {activeTab === 'sensors' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                      <Filter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline-block">Sensors</span>
                      <span className="inline-block sm:hidden">Filter</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] min-w-5">
                        {visibleSensorIds.length}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[240px]">
                    <DropdownMenuLabel>
                      Select Sensors ({visibleSensorIds.length}/{latestData.filter(d => d.sensor.sensor_type !== 'gate_door').length})
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={visibleSensorIds.length === latestData.filter(d => d.sensor.sensor_type !== 'gate_door').length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const allIds = latestData
                            .filter(d => d.sensor.sensor_type !== 'gate_door')
                            .map(d => d.sensor.sensor_id.toString());
                          setVisibleSensorIds(allIds);
                        } else {
                          setVisibleSensorIds([]);
                        }
                      }}
                    >
                      Select All
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <div className="max-h-[300px] overflow-y-auto">
                      {latestData
                        .filter(d => d.sensor.sensor_type !== 'gate_door')
                        .map((item, index) => {
                          const sId = item.sensor.sensor_id.toString();
                          const color = CHART_COLORS[index % CHART_COLORS.length];
                          return (
                            <DropdownMenuCheckboxItem
                              key={sId}
                              checked={visibleSensorIds.includes(sId)}
                              onCheckedChange={() => toggleSensorVisibility(sId)}
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate">{sensorTypeLabels[item.sensor.sensor_type]}</span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                      <Filter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline-block">Fields</span>
                      <span className="inline-block sm:hidden">Filter</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] min-w-5">
                        {visibleStatusFields.length}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[240px]">
                    <DropdownMenuLabel>
                      Select Fields ({visibleStatusFields.length}/12)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      { key: 'batt_v', label: 'แรงดันแบตเตอรี่ (V)', color: '#2563eb' },
                      { key: 'batt_cap', label: 'ความจุแบตเตอรี่ (%)', color: '#16a34a' },
                      { key: 'batt_temp_c', label: 'อุณหภูมิแบตเตอรี่ (°C)', color: '#dc2626' },
                      { key: 'pv_v', label: 'แรงดันโซลาร์ (V)', color: '#f59e0b' },
                      { key: 'pv_a', label: 'กระแสโซลาร์ (A)', color: '#f97316' },
                      { key: 'load_w', label: 'กำลังโหลด (W)', color: '#0891b2' },
                      { key: 'load_a', label: 'กระแสโหลด (A)', color: '#06b6d4' },
                      { key: 'load_v', label: 'แรงดันโหลด (V)', color: '#14b8a6' },
                      { key: 'chg_a', label: 'กระแสชาร์จ (A)', color: '#10b981' },
                      { key: 'cbn_temp_c', label: 'อุณหภูมิตู้ (°C)', color: '#d97706' },
                      { key: 'cbn_rh_pct', label: 'ความชื้นในตู้ (%)', color: '#9333ea' },
                      { key: 'ctrl_temp_c', label: 'อุณหภูมิ Controller (°C)', color: '#db2777' },
                    ].map(field => (
                      <DropdownMenuCheckboxItem
                        key={field.key}
                        checked={visibleStatusFields.includes(field.key)}
                        onCheckedChange={() => toggleStatusFieldVisibility(field.key)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: field.color }} />
                          <span className="truncate text-xs">{field.label}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Time Range Filter */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30m">Last 30 Minutes</SelectItem>
                  <SelectItem value="1h">Last 1 Hour</SelectItem>
                  <SelectItem value="3h">Last 3 Hours</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="3d">Last 3 Days</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="14d">Last 14 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
              {activeTab === 'sensors' ? (
                latestData
                  .filter(d => d.sensor.sensor_type !== 'gate_door')
                  .filter(d => visibleSensorIds.includes(d.sensor.sensor_id.toString()))
                  .map((item, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <div key={item.sensor.sensor_id} className="flex items-center gap-1.5 min-w-fit px-2 py-1 rounded-md bg-muted/40 border border-transparent hover:border-border transition-colors">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{sensorTypeLabels[item.sensor.sensor_type]}</span>
                      </div>
                    )
                  })
              ) : (
                [
                  { key: 'batt_v', label: 'แรงดันแบตเตอรี่', color: '#2563eb' },
                  { key: 'batt_cap', label: 'ความจุแบตเตอรี่', color: '#16a34a' },
                  { key: 'batt_temp_c', label: 'อุณหภูมิแบต', color: '#dc2626' },
                  { key: 'pv_v', label: 'แรงดันโซลาร์', color: '#f59e0b' },
                  { key: 'pv_a', label: 'กระแสโซลาร์', color: '#f97316' },
                  { key: 'load_w', label: 'กำลังโหลด', color: '#0891b2' },
                  { key: 'load_a', label: 'กระแสโหลด', color: '#06b6d4' },
                  { key: 'load_v', label: 'แรงดันโหลด', color: '#14b8a6' },
                  { key: 'chg_a', label: 'กระแสชาร์จ', color: '#10b981' },
                  { key: 'cbn_temp_c', label: 'อุณหภูมิตู้', color: '#d97706' },
                  { key: 'cbn_rh_pct', label: 'ความชื้นในตู้', color: '#9333ea' },
                  { key: 'ctrl_temp_c', label: 'อุณหภูมิ Controller', color: '#db2777' },
                ]
                  .filter(field => visibleStatusFields.includes(field.key))
                  .map(field => (
                    <div key={field.key} className="flex items-center gap-1.5 min-w-fit px-2 py-1 rounded-md bg-muted/40 border border-transparent hover:border-border transition-colors">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: field.color }} />
                      <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{field.label}</span>
                    </div>
                  ))
              )}
            </div>

            <div className="h-[350px] w-full">
              {chartLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : activeTab === 'sensors' && historyData.length > 0 && visibleSensorIds.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis
                      dataKey="time"
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />

                    {/* Status Timeline Y Axis */}
                    <YAxis
                      domain={[0, 9]}
                      ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Sensor Status', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 } }}
                      tickFormatter={(value) => {
                        const sensorNames: Record<number, string> = {
                          1: 'อุณหภูมิดิน',
                          2: 'ความชื้นดิน',
                          3: 'ปริมาณฝน',
                          4: 'อัตราฝน',
                          5: 'ความกดอากาศ',
                          6: 'ความชื้นอากาศ',
                          7: 'อุณหภูมิอากาศ',
                          8: 'ความเร็วลม',
                        };
                        return sensorNames[value] || '';
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
                      formatter={(value: any, name: any, props: any) => {
                        const sensorId = name;
                        const rawValue = props.payload[`${sensorId}_raw`];
                        const statusValue = value;
                        const sensor = latestData.find(d => d.sensor.sensor_id.toString() === sensorId);
                        const unit = sensor ? sensorTypeUnits[sensor.sensor.sensor_type] : '';
                        const label = sensor ? sensorTypeLabels[sensor.sensor.sensor_type] : name;
                        const isWorking = statusValue > 0;
                        const status = isWorking ? '✓ ปกติ' : '✗ ผิดปกติ';
                        return [`${rawValue?.toFixed(2) || '--'} ${unit} [${status}]`, label];
                      }}
                    />

                    {latestData
                      .filter(d => d.sensor.sensor_type !== 'gate_door')
                      .map((item, index) => {
                        const sId = item.sensor.sensor_id.toString();
                        if (!visibleSensorIds.includes(sId)) return null;

                        return (
                          <Line
                            key={sId}
                            type="monotone"
                            dataKey={sId}
                            name={sId}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        );
                      })
                    }
                  </LineChart>
                </ResponsiveContainer>
              ) : activeTab === 'deviceStatus' && statusHistoryData.length > 0 && visibleStatusFields.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statusHistoryData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis
                      dataKey="time"
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />

                    {/* Status Timeline Y Axis */}
                    <YAxis
                      domain={[0, 13]}
                      ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                      tick={{ fontSize: 9 }}
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Device Status', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 } }}
                      tickFormatter={(value) => {
                        const statusNames: Record<number, string> = {
                          1: 'Ctrl Temp',
                          2: 'Cbn RH',
                          3: 'Cbn Temp',
                          4: 'Chg A',
                          5: 'Load V',
                          6: 'Load A',
                          7: 'Load W',
                          8: 'PV A',
                          9: 'PV V',
                          10: 'Batt Temp',
                          11: 'Batt Cap',
                          12: 'Batt V',
                        };
                        return statusNames[value] || '';
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
                      formatter={(value: any, name: any, props: any) => {
                        const fieldKey = name.split(' ')[0];
                        const rawValue = props.payload[`${fieldKey}_raw`];
                        const statusValue = value;
                        
                        const fieldUnits: Record<string, string> = {
                          batt_v: 'V', batt_cap: '%', batt_temp_c: '°C',
                          pv_v: 'V', pv_a: 'A',
                          load_w: 'W', load_a: 'A', load_v: 'V', chg_a: 'A',
                          cbn_temp_c: '°C', cbn_rh_pct: '%', ctrl_temp_c: '°C'
                        };
                        
                        const unit = fieldUnits[fieldKey] || '';
                        const isWorking = statusValue > 0;
                        const status = isWorking ? '✓ ปกติ' : '✗ ผิดปกติ';
                        return [`${rawValue?.toFixed(2) || '--'} ${unit} [${status}]`, name];
                      }}
                    />

                    {[
                      { key: 'batt_v', label: 'แรงดันแบตเตอรี่', color: '#2563eb' },
                      { key: 'batt_cap', label: 'ความจุแบตเตอรี่', color: '#16a34a' },
                      { key: 'batt_temp_c', label: 'อุณหภูมิแบตเตอรี่', color: '#dc2626' },
                      { key: 'pv_v', label: 'แรงดันโซลาร์', color: '#f59e0b' },
                      { key: 'pv_a', label: 'กระแสโซลาร์', color: '#f97316' },
                      { key: 'load_w', label: 'กำลังโหลด', color: '#0891b2' },
                      { key: 'load_a', label: 'กระแสโหลด', color: '#06b6d4' },
                      { key: 'load_v', label: 'แรงดันโหลด', color: '#14b8a6' },
                      { key: 'chg_a', label: 'กระแสชาร์จ', color: '#10b981' },
                      { key: 'cbn_temp_c', label: 'อุณหภูมิตู้', color: '#d97706' },
                      { key: 'cbn_rh_pct', label: 'ความชื้นในตู้', color: '#9333ea' },
                      { key: 'ctrl_temp_c', label: 'อุณหภูมิ Controller', color: '#db2777' },
                    ]
                      .filter(field => visibleStatusFields.includes(field.key))
                      .map(field => (
                        <Line
                          key={field.key}
                          type="monotone"
                          dataKey={field.key}
                          name={field.key}
                          stroke={field.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))
                    }
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  {activeTab === 'sensors' ? <Activity className="h-10 w-10 mb-2 opacity-20" /> : <Zap className="h-10 w-10 mb-2 opacity-20" />}
                  <p>
                    {activeTab === 'sensors' 
                      ? (visibleSensorIds.length === 0 ? 'Select sensors to view trends' : 'No historical data available for this period')
                      : (visibleStatusFields.length === 0 ? 'Select status fields to view trends' : 'No device status data available for this period')
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lock Control Card (UC13) - Only for SUPER_USER with gate_door sensor */}
        {lockStatus?.has_lock && user?.role === 'SUPER_USER' ? (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Digital Lock Control
                  </CardTitle>
                  <CardDescription>
                    Remote lock control system (UC13)
                  </CardDescription>
                </div>
                {lockStatus.status && (
                  <Badge
                    variant={lockStatus.status === 'unlocked' ? 'default' : 'secondary'}
                    className="text-base px-4 py-1"
                  >
                    {lockStatus.status === 'unlocked' ? (
                      <>
                        <Unlock className="h-4 w-4 mr-1" />
                        UNLOCKED
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-1" />
                        LOCKED
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Status */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Current Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${lockStatus.status === 'unlocked' ? 'bg-green-500' : 'bg-gray-500'
                        } animate-pulse`}
                    />
                    <span className="font-semibold">
                      {lockStatus.status === 'unlocked' ? 'Gate Open' : 'Gate Closed'}
                    </span>
                  </div>
                  {lockStatus.last_update && (
                    <p className="text-xs text-muted-foreground">
                      Last update: {formatDistanceToNow(new Date(lockStatus.last_update), { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last Command</span>
                  </div>
                  {lockStatus.last_command ? (
                    <>
                      <p className="text-sm font-medium">
                        {lockStatus.last_command.alert_message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(lockStatus.last_command.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No commands sent yet</p>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  ⚠️ Use these controls to remotely lock or unlock the station gate
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => handleLockAction('unlock')}
                    disabled={lockLoading || lockStatus.status === 'unlocked'}
                  >
                    <Unlock className="mr-2 h-5 w-5" />
                    Unlock Gate
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => handleLockAction('lock')}
                    disabled={lockLoading || lockStatus.status === 'locked'}
                  >
                    <Lock className="mr-2 h-5 w-5" />
                    Lock Gate
                  </Button>
                </div>
              </div>

              {/* Technical Info */}
              <div className="pt-4 border-t">
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground bg-muted p-3 rounded">
                    <p><strong>MQTT Topic:</strong> cmd/{station?.device_id}/lock</p>
                    <p><strong>Sensor:</strong> gate_door (0=locked, 1=unlocked)</p>
                    <p><strong>Gate Value:</strong> {lockStatus.gate_value}</p>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        ) : lockStatus?.has_lock && user?.role !== 'SUPER_USER' ? (
          <Card className="border-2 border-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                Digital Lock Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                🔒 Access denied. Only <strong>Super User</strong> can control locks.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Current user role: <strong>{user?.role || 'Unknown'}</strong>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* 4 Pillars Risk Analysis */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pb-2">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Risk Analysis
              </h3>
              <p className="text-sm text-muted-foreground">
                การวิเคราะห์ความเสี่ยง 4 ด้านสำหรับสถานีนี้
              </p>
            </div>
            {riskData && (
              <Badge variant="outline" className="font-normal">
                Updated: {format(new Date(riskData.last_updated), 'HH:mm')}
              </Badge>
            )}
          </div>

          {(['drought', 'flood', 'storm', 'disease'] as PillarType[]).map(pillar => {
            const config = getPillarConfig(pillar);
            const risk = getStationRisk(pillar);
            const Icon = config.icon;

            return (
              <Card key={pillar} className="overflow-hidden border-l-4" style={{ borderLeftColor: risk?.risk_level === 'high' ? '#ef4444' : risk?.risk_level === 'medium' ? '#f97316' : risk?.risk_level === 'low' ? '#22c55e' : '#e5e7eb' }}>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${config.bgColor}`}>
                  <CardTitle className="text-sm font-medium">
                    {config.titleTh}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{config.titleEn}</span>
                      <Badge variant={
                        risk?.risk_level === 'high' ? 'destructive' :
                          risk?.risk_level === 'medium' ? 'default' :
                            risk?.risk_level === 'low' ? 'secondary' : 'outline'
                      }>
                        {risk?.risk_level ? risk.risk_level.toUpperCase() : 'N/A'}
                      </Badge>
                    </div>
                    {risk?.risk_score !== undefined && risk?.risk_score > 0 && (
                      <div className="mt-2 w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${risk.risk_level === 'high' ? 'bg-destructive' :
                            risk.risk_level === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(risk.risk_score, 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {risk?.risk_level === 'high' ? 'High probability detected. Check detailed logs.' :
                        risk?.risk_level === 'medium' ? 'Moderate conditions. Keep monitoring.' :
                          risk?.risk_level === 'low' ? 'Conditions differ from risk factors.' :
                            'Insufficient data for calculation.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Alerts */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Recent Alerts
              </CardTitle>
              <CardDescription>
                Latest alerts from this station ({alerts.length} total)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/alerts?station_id=${station?.station_id}`}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <AlertTriangle className="h-10 w-10 mb-2 opacity-20" />
                <p>No recent alerts for this station</p>
              </div>
            ) : (
              <div className="pr-2 max-h-[500px] overflow-y-auto space-y-3 custom-scrollbar">
                {alerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${alert.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                      alert.severity === 'medium' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-none mb-1 break-words">
                          {alert.alert_message}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <SeverityBadge severity={alert.severity} size="sm" />
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                          {alert.sensor_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                          • {format(new Date(alert.created_at), 'PP p')}
                        </span>

                        {alert.is_acknowledged && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200 dark:border-green-900">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lock Control Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {pendingAction === 'lock' ? (
                  <>
                    <Lock className="h-5 w-5 text-destructive" />
                    Confirm Lock Command
                  </>
                ) : (
                  <>
                    <Unlock className="h-5 w-5 text-green-600" />
                    Confirm Unlock Command
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Are you sure you want to <strong className="text-foreground">{pendingAction?.toUpperCase()}</strong> this station?
                </p>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Station:</strong> {station?.station_name}</p>
                  <p><strong>Device ID:</strong> {station?.device_id}</p>
                  <p><strong>Action:</strong> Send {pendingAction} command via MQTT</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This action will be logged and can be viewed in the audit trail.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmLockAction}
                className={pendingAction === 'lock' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {pendingAction === 'lock' ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Confirm Lock
                  </>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Confirm Unlock
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
