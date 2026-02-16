import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getStationById, getStationLatestData, getAlerts, getLockStatus, sendLockCommand } from '@/lib/api';
import { Station, Sensor, Alert, LockStatusData } from '@/lib/types';
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
  Calendar, ExternalLink, Edit, Lock, Unlock, Shield, Clock
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
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [station, setStation] = useState<Station | null>(null);
  const [latestData, setLatestData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission, user } = useAuth();

  // Lock Control State
  const [lockStatus, setLockStatus] = useState<LockStatusData | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'lock' | 'unlock' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const stationId = parseInt(id);
        const [stationRes, latestDataRes, alertsRes, lockStatusRes] = await Promise.all([
          getStationById(stationId),
          getStationLatestData(stationId),
          getAlerts(),
          getLockStatus(stationId),
        ]);

        if (stationRes.success && stationRes.data) setStation(stationRes.data);
        if (latestDataRes.success && latestDataRes.data) setLatestData(latestDataRes.data);
        if (alertsRes.success && alertsRes.data) {
          // Filter alerts for this station only
          const stationAlerts = alertsRes.data.filter(a => a.station_id === stationId);
          setAlerts(stationAlerts.slice(0, 5));
        }
        if (lockStatusRes.success && lockStatusRes.data) {
          setLockStatus(lockStatusRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch station data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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
                Sensors ({latestData.filter(item => item.sensor.sensor_type !== 'gate_door').length})
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
                    
                    // Hide gate_door sensor - it's shown in Lock Control Card
                    if (sensor.sensor_type === 'gate_door') {
                      return null;
                    }
                    
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
                                    {Number(data.value).toFixed(2)} {sensorTypeUnits[sensor.sensor_type]}
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
                      className={`h-3 w-3 rounded-full ${
                        lockStatus.status === 'unlocked' ? 'bg-green-500' : 'bg-gray-500'
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
