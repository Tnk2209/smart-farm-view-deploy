import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStationStatus } from '@/lib/api';
import type { StationStatus } from '@/lib/types';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryWarning,
  Sun,
  Moon,
  Thermometer,
  Droplets,
  Zap,
  Clock
} from 'lucide-react';

interface StationHealthProps {
  stationId: number;
}

export function StationHealth({ stationId }: StationHealthProps) {
  const [status, setStatus] = useState<StationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await getStationStatus(stationId);

        if (!mounted) return;

        if (response.success && response.data) {
          setStatus(response.data);
          setError(null);
        } else {
          setError(response.error || 'Failed to fetch station status');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [stationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สถานะอุปกรณ์</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สถานะอุปกรณ์</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {error || 'ไม่พบข้อมูลสถานะอุปกรณ์'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate battery icon and color
  const getBatteryIcon = () => {
    if (!status.batt_cap) return <Battery className="h-5 w-5" />;

    const isCharging = (status.pv_a || 0) > 0;

    if (status.batt_cap >= 80) {
      return isCharging ?
        <BatteryCharging className="h-5 w-5 text-green-500" /> :
        <Battery className="h-5 w-5 text-green-500" />;
    } else if (status.batt_cap >= 50) {
      return <Battery className="h-5 w-5 text-yellow-500" />;
    } else if (status.batt_cap >= 20) {
      return <BatteryWarning className="h-5 w-5 text-orange-500" />;
    } else {
      return <BatteryLow className="h-5 w-5 text-red-500 animate-pulse" />;
    }
  };

  const getBatteryColor = () => {
    if (!status.batt_cap) return 'default';
    if (status.batt_cap >= 80) return 'default';
    if (status.batt_cap >= 50) return 'secondary';
    if (status.batt_cap >= 20) return 'outline';
    return 'destructive';
  };

  // Check if solar is charging
  const isSolarCharging = (status.pv_a || 0) > 0 && (status.pv_v || 0) > 10;

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">อุปกรณ์และระบบไฟฟ้า</h3>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
          <Clock className="h-3.5 w-3.5" />
          <span>อัปเดต: {formatTime(status.recorded_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Power System */}
        <div className="space-y-4 flex flex-col h-full">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-yellow-500" /> Power System
          </h4>

          {/* Battery Card */}
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    {getBatteryIcon()}
                  </div>
                  <div>
                    <span className="block font-semibold">แบตเตอรี่</span>
                    <span className="text-xs font-normal text-muted-foreground">Battery Status</span>
                  </div>
                </div>
                <Badge variant={getBatteryColor()} className="text-sm px-2.5 py-0.5">
                  {status.batt_cap?.toFixed(0) || '--'}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-2xl font-bold tracking-tight">{status.batt_v?.toFixed(1) || '--'} <span className="text-sm font-normal text-muted-foreground">V</span></p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">แรงดันไฟฟ้า</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{status.chg_a?.toFixed(2) || '0.00'} <span className="text-sm font-normal text-muted-foreground">A</span></p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">กระแสชาร์จ</p>
                </div>
              </div>
              {status.batt_cap !== undefined && status.batt_cap < 20 && (
                <div className="mt-4 flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                  <BatteryWarning className="h-4 w-4" />
                  <span>แบตเตอรี่ต่ำกว่า 20% กรุณาตรวจสอบระบบ</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solar Card */}
          <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    {isSolarCharging ? (
                      <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <Moon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="block font-semibold">โซล่าเซลล์</span>
                    <span className="text-xs font-normal text-muted-foreground">Solar Input</span>
                  </div>
                </div>
                <Badge variant={isSolarCharging ? "default" : "outline"} className={isSolarCharging ? "bg-yellow-500 hover:bg-yellow-600" : ""}>
                  {isSolarCharging ? 'Active' : 'Standby'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-lg font-bold">{status.pv_v?.toFixed(1) || '--'} <span className="text-xs font-normal text-muted-foreground">V</span></p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Voltage</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{status.pv_a?.toFixed(2) || '--'} <span className="text-xs font-normal text-muted-foreground">A</span></p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Current</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {isSolarCharging ? ((status.pv_v || 0) * (status.pv_a || 0)).toFixed(1) : '0.0'} <span className="text-xs font-normal text-muted-foreground">W</span>
                  </p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Power</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load Card */}
          {status.load_w !== undefined && (
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow transition-shadow flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="block font-semibold">โหลด (Load)</span>
                    <span className="text-xs font-normal text-muted-foreground">System Consumption</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-lg font-bold">{status.load_v?.toFixed(1) || '--'} <span className="text-xs font-normal text-muted-foreground">V</span></p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Voltage</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{status.load_a?.toFixed(2) || '--'} <span className="text-xs font-normal text-muted-foreground">A</span></p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Current</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {status.load_w?.toFixed(1) || '--'} <span className="text-xs font-normal text-muted-foreground">W</span>
                    </p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Power</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Environment System */}
        <div className="space-y-4 flex flex-col h-full">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
            <Thermometer className="h-4 w-4 text-purple-500" /> Environment System
          </h4>

          {/* Controller & Battery Temp Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Controller Temp */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20 ring-4 ring-purple-50 dark:ring-purple-900/10">
                    <Thermometer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Controller Temp</p>
                    <p className="text-3xl font-bold mt-1 tracking-tight text-foreground">
                      {status.ctrl_temp_c?.toFixed(1) || '--'}°C
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Battery Temp */}
            <Card className="shadow-sm hover:shadow transition-shadow">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`p-3 rounded-full ring-4 ${status.batt_temp_c && status.batt_temp_c > 45
                      ? 'bg-red-100 dark:bg-red-900/20 ring-red-50 dark:ring-red-900/10'
                      : 'bg-orange-100 dark:bg-orange-900/20 ring-orange-50 dark:ring-orange-900/10'
                    }`}>
                    <Thermometer className={`h-6 w-6 ${status.batt_temp_c && status.batt_temp_c > 45 ? 'text-red-600' : 'text-orange-600'
                      }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Battery Temp</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {status.batt_temp_c?.toFixed(1) || '--'}°C
                      </p>
                      {status.batt_temp_c && status.batt_temp_c > 45 && (
                        <Badge variant="destructive" className="h-5 text-[10px] animate-pulse">HOT</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cabinet Status - Takes remaining height */}
          <Card className="flex-1 flex flex-col shadow-sm hover:shadow transition-shadow border-t-4 border-t-orange-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Thermometer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <span className="block font-semibold">สภาพภายในตู้ (Cabinet)</span>
                  <span className="text-xs font-normal text-muted-foreground">Ambient Conditions</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <div className="flex items-center justify-around w-full py-4">
                <div className="text-center group">
                  <div className="flex items-center justify-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/10 group-hover:bg-orange-100 transition-colors">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase">Temperature</span>
                  </div>
                  <p className="text-4xl font-bold tracking-tighter text-foreground">{status.cbn_temp_c?.toFixed(1) || '--'}<span className="text-lg text-muted-foreground align-top ml-1">°C</span></p>
                  {status.cbn_temp_c && status.cbn_temp_c > 45 && (
                    <span className="text-xs text-destructive font-bold mt-1 block">CRITICAL HIGH</span>
                  )}
                </div>

                <div className="h-24 w-px bg-border/50"></div>

                <div className="text-center group">
                  <div className="flex items-center justify-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/10 group-hover:bg-blue-100 transition-colors">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Humidity</span>
                  </div>
                  <p className="text-4xl font-bold tracking-tighter text-foreground">{status.cbn_rh_pct?.toFixed(1) || '--'}<span className="text-lg text-muted-foreground align-top ml-1">%</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
