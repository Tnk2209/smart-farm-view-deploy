import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getStations, getMyFarmPlots } from '@/lib/api';
import { Station, FarmPlot } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { MapPin, Info, Tractor } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';

// --- Icon Configurations ---

// 1. Station Icon (Dynamic Color)
const createStationIcon = (status: Station['status']) => {
  const colorMap: Record<Station['status'], string> = {
    normal: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    critical: '#ef4444', // red-500
    offline: '#94a3b8', // slate-400
  };

  const html = renderToString(
    <div className="relative flex items-center justify-center w-8 h-8">
      <span className="absolute animate-ping inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorMap[status] }}></span>
      <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-white" style={{ backgroundColor: colorMap[status] }}></span>
    </div>
  );

  return L.divIcon({
    className: 'custom-station-icon',
    html: html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
  });
};

// 2. Farm Plot Icon (User's Plot)
const farmPlotIcon = L.divIcon({
  className: 'custom-farm-icon',
  html: renderToString(
    <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-lg">
      <Tractor className="h-6 w-6 text-white" />
    </div>
  ),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Helper component to fit bounds
function MapBounds({ stations, plots }: { stations: Station[], plots: FarmPlot[] }) {
  const map = useMap();

  useEffect(() => {
    if (stations.length === 0 && plots.length === 0) return;

    const bounds = L.latLngBounds([]);
    stations.forEach(s => bounds.extend([s.latitude, s.longitude]));
    plots.forEach(p => bounds.extend([p.lat, p.lon]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, plots, map]);

  return null;
}

export default function MapView() {
  const [stations, setStations] = useState<Station[]>([]);
  const [myPlots, setMyPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stationsRes, plotsRes] = await Promise.all([
          getStations(),
          getMyFarmPlots()
        ]);

        if (stationsRes.success) {
          setStations(stationsRes.data || []);
        }

        if (plotsRes.success) {
          setMyPlots(plotsRes.data || []);
        }

      } catch (error) {
        console.error('Failed to fetch map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewStationDetails = (stationId: number) => {
    navigate(`/stations/${stationId}`);
  };

  const statusColors: Record<Station['status'], string> = {
    normal: 'text-green-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
    offline: 'text-slate-400',
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Map Overview</h1>
            <p className="text-muted-foreground">
              แสดงตำแหน่งสถานีตรวจวัดและแปลงนาของคุณ
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 grow min-h-0">
          {/* Map */}
          <Card className="lg:col-span-3 flex flex-col overflow-hidden">
            <CardContent className="p-0 grow relative z-0">
              <MapContainer
                center={[13.7563, 100.5018]}
                zoom={6}
                className="h-full w-full min-h-[500px]"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBounds stations={stations} plots={myPlots} />

                {/* Station Markers */}
                {stations.map((station) => (
                  <Marker
                    key={`station-${station.station_id}`}
                    position={[station.latitude, station.longitude]}
                    icon={createStationIcon(station.status)}
                    eventHandlers={{
                      click: () => setSelectedStation(station)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {station.station_name}
                        </h3>
                        <div className="text-sm text-muted-foreground mb-2">{station.province}</div>
                        <div className="flex items-center justify-between mb-3 text-sm">
                          <span>Status:</span>
                          <StatusBadge status={station.status} size="sm" />
                        </div>
                        <Button size="sm" className="w-full" onClick={() => handleViewStationDetails(station.station_id)}>
                          View Details
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* User Plot Markers */}
                {myPlots.map((plot) => (
                  <Marker
                    key={`plot-${plot.plot_id}`}
                    position={[plot.lat, plot.lon]}
                    icon={farmPlotIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[180px]">
                        <h3 className="font-bold flex items-center gap-2 text-blue-700">
                          <Tractor className="h-4 w-4" />
                          แปลงนาของฉัน #{plot.plot_id}
                        </h3>
                        <div className="text-sm mt-1">
                          <div>ขนาด: {plot.area_size_rai || '-'} ไร่</div>
                          <div>โฉนด: {plot.land_title_deed || '-'}</div>
                        </div>
                        {plot.utm_coords && (
                          <div className="text-xs bg-muted p-1 mt-2 rounded font-mono dark:text-white">
                            {plot.utm_coords}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

              </MapContainer>

              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border text-xs">
                <div className="font-semibold mb-2 text-black">สัญลักษณ์</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full  bg-green-500"></span>
                    <span className="text-black">Station (Normal)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-black">Station (Warning)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-black">Station (Critical)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <Tractor className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className="text-black">แปลงนาของคุณ</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side Info Panel */}
          <Card className="lg:col-span-1 border-l-0 lg:border-l">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Information
              </CardTitle>
              <CardDescription>
                เลือกจุดบนแผนที่เพื่อดูรายละเอียด
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStation ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-lg">{selectedStation.station_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedStation.province}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <StatusBadge status={selectedStation.status} size="sm" />
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Sensors</span>
                      <span className="text-sm font-medium">{selectedStation.sensor_count || 0} ตัว</span>
                    </div>
                    <div className="space-y-1 py-2">
                      <span className="text-sm text-muted-foreground block">Coordinates</span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted p-2 rounded">
                        <div>Lat: {selectedStation.latitude.toFixed(4)}</div>
                        <div>Lon: {selectedStation.longitude.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-4" onClick={() => handleViewStationDetails(selectedStation.station_id)}>
                    ดูข้อมูลเซนเซอร์
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>คลิกที่สถานีบนแผนที่<br />เพื่อดูข้อมูลเบื้องต้น</p>
                </div>
              )}

              {/* Summary Stats */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-3 text-sm">ภาพรวมระบบ</h4>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded border">
                    <div className="text-2xl font-bold text-green-500">{stations.length}</div>
                    <div className="text-xs text-muted-foreground text-green-700">สถานีทั้งหมด</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{myPlots.length}</div>
                    <div className="text-xs text-blue-600">แปลงนาของคุณ</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
