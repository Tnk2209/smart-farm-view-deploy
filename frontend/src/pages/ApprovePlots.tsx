import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getAllFarmPlots, approveFarmPlot, getStations } from '@/lib/api';
import { FarmPlot, Station } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, MapPin, User, Ruler } from 'lucide-react';

/**
 * Helper: Calculate Haversine Distance in KM
 */
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * UC11: Approve Registration
 * Access: SUPER_USER only
 */
export default function ApprovePlots() {
  const { toast } = useToast();
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('pending');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plotsRes, stationsRes] = await Promise.all([
        getAllFarmPlots(),
        getStations(),
      ]);

      if (plotsRes.success && plotsRes.data) {
        setPlots(plotsRes.data);
      }

      if (stationsRes.success && stationsRes.data) {
        setStations(stationsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    if (!selectedPlot) return;

    setProcessing(true);

    try {
      const response = await approveFarmPlot(
        selectedPlot.plot_id,
        approve ? 'active' : 'rejected',
        approve ? selectedStation : undefined
      );

      if (response.success) {
        toast({
          title: 'สำเร็จ!',
          description: `${approve ? 'อนุมัติ' : 'ปฏิเสธ'}แปลงนาเรียบร้อยแล้ว`,
        });

        fetchData();
        setSelectedPlot(null);
        setSelectedStation(undefined);
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: response.error || 'ไม่สามารถดำเนินการได้',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: FarmPlot['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            อนุมัติแล้ว
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            รอการอนุมัติ
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            ไม่อนุมัติ
          </Badge>
        );
    }
  };

  const filteredPlots = plots.filter((plot) => {
    if (statusFilter === 'all') return true;
    return plot.status === statusFilter;
  });

  const pendingCount = plots.filter((p) => p.status === 'pending').length;

  // Calculate distances and sort stations when a plot is selected
  const sortedStations = useMemo(() => {
    if (!selectedPlot) return [];

    return stations.map(station => {
      const distance = getDistanceFromLatLonInKm(
        selectedPlot.lat,
        selectedPlot.lon,
        station.latitude,
        station.longitude
      );
      return { ...station, distance };
    })
      .filter(station => station.distance <= 10) // Filter for 10km radius (UC requirement)
      .sort((a, b) => a.distance - b.distance);
  }, [stations, selectedPlot]);

  // Pre-select the nearest station if not already selected
  useEffect(() => {
    if (selectedPlot && sortedStations.length > 0 && !selectedStation) {
      // Automatically select the nearest station initially
      setSelectedStation(sortedStations[0].station_id);
    }
  }, [selectedPlot, sortedStations]);


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              อนุมัติแปลงนา
            </h1>
            <p className="text-muted-foreground">
              ตรวจสอบและอนุมัติการลงทะเบียนแปลงนาของเกษตรกร
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              รออนุมัติ: {pendingCount}
            </Badge>
          )}
        </div>

        {/* Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>รายการแปลงนา</CardTitle>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="pending">รอการอนุมัติ</SelectItem>
                  <SelectItem value="active">อนุมัติแล้ว</SelectItem>
                  <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">กำลังโหลด...</div>
            ) : filteredPlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่พบรายการแปลงนา
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>พิกัด (Lat, Lon)</TableHead>
                    <TableHead>ขนาด (ไร่)</TableHead>
                    <TableHead>โฉนด</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่ลงทะเบียน</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlots.map((plot) => (
                    <TableRow key={plot.plot_id}>
                      <TableCell className="font-medium">#{plot.plot_id}</TableCell>
                      <TableCell>{plot.user_id}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {plot.lat.toFixed(4)}, {plot.lon.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        {plot.area_size_rai ? `${plot.area_size_rai} ไร่` : '-'}
                      </TableCell>
                      <TableCell>{plot.land_title_deed || '-'}</TableCell>
                      <TableCell>{getStatusBadge(plot.status)}</TableCell>
                      <TableCell>
                        {new Date(plot.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell className="text-right">
                        {plot.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedPlot(plot)}
                          >
                            ตรวจสอบ
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>ตรวจสอบแปลงนา #{selectedPlot?.plot_id}</DialogTitle>
              <DialogDescription>
                กรุณาเลือกสถานีที่ใกล้ที่สุดและพิจารณาอนุมัติ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {selectedPlot && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/30 p-4 rounded-lg border">
                  <div className="text-muted-foreground">User ID:</div>
                  <div className="font-medium">{selectedPlot.user_id}</div>

                  <div className="text-muted-foreground">Latitude:</div>
                  <div className="font-mono">{selectedPlot.lat}</div>

                  <div className="text-muted-foreground">Longitude:</div>
                  <div className="font-mono">{selectedPlot.lon}</div>

                  {selectedPlot.utm_coords && (
                    <>
                      <div className="text-muted-foreground">UTM:</div>
                      <div className="font-mono">{selectedPlot.utm_coords}</div>
                    </>
                  )}

                  <div className="text-muted-foreground">โฉนด:</div>
                  <div>{selectedPlot.land_title_deed || '-'}</div>

                  <div className="text-muted-foreground">ขนาด:</div>
                  <div>{selectedPlot.area_size_rai ? `${selectedPlot.area_size_rai} ไร่` : '-'}</div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    เลือกสถานีที่ใกล้ที่สุด
                  </label>
                </div>

                <Select
                  value={selectedStation?.toString()}
                  onValueChange={(value) => setSelectedStation(parseInt(value))}
                >
                  <SelectTrigger className="h-auto py-2">
                    <SelectValue placeholder="เลือกสถานี" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {sortedStations.length > 0 ? (
                      sortedStations.map((station) => {
                        return (
                          <SelectItem key={station.station_id} value={station.station_id.toString()}>
                            <div className="flex flex-col items-start gap-1 py-1">
                              <span className="font-medium flex items-center gap-2">
                                {station.station_name}
                                <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-green-100 text-green-700">แนะนำ</Badge>
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Ruler className="h-3 w-3" /> ห่าง {station.distance.toFixed(1)} กม. • {station.province}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="p-4 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
                        <XCircle className="h-8 w-8 text-muted-foreground/50" />
                        <span>ไม่พบสถานีตรวจวัดในระยะ 10 กม.</span>
                        <span className="text-xs">ไม่สามารถอนุมัติได้เนื่องจากอยู่นอกเขตบริการ</span>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[0.8rem] text-muted-foreground">
                  * ระบบจัดเรียงสถานีตามระยะทางอัตโนมัติ (ใกล้ที่สุดอยู่ด้านบน)
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={() => handleApprove(false)}
                disabled={processing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                ปฏิเสธ (ไม่อนุมัติ)
              </Button>
              <Button
                onClick={() => handleApprove(true)}
                disabled={processing || !selectedStation}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                อนุมัติและบันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
