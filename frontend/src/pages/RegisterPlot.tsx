import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { registerFarmPlot, getMyFarmPlots } from '@/lib/api';
import { FarmPlot } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, CheckCircle, Clock, XCircle, Leaf, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';

// Fix Leaflet marker icon issue by using CDN links to avoid bundler asset issues
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Define UTM zones for Thailand
// Zone 47N: 96E to 102E
// Zone 48N: 102E to 108E
const UTM_ZONE_47N = '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs';
const UTM_ZONE_48N = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs';

// Helper: Calculate UTM Latitude Band
const getUtmBand = (lat: number) => {
  const bands = "CDEFGHJKLMNPQRSTUVWXX";
  const index = Math.floor((lat + 80) / 8);
  return (index >= 0 && index < bands.length) ? bands[index] : 'N';
};

// Component to handle map clicks
function LocationMarker({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

// Component to handle map resize and re-centering
function MapResizer({ isExpanded, mapPosition }: { isExpanded: boolean, mapPosition: { lat: number, lng: number } | null }) {
  const map = useMap();
  const positionRef = useRef(mapPosition);

  // Update ref when mapPosition changes to ensure we have the latest value
  useEffect(() => {
    positionRef.current = mapPosition;
  }, [mapPosition]);

  useEffect(() => {
    // When expansion state changes, resize and re-center
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (positionRef.current) {
        map.setView(positionRef.current, map.getZoom());
      } else {
        map.setView([13.7563, 100.5018], 6);
      }
    }, 200); // Slight delay to ensure DOM update is complete
    return () => clearTimeout(timer);
  }, [isExpanded, map]);

  return null;
}

// Helper component to handle Ctrl key interactions
function MapInteractionHandler() {
  const map = useMap();

  useEffect(() => {
    // Disable interactions initially
    map.dragging.disable();
    map.scrollWheelZoom.disable();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [map]);

  return null;
}

function MapTools({ isExpanded, onToggleExpand }: { isExpanded: boolean, onToggleExpand: () => void }) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);

  // Disable propagation of events to the map when interacting with the tools
  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.setView([13.7563, 100.5018], 6);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <div
      ref={ref}
      className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto"
      style={{ zIndex: 10000 }} // Ensure very high z-index
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-10 w-10 shadow-lg rounded-full bg-white/90 hover:bg-white border-2 border-primary/10 text-primary transition-transform hover:scale-105"
        onClick={handleExpand}
        title={isExpanded ? "ย่อแผนที่" : "ขยายแผนที่"}
      >
        {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-10 w-10 shadow-lg rounded-full bg-white/90 hover:bg-white border-2 border-primary/10 text-primary transition-transform hover:scale-105"
        onClick={handleReset}
        title="รีเซ็ตมุมมอง"
      >
        <RotateCcw className="h-5 w-5" />
      </Button>
    </div>
  );
}

/**
 * UC10: Register Farm Plot
 * Farmer can register a plot by picking a location on the map.
 * The system automatically fills Lat/Lon and calculates UTM coordinates.
 */
