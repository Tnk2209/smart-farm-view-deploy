import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getStationById, getStationLatestData, getAlerts } from '@/lib/api';
import { Station, Sensor, Alert } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SensorIcon, sensorTypeLabels, sensorTypeUnits } from '@/components/SensorIcon';
import { WeatherForecast } from '@/components/WeatherForecast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, MapPin, Thermometer, AlertTriangle, ArrowLeft, 
  Calendar, ExternalLink, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const [station, setStation] = useState<Station | null>(null);
  const [latestData, setLatestData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const stationId = parseInt(id);
        const [stationRes, latestDataRes, alertsRes] = await Promise.all([
          getStationById(stationId),
          getStationLatestData(stationId),
          getAlerts(),
        ]);

        if (stationRes.success && stationRes.data) setStation(stationRes.data);
        if (latestDataRes.success && latestDataRes.data) setLatestData(latestDataRes.data);
        if (alertsRes.success && alertsRes.data) {
          // Filter alerts for this station only
          const stationAlerts = alertsRes.data.filter(a => a.station_id === stationId);
          setAlerts(stationAlerts.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch station data:', error);
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
          <Card>
            <CardHeader>
              <CardTitle>Station Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Station ID</span>
                <span className="font-mono">#{station.station_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device ID</span>
                <span className="font-mono text-sm">{station.device_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Province</span>
                <span>{station.province}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={station.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latitude</span>
                <span className="font-mono text-sm">{station.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Longitude</span>
                <span className="font-mono text-sm">{station.longitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-sm">
                  {format(new Date(station.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/map`}>
                    <MapPin className="mr-2 h-4 w-4" />
                    View on Map
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sensors Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Sensors ({latestData.length})
              </CardTitle>
              <CardDescription>
                Monitoring devices installed at this station
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No sensors installed at this station
                </p>
              ) : (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {latestData.map((item, index) => {
                    const { sensor, latestData: data } = item;
                    return (
                      <Link 
                        key={`${sensor.sensor_id}-${index}`}
                        to={`/sensors/${sensor.sensor_id}`}
                        className="block"
                      >
                        <Card className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between">
                                <div className="rounded-lg bg-primary/10 p-2">
                                  <SensorIcon type={sensor.sensor_type} className="h-5 w-5 text-primary" />
                                </div>
                                <StatusBadge status={sensor.status || 'active'} size="sm" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-sm leading-tight">
                                  {sensorTypeLabels[sensor.sensor_type]}
                                </p>
                                {data?.value !== undefined && data?.value !== null && (
                                  <p className="text-lg font-bold text-primary">
                                    {sensor.sensor_type === 'gate_door' 
                                      ? (Number(data.value) === 1 ? 'เปิด' : 'ปิด') 
                                      : Number(data.value).toFixed(2)} {sensorTypeUnits[sensor.sensor_type]}
                                  </p>
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
            </CardContent>
          </Card>
        </div>

        {/* Weather Forecast */}
        <WeatherForecast />

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription>
              Latest alerts from this station
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent alerts for this station
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div 
                    key={alert.alert_id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      alert.severity === 'high' ? 'text-destructive' :
                      alert.severity === 'medium' ? 'text-chart-4' : 'text-chart-3'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.alert_message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <SeverityBadge severity={alert.severity} size="sm" />
                        <Badge variant="outline" className="text-xs">
                          {alert.sensor_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                    {alert.is_acknowledged && (
                      <Badge variant="secondary" className="text-xs">
                        Acknowledged
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
