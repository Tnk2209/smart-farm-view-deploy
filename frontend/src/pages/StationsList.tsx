import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getStations, createStation } from '@/lib/api';
import { Station } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Radio, Search, Plus, MapPin, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { StationMapPicker } from '@/components/StationMapPicker';

export default function StationsList() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStation, setNewStation] = useState({
    device_id: '',
    station_name: '',
    province: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await getStations();
        if (response.success) {
          setStations(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  const handleLocationSelect = (lat: number, lon: number) => {
    setNewStation(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lon.toFixed(6)
    }));
  };

  const handleCreateStation = async () => {
    // Validate
    if (!newStation.device_id || !newStation.station_name || !newStation.province || !newStation.latitude || !newStation.longitude) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const lat = parseFloat(newStation.latitude);
    const lon = parseFloat(newStation.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: "Validation Error",
        description: "Latitude and Longitude must be valid numbers",
        variant: "destructive"
      });
      return;
    }

    // Frontend Pre-checks (Checking against current state)
    const duplicateDeviceId = stations.some(s => s.device_id === newStation.device_id);
    if (duplicateDeviceId) {
      toast({
        title: "Validation Error",
        description: "Device ID นี้มีอยู่ในระบบแล้ว",
        variant: "destructive"
      });
      return;
    }

    const duplicateName = stations.some(s => s.station_name === newStation.station_name);
    if (duplicateName) {
      toast({
        title: "Validation Error",
        description: "ชื่อสถานีนี้มีอยู่ในระบบแล้ว",
        variant: "destructive"
      });
      return;
    }

    const duplicateCoords = stations.some(s => s.latitude === lat && s.longitude === lon);
    if (duplicateCoords) {
      toast({
        title: "Validation Error",
        description: "พิกัดนี้มีสถานีอื่นใช้งานอยู่แล้ว",
        variant: "destructive"
      });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({
        title: "Validation Error",
        description: "Latitude must be between -90 and 90, Longitude between -180 and 180",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await createStation({
        device_id: newStation.device_id,
        station_name: newStation.station_name,
        province: newStation.province,
        latitude: lat,
        longitude: lon
      });

      if (response.success) {
        toast({
          title: "Station Created",
          description: "New station has been successfully created.",
        });
        setIsCreateDialogOpen(false);
        setNewStation({
          device_id: '',
          station_name: '',
          province: '',
          latitude: '',
          longitude: ''
        });
        // Add new station to the list immediately
        if (response.data) {
          setStations(prev => [...prev, response.data!]);
        }
      } else {
        throw new Error(response.error || 'Failed to create station');
      }
    } catch (error) {
      console.error('Failed to create station:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create station",
        variant: "destructive"
      });
    }
  };

  const filteredStations = stations.filter(station => {
    const matchesSearch =
      station.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.province.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredStations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStations = filteredStations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const calculateStatus = (station: Station) => {
    // If explicitly marked offline related status in DB, respect it?
    // But user wants to identify missing data.
    if (!station.last_active) return 'offline';

    // Check if data is stale (> 24 hours)
    const lastActive = new Date(station.last_active);
    const now = new Date();
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) return 'offline';

    return station.status;
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      end = 4;
    }

    if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
    }

    if (start > 2) {
      pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
            <p className="text-muted-foreground">
              Manage and monitor all agricultural stations
            </p>
          </div>
          {hasPermission('manage_station') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Station
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1200px]">
                <DialogHeader>
                  <DialogTitle>Add New Station</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new station here. Click save when you're done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="device_id" className="text-right">
                      Device ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="device_id"
                      value={newStation.device_id}
                      onChange={(e) => setNewStation({ ...newStation, device_id: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g. IG502-NEW-STATION"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={newStation.station_name}
                      onChange={(e) => setNewStation({ ...newStation, station_name: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g. New Smart Station"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="province" className="text-right">
                      Province <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="province"
                      value={newStation.province}
                      onChange={(e) => setNewStation({ ...newStation, province: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g. Chiang Mai"
                    />
                  </div>

                  {/* Map Picker */}
                  <div className="col-span-4 space-y-2">
                    <Label>Location (Click on map to select)</Label>
                    <StationMapPicker
                      latitude={newStation.latitude ? parseFloat(newStation.latitude) : null}
                      longitude={newStation.longitude ? parseFloat(newStation.longitude) : null}
                      onLocationSelect={handleLocationSelect}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="latitude" className="text-right">
                      Latitude <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="latitude"
                      value={newStation.latitude}
                      onChange={(e) => setNewStation({ ...newStation, latitude: e.target.value })}
                      className="col-span-3"
                      type="number"
                      step="any"
                      placeholder="e.g. 13.75"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="longitude" className="text-right">
                      Longitude <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="longitude"
                      value={newStation.longitude}
                      onChange={(e) => setNewStation({ ...newStation, longitude: e.target.value })}
                      className="col-span-3"
                      type="number"
                      step="any"
                      placeholder="e.g. 100.50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" onClick={handleCreateStation}>Create Station</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stations or provinces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              All Stations ({filteredStations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station Name</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Sensors</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No stations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStations.map((station) => (
                    <TableRow key={station.station_id}>
                      <TableCell className="font-medium">
                        {station.station_name}
                      </TableCell>
                      <TableCell>{station.province}</TableCell>
                      <TableCell>
                        <StatusBadge status={calculateStatus(station)} size="sm" />
                      </TableCell>
                      <TableCell>
                        {station.alert_count && station.alert_count > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            {station.alert_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{station.sensor_count || 0}</TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {station.latitude.toFixed(2)}, {station.longitude.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/stations/${station.station_id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  แสดง {startIndex + 1}-{Math.min(endIndex, filteredStations.length)} จาก {filteredStations.length} รายการ
                </div>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