export default function RegisterPlot() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [myPlots, setMyPlots] = useState<FarmPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [mapPosition, setMapPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

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

  // Update map position if user manually types valid coordinates
  useEffect(() => {
    const lat = parseFloat(formData.lat);
    const lon = parseFloat(formData.lon);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      // Only update if significantly different to avoid loops/jumping
      if (!mapPosition || Math.abs(mapPosition.lat - lat) > 0.0001 || Math.abs(mapPosition.lng - lon) > 0.0001) {
        setMapPosition({ lat, lng: lon });
      }
    }
  }, [formData.lat, formData.lon]);

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

  const handleMapSelect = (pos: { lat: number, lng: number }) => {
    if (isMapExpanded) {
      setIsMapExpanded(false);
    }
    setMapPosition(pos);

    // Logic to select correct UTM Zone for Thailand
    let zoneNum = 47;
    let projDef = UTM_ZONE_47N;

    if (pos.lng >= 102) {
      zoneNum = 48;
      projDef = UTM_ZONE_48N;
    }

    let utmString = '';
    try {
      // proj4 forward transform: [lon, lat] -> [easting, northing]
      const utm = proj4('EPSG:4326', projDef, [pos.lng, pos.lat]);
      const band = getUtmBand(pos.lat);
      // Format example: 47P 688687 1520947
      utmString = `${zoneNum}${band} ${Math.round(utm[0])} ${Math.round(utm[1])}`;
    } catch (e) {
      console.error("UTM conversion failed", e);
    }

    setFormData(prev => ({
      ...prev,
      lat: pos.lat.toFixed(6),
      lon: pos.lng.toFixed(6),
      utm_coords: utmString
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lat || !formData.lon) {
      toast({
        title: 'Validation Error',
        description: 'กรุณาเลือกพิกัดบนแผนที่ หรือกรอก Latitude/Longitude',
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
        setMapPosition(null);

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
            ระบุตำแหน่งแปลงนาของคุณบนแผนที่เพื่อลงทะเบียน
          </p>
        </div>

        <div className="grid gap-6">
          {/* Registration Form & Map */}
          <Card>
            <CardHeader>
              <CardTitle>ระบุตำแหน่งแปลง</CardTitle>
              <CardDescription>
                จิ้มบนแผนที่เพื่อระบุตำแหน่ง หรือกรอกพิกัด
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Map Section (Left - 60%) */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="border-2 border-muted rounded-xl overflow-hidden relative z-0 shadow-sm h-[600px]">
                    <MapContainer
                      center={[13.7563, 100.5018]}
                      zoom={6}
                      className="w-full h-full outline-none"
                      scrollWheelZoom={false}
                      dragging={false}
                      zoomControl={false}
                    >
                      <MapResizer isExpanded={false} mapPosition={mapPosition} />
                      <MapInteractionHandler />
                      <MapTools isExpanded={false} onToggleExpand={() => setIsMapExpanded(true)} />

                      <LayersControl position="topleft">
                        <LayersControl.BaseLayer checked name="แผนที่ทั่วไป">
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="ภาพดาวเทียม">
                          <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonoline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          />
                        </LayersControl.BaseLayer>
                      </LayersControl>

                      <LocationMarker position={mapPosition} setPosition={handleMapSelect} />
                    </MapContainer>

                    {/* Instructions Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-muted/90 backdrop-blur-sm text-xs py-2 text-center text-muted-foreground border-t font-medium z-[400]">
                      <div className="flex flex-col items-center gap-1">
                        <span>คลิกที่แผนที่เพื่อปักหมุดตำแหน่ง</span>
                        <div className="flex items-center gap-1 text-[10px] opacity-70">
                          <span className="font-bold border px-1 rounded">Ctrl</span>
                          <span>+ Scroll/Drag to Zoom & Pan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Map Modal */}
                  <Dialog open={isMapExpanded} onOpenChange={setIsMapExpanded}>
                    <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
                      <DialogHeader className="px-6 py-4 border-b bg-background z-10">
                        <DialogTitle>เลือกตำแหน่งแปลงนา</DialogTitle>
                        <DialogDescription>
                          คลิกบนแผนที่เพื่อระบุตำแหน่งที่ตั้งแปลงนาของคุณ
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 relative w-full h-full">
                        <MapContainer
                          center={mapPosition || [13.7563, 100.5018]}
                          zoom={mapPosition ? 16 : 6}
                          className="w-full h-full outline-none"
                          scrollWheelZoom={true} // Enable scroll zoom in modal for better UX
                          dragging={true} // Enable dragging in modal
                          zoomControl={false}
                        >
                          <MapResizer isExpanded={true} mapPosition={mapPosition} />
                          {/* No Helper needed as dragging is enabled? Or keep consistency? Let's use standard behaviors with Zoom Control? */}
                          {/* User asked for "Modal Map", usually assumes easier interaction. Let's enable default interactions but maybe keep Ctrl requirement if consistent? 
                                User said "Zoom mode doesn't focus Thailand".
                                Let's keep MapTools for Reset.
                             */}
                          <MapTools isExpanded={true} onToggleExpand={() => setIsMapExpanded(false)} />

                          <LayersControl position="topleft">
                            <LayersControl.BaseLayer checked name="แผนที่ทั่วไป">
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="ภาพดาวเทียม">
                              <TileLayer
                                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                url="https://server.arcgisonoline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                              />
                            </LayersControl.BaseLayer>
                          </LayersControl>

                          <LocationMarker position={mapPosition} setPosition={handleMapSelect} />
                        </MapContainer>

                        {/* Floating Hint in Modal */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
                          <div className="bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 whitespace-nowrap">
                            <MapPin className="h-5 w-5 text-green-400" />
                            <span className="font-medium">คลิกเลือกตำแหน่ง แล้วปิดหน้าต่างเพื่อยืนยัน</span>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Form Section (Right - 40%) */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
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
                      <Label htmlFor="utm_coords">พิกัด UTM (คำนวณอัตโนมัติ)</Label>
                      <Input
                        id="utm_coords"
                        placeholder="เช่น 47P 688687 1520947"
                        value={formData.utm_coords}
                        onChange={(e) => setFormData({ ...formData, utm_coords: e.target.value })}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                      />
                      <p className="text-[0.8rem] text-muted-foreground">
                        * ระบบคำนวณจาก Lat/Lon ตามโซนประเทศไทย (47N/48N)
                      </p>
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

                    <div className="grow"></div> {/* Spacer to push button down if needed */}

                    <Button type="submit" className="w-full mt-4" disabled={loading}>
                      {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนแปลงนา'}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
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
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-2">
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
                      {plot.utm_coords && (
                        <div className="text-xs font-mono bg-muted inline-block px-1 rounded">UTM: {plot.utm_coords}</div>
                      )}
                      {plot.area_size_rai && (
                        <div className="mt-1">ขนาด: {plot.area_size_rai} ไร่</div>
                      )}
                      {plot.land_title_deed && (
                        <div>โฉนด: {plot.land_title_deed}</div>
                      )}
                      <div className="text-xs pt-2 border-t mt-2">
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
    </DashboardLayout>
  );
}
