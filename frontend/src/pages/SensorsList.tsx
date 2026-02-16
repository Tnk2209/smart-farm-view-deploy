import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getSensors } from '@/lib/api';
import { Sensor } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SensorIcon, sensorTypeLabels } from '@/components/SensorIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Search, Eye, LayoutGrid, MapPin, ChevronDown, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SensorsList() {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Show 5 Stations per page

  const [expandedStationIds, setExpandedStationIds] = useState<number[]>([]);

  const toggleStation = (stationId: number) => {
    setExpandedStationIds(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

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

  // Filter Sensors first
  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch =
      (sensor.station_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensorTypeLabels[sensor.sensor_type].toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || sensor.sensor_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || sensor.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group by Station
  const stationsMap = filteredSensors.reduce((acc, sensor) => {
    const stationId = sensor.station_id;
    if (!acc[stationId]) {
      acc[stationId] = {
        station_id: stationId,
        station_name: sensor.station_name || `Station #${stationId}`,
        sensors: []
      };
    }
    acc[stationId].sensors.push(sensor);
    return acc;
  }, {} as Record<number, { station_id: number; station_name: string; sensors: Sensor[] }>);

  const stationGroups = Object.values(stationsMap).sort((a, b) => a.station_name.localeCompare(b.station_name));

  // Pagination for Stations
  const totalPages = Math.ceil(stationGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStations = stationGroups.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) end = 4;
    if (currentPage >= totalPages - 2) start = totalPages - 3;

    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              Sensors Directory
            </h1>
            <p className="text-muted-foreground">
              Monitor sensors organized by station
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sensors or stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
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
                <SelectTrigger className="w-full sm:w-[150px] bg-background">
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

        {/* Station Groups */}
        <div className="space-y-4">
          {paginatedStations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
              <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No sensors found matching your filters.</p>
            </div>
          ) : (
            paginatedStations.map((group) => {
              const isExpanded = expandedStationIds.includes(group.station_id);
              const activeCount = group.sensors.filter(s => s.status === 'active').length;
              const errorCount = group.sensors.filter(s => s.status === 'error').length;
              const inactiveCount = group.sensors.length - activeCount - errorCount;

              return (
                <Card key={group.station_id} className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                  <div
                    onClick={() => toggleStation(group.station_id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{group.station_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            {group.sensors.length} Sensors
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Summary Badges */}
                      <div className="flex items-center gap-2 text-sm">
                        {activeCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {activeCount} Active
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {errorCount} Error
                          </span>
                        )}
                        {inactiveCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle className="h-3.5 w-3.5" />
                            {inactiveCount} Other
                          </span>
                        )}
                      </div>

                      <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content: Sensor Grid */}
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="p-4 pt-0 border-t bg-muted/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                          {group.sensors.map((sensor) => (
                            <div
                              key={sensor.sensor_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sensors/${sensor.sensor_id}`);
                              }}
                              className="group relative bg-card hover:bg-white dark:hover:bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  <SensorIcon type={sensor.sensor_type} className="h-5 w-5" />
                                </div>
                                <StatusBadge status={sensor.status} size="sm" />
                              </div>

                              <div className="space-y-1">
                                <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                                  {sensorTypeLabels[sensor.sensor_type]}
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono">
                                  ID: #{sensor.sensor_id}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t text-[10px] text-muted-foreground flex justify-between items-center">
                                <span>Installed: {format(new Date(sensor.installed_at), 'MMM d, yyyy')}</span>
                                <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button variant="ghost" size="sm" asChild className="text-xs">
                            <Link to={`/stations/${group.station_id}`}>
                              View Station Details <MapPin className="ml-2 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page as number)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
