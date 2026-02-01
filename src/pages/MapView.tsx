import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getStations } from '@/lib/api';
import { Station } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { MapPin, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Thailand GeoJSON URL - simplified Thailand outline
const THAILAND_TOPO_JSON = "https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json";

const statusColors: Record<Station['status'], string> = {
  normal: 'hsl(var(--chart-1))',
  warning: 'hsl(var(--chart-5))',
  critical: 'hsl(var(--destructive))',
  offline: 'hsl(var(--muted))',
};

export default function MapView() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([100.5, 13.5]);
  const navigate = useNavigate();

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

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));
  const handleReset = () => {
    setZoom(1);
    setCenter([100.5, 13.5]);
  };

  const handleMarkerClick = (station: Station) => {
    setSelectedStation(station);
  };

  const handleViewDetails = () => {
    if (selectedStation) {
      navigate(`/stations/${selectedStation.station_id}`);
    }
  };

  const stationsByStatus = useMemo(() => {
    return stations.reduce((acc, station) => {
      acc[station.status] = (acc[station.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [stations]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full" />
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
            <h1 className="text-2xl font-bold tracking-tight">Thailand Map View</h1>
            <p className="text-muted-foreground">
              Interactive map showing all monitoring stations
            </p>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm capitalize">{status}</span>
                <span className="text-sm text-muted-foreground">
                  ({stationsByStatus[status] || 0})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Map */}
          <Card className="lg:col-span-3">
            <CardContent className="p-0 relative">
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleReset}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-[600px] bg-muted/30 rounded-lg overflow-hidden">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    scale: 2000,
                    center: [100.5, 13.5],
                  }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <ZoomableGroup 
                    zoom={zoom} 
                    center={center}
                    onMoveEnd={({ coordinates, zoom: newZoom }) => {
                      setCenter(coordinates as [number, number]);
                      setZoom(newZoom);
                    }}
                  >
                    <Geographies geography={THAILAND_TOPO_JSON}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="hsl(96, 74%, 88%)"
                            stroke="hsl(99, 59%, 54%)"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none' },
                              hover: { fill: 'hsl(99, 73%, 75%)', outline: 'none' },
                              pressed: { outline: 'none' },
                            }}
                          />
                        ))
                      }
                    </Geographies>

                    {/* Station Markers */}
                    {stations.map((station) => (
                      <Marker
                        key={station.station_id}
                        coordinates={[station.longitude, station.latitude]}
                        onClick={() => handleMarkerClick(station)}
                      >
                        <circle
                          r={6 / zoom}
                          fill={statusColors[station.status]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2 / zoom}
                          style={{ cursor: 'pointer' }}
                          className="transition-all hover:r-8"
                        />
                        {selectedStation?.station_id === station.station_id && (
                          <circle
                            r={12 / zoom}
                            fill="none"
                            stroke={statusColors[station.status]}
                            strokeWidth={2 / zoom}
                            className="animate-pulse"
                          />
                        )}
                      </Marker>
                    ))}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            </CardContent>
          </Card>

          {/* Station Info Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Station Info
              </CardTitle>
              <CardDescription>
                Click a marker on the map to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStation ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedStation.station_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedStation.province}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <StatusBadge status={selectedStation.status} size="sm" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sensors</span>
                      <span className="text-sm font-medium">{selectedStation.sensor_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Latitude</span>
                      <span className="text-sm font-mono">{selectedStation.latitude.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Longitude</span>
                      <span className="text-sm font-mono">{selectedStation.longitude.toFixed(4)}</span>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleViewDetails}>
                    View Station Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Select a station on the map</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
