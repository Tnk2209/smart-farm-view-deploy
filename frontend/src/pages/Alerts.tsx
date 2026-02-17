import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getAlerts, acknowledgeAlert, getStations, getAlertsByStationId } from '@/lib/api';
import { Alert, Station } from '@/lib/types';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SensorIcon, sensorTypeLabels } from '@/components/SensorIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Search, Check, Clock, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>(searchParams.get('station_id') || 'all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    // Sync filter state with URL
    const currentStationId = searchParams.get('station_id') || 'all';
    setStationFilter(currentStationId);

    fetchData();
  }, [searchParams]);

  const handleStationChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('station_id');
    } else {
      newParams.set('station_id', value);
    }
    setSearchParams(newParams);
  };
  // ... existing code ...


  const fetchData = async () => {
    try {
      const stationIdParam = searchParams.get('station_id');

      const [alertsRes, stationsRes] = await Promise.all([
        stationIdParam
          ? getAlertsByStationId(parseInt(stationIdParam), 100)
          : getAlerts(100),
        getStations(),
      ]);

      if (alertsRes.success) setAlerts(alertsRes.data);
      if (stationsRes.success) setStations(stationsRes.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      const response = await acknowledgeAlert(alertId);
      if (response.success) {
        setAlerts(prev => prev.map(a =>
          a.alert_id === alertId ? { ...a, is_acknowledged: true } : a
        ));
        toast({
          title: "Alert Acknowledged",
          description: "The alert has been marked as acknowledged.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert.",
        variant: "destructive",
      });
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch =
      alert.alert_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.station_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStation = stationFilter === 'all' || alert.station_id.toString() === stationFilter;
    const matchesAcknowledged =
      acknowledgedFilter === 'all' ||
      (acknowledgedFilter === 'yes' && alert.is_acknowledged) ||
      (acknowledgedFilter === 'no' && !alert.is_acknowledged);
    return matchesSearch && matchesSeverity && matchesStation && matchesAcknowledged;
  });

  const unacknowledgedCount = alerts.filter(a => !a.is_acknowledged).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">
              Monitor and manage system alerts
            </p>
          </div>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="w-fit">
              {unacknowledgedCount} unacknowledged
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stationFilter} onValueChange={handleStationChange}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map(station => (
                    <SelectItem key={station.station_id} value={station.station_id.toString()}>
                      {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Acknowledged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="no">Unacknowledged</SelectItem>
                  <SelectItem value="yes">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              All Alerts ({filteredAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.alert_id}>
                      <TableCell className="max-w-[300px]">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-destructive animate-pulse' :
                              alert.severity === 'high' ? 'text-destructive' :
                                alert.severity === 'medium' ? 'text-chart-4' : 'text-chart-3'
                            }`} />
                          <span className="text-sm truncate">{alert.alert_message}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={alert.severity} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/stations/${alert.station_id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Radio className="h-3 w-3" />
                          <span className="text-sm">{alert.station_name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {alert.sensor_type && (
                          <div className="flex items-center gap-1">
                            <SensorIcon type={alert.sensor_type as any} className="h-3 w-3" />
                            <span className="text-sm">{sensorTypeLabels[alert.sensor_type as keyof typeof sensorTypeLabels]}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Clock className="h-3 w-3" />
                          {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.is_acknowledged ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            Acknowledged
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.is_acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.alert_id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
