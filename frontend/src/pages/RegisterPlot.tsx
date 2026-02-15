import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { registerFarmPlot, getMyFarmPlots } from '@/lib/api';
import { FarmPlot } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, CheckCircle, Clock, XCircle, Leaf } from 'lucide-react';
import { useEffect } from 'react';

/**
 * UC10: Register Farm Plot
 * ตามเอกสาร: 04-use-case-diagram.md#UC10
 * Access: USER (Farmer)
 * 
 * Farmer สามารถลงทะเบียนแปลงนาด้วยการกรอกพิกัด Lat/Lon
 * ระบบจะคำนวณหา Nearest Station และรอการอนุมัติจาก Super User
 */
export default function RegisterPlot() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [myPlots, setMyPlots] = useState<FarmPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);

  const [formData, setFormData] = useState({
    lat: '',
    lon: '',
    utm_coords: '',
    land_title_deed: '',
    area_size_rai: '',
  });

  useEffect(() => {
    fetchMyPlots();
  }, []);

  const fetchMyPlots = async () => {
    try {
      const response = await getMyFarmPlots();
      if (response.success && response.data) {
        setMyPlots(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch plots:', error);
    } finally {
      setLoadingPlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lat || !formData.lon) {
      toast({
        title: 'Validation Error',
        description: 'กรุณากรอกพิกัด Latitude และ Longitude',
        variant: 'destructive',
      });
      return;
    }

    const lat = parseFloat(formData.lat);
    const lon = parseFloat(formData.lon);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: 'Validation Error',
        description: 'พิกัดต้องเป็นตัวเลขเท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({
        title: 'Validation Error',
        description: 'พิกัดไม่ถูกต้อง (Lat: -90 ถึง 90, Lon: -180 ถึง 180)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await registerFarmPlot({
        lat,
        lon,
        utm_coords: formData.utm_coords || undefined,
        land_title_deed: formData.land_title_deed || undefined,
        area_size_rai: formData.area_size_rai ? parseFloat(formData.area_size_rai) : undefined,
      });

      if (response.success) {
        toast({
          title: 'สำเร็จ!',
          description: 'ลงทะเบียนแปลงนาเรียบร้อย รอการอนุมัติจากเจ้าหน้าที่',
        });

        // Reset form
        setFormData({
          lat: '',
          lon: '',
          utm_coords: '',
          land_title_deed: '',
          area_size_rai: '',
        });

        // Refresh plots
        fetchMyPlots();
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: response.error || 'ไม่สามารถลงทะเบียนได้',
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
      setLoading(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600" />
            ลงทะเบียนแปลงนา
          </h1>
          <p className="text-muted-foreground">
            กรอกข้อมูลพิกัดแปลงนาของคุณ เพื่อรับความช่วยเหลือและคำแนะนำจากระบบ
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>ลงทะเบียนแปลงใหม่</CardTitle>
              <CardDescription>
                กรุณากรอกพิกัดแปลงนาของคุณ (Latitude, Longitude)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude *</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      placeholder="เช่น 13.7563"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lon">Longitude *</Label>
                    <Input
                      id="lon"
                      type="number"
                      step="any"
                      placeholder="เช่น 100.5018"
                      value={formData.lon}
                      onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utm_coords">พิกัด UTM (Optional)</Label>
                  <Input
                    id="utm_coords"
                    placeholder="เช่น 47P 688687 1520947"
                    value={formData.utm_coords}
                    onChange={(e) => setFormData({ ...formData, utm_coords: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="land_title_deed">เลขโฉนดที่ดิน (Optional)</Label>
                  <Input
                    id="land_title_deed"
                    placeholder="เช่น น.ส.3 ก. 12345"
                    value={formData.land_title_deed}
                    onChange={(e) => setFormData({ ...formData, land_title_deed: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_size_rai">ขนาดพื้นที่ (ไร่) (Optional)</Label>
                  <Input
                    id="area_size_rai"
                    type="number"
                    step="0.01"
                    placeholder="เช่น 5.5"
                    value={formData.area_size_rai}
                    onChange={(e) => setFormData({ ...formData, area_size_rai: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนแปลงนา'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Plots List */}
          <Card>
            <CardHeader>
              <CardTitle>แปลงนาของฉัน</CardTitle>
              <CardDescription>
                รายการแปลงนาที่ลงทะเบียนไว้
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPlots ? (
                <div className="text-center py-8 text-muted-foreground">
                  กำลังโหลด...
                </div>
              ) : myPlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีแปลงนาที่ลงทะเบียน</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPlots.map((plot) => (
                    <div
                      key={plot.plot_id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">แปลง #{plot.plot_id}</span>
                        </div>
                        {getStatusBadge(plot.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>พิกัด: {plot.lat.toFixed(4)}, {plot.lon.toFixed(4)}</div>
                        {plot.area_size_rai && (
                          <div>ขนาด: {plot.area_size_rai} ไร่</div>
                        )}
                        {plot.land_title_deed && (
                          <div>โฉนด: {plot.land_title_deed}</div>
                        )}
                        <div className="text-xs">
                          ลงทะเบียนเมื่อ: {new Date(plot.created_at).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
