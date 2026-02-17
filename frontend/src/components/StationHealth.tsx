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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">สถานะอุปกรณ์</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(status.recorded_at)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Battery Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {getBatteryIcon()}
            <div>
              <p className="text-sm font-medium">แบตเตอรี่</p>
              <p className="text-xs text-muted-foreground">
                {status.batt_v?.toFixed(1) || '--'} V
              </p>
            </div>
          </div>
          <Badge variant={getBatteryColor()}>
            {status.batt_cap?.toFixed(0) || '--'}%
          </Badge>
        </div>

        {/* Solar Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {isSolarCharging ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">โซล่าเซลล์</p>
              <p className="text-xs text-muted-foreground">
                {status.pv_v?.toFixed(1) || '--'} V
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {status.pv_a?.toFixed(2) || '--'} A
            </p>
            <p className="text-xs text-muted-foreground">
              {isSolarCharging ? 
                ((status.pv_v || 0) * (status.pv_a || 0)).toFixed(1) + ' W' : 
                'ไม่ชาร์จ'
              }
            </p>
          </div>
        </div>

        {/* Load Status */}
        {status.load_w !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">โหลด</p>
                <p className="text-xs text-muted-foreground">
                  {status.load_v?.toFixed(1) || '--'} V
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {status.load_w?.toFixed(1) || '--'} W
              </p>
              <p className="text-xs text-muted-foreground">
                {status.load_a?.toFixed(2) || '--'} A
              </p>
            </div>
          </div>
        )}

        {/* Charging Current */}
        {status.chg_a !== undefined && status.chg_a > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <BatteryCharging className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">กระแสชาร์จ</p>
                <p className="text-xs text-muted-foreground">กำลังชาร์จแบตเตอรี่</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">
                {status.chg_a?.toFixed(2) || '--'} A
              </p>
            </div>
          </div>
        )}

        {/* Controller Temperature */}
        {status.ctrl_temp_c !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">อุณหภูมิคอนโทรลเลอร์</p>
                <p className="text-xs text-muted-foreground">อุณหภูมิ Controller</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {status.ctrl_temp_c?.toFixed(1) || '--'} °C
              </p>
            </div>
          </div>
        )}

        {/* Battery Temperature */}
        {status.batt_temp_c !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium">อุณหภูมิแบตเตอรี่</p>
                <p className="text-xs text-muted-foreground">อุณหภูมิภายในแบต</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {status.batt_temp_c?.toFixed(1) || '--'} °C
              </p>
              {status.batt_temp_c && (status.batt_temp_c > 45 || status.batt_temp_c < 0) && (
                <Badge variant="destructive" className="mt-1">
                  {status.batt_temp_c > 45 ? 'ร้อนเกินไป' : 'เย็นเกินไป'}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Cabinet Temperature */}
        {status.cbn_temp_c !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">อุณหภูมิตู้ควบคุม</p>
                <p className="text-xs text-muted-foreground">อุณหภูมิ</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {status.cbn_temp_c?.toFixed(1) || '--'} °C
              </p>
              {status.cbn_temp_c && status.cbn_temp_c > 40 && (
                <Badge variant="destructive" className="mt-1">สูง</Badge>
              )}
            </div>
          </div>
        )}

        {/* Cabinet Humidity */}
        {status.cbn_rh_pct !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium">ความชื้นในตู้</p>
                <p className="text-xs text-muted-foreground">ความชื้นสัมพัทธ์</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {status.cbn_rh_pct?.toFixed(1) || '--'}%
              </p>
            </div>
          </div>
        )}

        {/* Battery Low Warning */}
        {status.batt_cap !== undefined && status.batt_cap < 20 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              ⚠️ แบตเตอรี่ต่ำกว่า 20%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              กรุณาตรวจสอบระบบโซล่าเซลล์หรือเตรียมพร้อมสำรองพลังงาน
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
