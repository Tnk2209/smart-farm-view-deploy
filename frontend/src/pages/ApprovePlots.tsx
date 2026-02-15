import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getAllFarmPlots, approveFarmPlot, getStations } from '@/lib/api';
import { FarmPlot, Station } from '@/lib/types';
import{ Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CheckCircle, XCircle, Clock, MapPin, User } from 'lucide-react';

/**
 * UC11: Approve Registration
 * ตามเอกสาร: 04-use-case-diagram.md#UC11
 * Access: SUPER_USER only
 * 
 * Super User สามารถตรวจสอบและอนุมัติการลงทะเบียนแปลงนาของเกษตรกร
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

        // Refresh plots
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

            {selectedPlot && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
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

                    {selectedPlot.land_title_deed && (
                      <>
                        <div className="text-muted-foreground">โฉนด:</div>
                        <div>{selectedPlot.land_title_deed}</div>
                      </>
                    )}

                    {selectedPlot.area_size_rai && (
                      <>
                        <div className="text-muted-foreground">ขนาด:</div>
                        <div>{selectedPlot.area_size_rai} ไร่</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">เลือกสถานีที่ใกล้ที่สุด</label>
                  <Select
                    value={selectedStation?.toString()}
                    onValueChange={(value) => setSelectedStation(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสถานี" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.station_id} value={station.station_id.toString()}>
                          {station.station_name} - {station.province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleApprove(false)}
                disabled={processing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                ไม่อนุมัติ
              </Button>
              <Button
                onClick={() => handleApprove(true)}
                disabled={processing || !selectedStation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                อนุมัติ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
