import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getSensors } from '@/lib/api';
import { Sensor } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SensorIcon, sensorTypeLabels } from '@/components/SensorIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Thermometer, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function SensorsList() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await getSensors();
        if (response.success) {
          setSensors(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch sensors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSensors();
  }, []);

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = 
      sensor.station_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensorTypeLabels[sensor.sensor_type].toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || sensor.sensor_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || sensor.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const sensorTypes = [...new Set(sensors.map(s => s.sensor_type))];

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sensors</h1>
          <p className="text-muted-foreground">
            View and monitor all sensors across stations
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sensors or stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sensor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {sensorTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {sensorTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sensors Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              All Sensors ({filteredSensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sensor Type</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSensors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No sensors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSensors.map((sensor) => (
                    <TableRow key={sensor.sensor_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SensorIcon type={sensor.sensor_type} className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{sensorTypeLabels[sensor.sensor_type]}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{sensor.sensor_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/stations/${sensor.station_id}`}
                          className="text-primary hover:underline"
                        >
                          {sensor.station_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sensor.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sensor.installed_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/sensors/${sensor.sensor_id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Data
                          </Link>
                        </Button>
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
