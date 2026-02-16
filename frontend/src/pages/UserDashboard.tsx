
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMyFarmPlots, getStationById, getStationLatestData, getSensorData, getPlotDiseaseRisk } from '@/lib/api';
import { FarmPlot, Station, SensorData, PlotDiseaseRisk } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { MapPin, Sprout, Wind, Droplets, Thermometer, CloudRain, Clock, Map as MapIcon, Info, TrendingUp, AlertTriangle, CloudFog } from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';

// --- Icon Configurations for Map ---
const createStationIcon = (status: Station['status'] = 'normal') => {
    const colorMap: Record<string, string> = {
        normal: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        critical: '#ef4444', // red-500
        offline: '#94a3b8', // slate-400
    };

    const html = renderToString(
        <div className="relative flex items-center justify-center w-8 h-8">
            <span className="absolute animate-ping inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorMap[status] || colorMap.normal }}></span>
            <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-white" style={{ backgroundColor: colorMap[status] || colorMap.normal }}></span>
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

const farmPlotIcon = L.divIcon({
    className: 'custom-farm-icon',
    html: renderToString(
        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-lg">
            <Sprout className="h-6 w-6 text-white" />
        </div>
    ),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

// Helper to center map
function MapCentering({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13); // Zoom level 13 is good for ~5-10km range
    }, [center, map]);
    return null;
}

export default function UserDashboard() {
    const [allPlots, setAllPlots] = useState<FarmPlot[]>([]);
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
    const [station, setStation] = useState<Station | null>(null);
    const [sensorData, setSensorData] = useState<any[]>([]);
    const [diseaseRisk, setDiseaseRisk] = useState<PlotDiseaseRisk | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);

    // History data for charts
    const [tempHumidHistory, setTempHumidHistory] = useState<any[]>([]);
    const [soilHistory, setSoilHistory] = useState<any[]>([]);
    const [rainHistory, setRainHistory] = useState<any[]>([]);

    // Derived state
    const activePlots = useMemo(() => allPlots.filter(p => p.status === 'active'), [allPlots]);
    const pendingPlots = useMemo(() => allPlots.filter(p => p.status === 'pending'), [allPlots]);
    const rejectedPlots = useMemo(() => allPlots.filter(p => p.status === 'rejected'), [allPlots]);

    // Initial Fetch
    useEffect(() => {
        const fetchPlots = async () => {
            try {
                const plotsRes = await getMyFarmPlots();
                if (plotsRes.success && plotsRes.data) {
                    setAllPlots(plotsRes.data);
                    const firstActive = plotsRes.data.find(p => p.status === 'active');
                    if (firstActive) {
                        setSelectedPlotId(firstActive.plot_id.toString());
                    }
                }
            } catch (err) {
                console.error('Failed to fetch plots:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlots();
    }, []);

    // Fetch data when plot changes
    useEffect(() => {
        const fetchPlotData = async () => {
            if (!selectedPlotId) return;

            setDataLoading(true);
            const currentPlot = activePlots.find(p => p.plot_id.toString() === selectedPlotId);

            if (currentPlot) {
                try {
                    // Fetch Disease Risk for the plot
                    getPlotDiseaseRisk(currentPlot.plot_id).then(res => {
                        if (res.success && res.data) setDiseaseRisk(res.data);
                        else setDiseaseRisk(null);
                    });

                    if (currentPlot.nearest_station_id) {
                        const [stationRes, dataRes] = await Promise.all([
                            getStationById(currentPlot.nearest_station_id),
                            getStationLatestData(currentPlot.nearest_station_id)
                        ]);

                        if (stationRes.success && stationRes.data) {
                            setStation(stationRes.data);
                        }

                        if (dataRes.success && dataRes.data) {
                            const flattenedData = dataRes.data.map((item: any) => ({
                                ...item.sensor,
                                value: item.latestData?.value,
                                recorded_at: item.latestData?.recorded_at,
                                data_id: item.latestData?.data_id
                            }));
                            setSensorData(flattenedData);

                            // Fetch history for charts (mock logic for now - ideally we fetch per sensor)
                            // We will fetch 24h history for specific sensors found in flattenedData
                            fetchChartHistory(flattenedData);
                        } else {
                            setSensorData([]);
                        }
                    } else {
                        setStation(null);
                        setSensorData([]);
                    }
                } catch (error) {
                    console.error("Error fetching plot data", error);
                }
            }
            setDataLoading(false);
        };

        fetchPlotData();
    }, [selectedPlotId, activePlots]);

    const fetchChartHistory = async (sensors: any[]) => {
        // Find relevant sensors
        const tempSensor = sensors.find(s => s.sensor_type.toLowerCase().includes('temp'));
        const humidSensor = sensors.find(s => s.sensor_type.toLowerCase().includes('humid'));
        const soilSensor = sensors.find(s => s.sensor_type.toLowerCase().includes('soil'));
        const rainSensor = sensors.find(s => s.sensor_type.toLowerCase().includes('rain'));

        const endDate = new Date();
        const startDate = subHours(endDate, 24);

        const fetchSensorHistory = async (sensor: any) => {
            if (!sensor) return [];
            const res = await getSensorData(sensor.sensor_id, startDate.toISOString(), endDate.toISOString());
            return res.success && res.data ? res.data : [];
        };

        const [tempData, humidData, soilData, rainData] = await Promise.all([
            fetchSensorHistory(tempSensor),
            fetchSensorHistory(humidSensor),
            fetchSensorHistory(soilSensor),
            fetchSensorHistory(rainSensor)
        ]);

        // Merge Temp & Humid
        const mergedTempHumid = tempData.map(t => {
            const h = humidData.find(h => Math.abs(new Date(h.recorded_at).getTime() - new Date(t.recorded_at).getTime()) < 5 * 60 * 1000); // match within 5 mins
            return {
                time: format(new Date(t.recorded_at), 'HH:mm'),
                temp: t.value,
                humid: h ? h.value : null
            };
        }).reverse(); // API usually returns desc
        setTempHumidHistory(mergedTempHumid.reverse()); // Chart needs asc

        // Soil
        setSoilHistory(soilData.map(d => ({
            time: format(new Date(d.recorded_at), 'HH:mm'),
            value: d.value
        })).reverse());

        // Rain
        setRainHistory(rainData.map(d => ({
            time: format(new Date(d.recorded_at), 'HH:mm'),
            value: d.value
        })).reverse());
    };

    if (loading) return <DashboardSkeleton />;
    if (allPlots.length === 0) return <WelcomeState />;
    if (activePlots.length === 0) return <PendingState plots={[...pendingPlots, ...rejectedPlots]} />;

    const currentPlot = activePlots.find(p => p.plot_id.toString() === selectedPlotId);

    // Safe values for the UI
    const rainValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('rain'))?.value ?? 0;
    const soilValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('soil'))?.value ?? 0;
    const windValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('wind'))?.value ?? 0;

    // Risk Pillars Data
    const riskData = [
        { subject: 'Drought', A: soilValue < 30 ? 90 : 20, fullMark: 100 }, // Mock logic: Low soil moisture = high drought risk
        { subject: 'Flood', A: rainValue > 50 ? 80 : 10, fullMark: 100 }, // Mock logic
        { subject: 'Storm', A: windValue > 20 ? 70 : 15, fullMark: 100 }, // Mock logic
        { subject: 'Pests', A: (diseaseRisk?.bus_score || 0) > 2 ? 85 : 30, fullMark: 100 },
    ];

    const isHighRisk = (diseaseRisk?.bus_score || 0) >= 2.25;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header: Plot Selector & Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Farm Dashboard</h1>
                        <p className="text-muted-foreground">Monitor your farm's health and risks in real-time.</p>
                    </div>
                    <div className="w-full md:w-[250px]">
                        <Select value={selectedPlotId || ''} onValueChange={setSelectedPlotId}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select Plot" />
                            </SelectTrigger>
                            <SelectContent>
                                {activePlots.map(p => (
                                    <SelectItem key={p.plot_id} value={p.plot_id.toString()}>
                                        Plot #{p.plot_id} - {p.land_title_deed || 'No Deed'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 1. Status Overview Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* BUS Level Card */}
                    <Card className={`border-l-4 ${isHighRisk ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disease Risk (BUS)</p>
                                    <h3 className={`text-2xl font-bold mt-2 ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {diseaseRisk ? diseaseRisk.bus_score.toFixed(2) : 'N/A'}
                                    </h3>
                                    <Badge variant={isHighRisk ? "destructive" : "secondary"} className="mt-2">
                                        {isHighRisk ? 'High Risk' : 'Low Risk'}
                                    </Badge>
                                </div>
                                <div className={`p-3 rounded-full ${isHighRisk ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                {isHighRisk ? 'High infection probability. Apply fungicides.' : 'Conditions unfavorable for blast disease.'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Rainfall Card */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Daily Rainfall</p>
                                    <h3 className="text-2xl font-bold mt-2 text-blue-600">
                                        {rainValue.toFixed(1)} <span className="text-base font-normal text-muted-foreground">mm</span>
                                    </h3>
                                    <Badge variant="outline" className="mt-2 text-blue-600 border-blue-200 bg-blue-50">
                                        Last 24h
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    <CloudRain className="h-6 w-6" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                {rainValue > 10 ? 'Heavy rain recorded. Check drainage.' : 'No significant rainfall today.'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Plant Health Card (Mock) */}
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Plant Health</p>
                                    <h3 className="text-2xl font-bold mt-2 text-green-600">Optimal</h3>
                                    <Badge variant="outline" className="mt-2 text-green-600 border-green-200 bg-green-50">
                                        Growth Stage
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-full bg-green-100 text-green-600">
                                    <Sprout className="h-6 w-6" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                Soil moisture and temperature are ideal for growth.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Middle Section: Map & Risk Analysis */}
                <div className="grid gap-6 md:grid-cols-12 h-auto md:h-[500px]">
                    {/* Interactive Map (Left - Larger) */}
                    <Card className="md:col-span-8 overflow-hidden flex flex-col">
                        <CardHeader className="py-4 px-6 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <MapIcon className="h-5 w-5" /> Plot & Station Map
                                </CardTitle>
                                {station && (
                                    <Badge variant={station.status === 'normal' ? 'default' : 'destructive'}>
                                        Station: {station.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <div className="flex-1 relative z-0 min-h-[300px]">
                            {currentPlot && (
                                <MapContainer
                                    center={[currentPlot.lat, currentPlot.lon]}
                                    zoom={13}
                                    className="h-full w-full"
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapCentering center={[currentPlot.lat, currentPlot.lon]} />

                                    {/* User Plot */}
                                    <Marker position={[currentPlot.lat, currentPlot.lon]} icon={farmPlotIcon}>
                                        <Popup>
                                            <div className="font-semibold">My Plot #{currentPlot.plot_id}</div>
                                            <div className="text-xs">{currentPlot.utm_coords}</div>
                                        </Popup>
                                    </Marker>

                                    {/* Station */}
                                    {station && (
                                        <>
                                            <Marker
                                                position={[station.latitude, station.longitude]}
                                                icon={createStationIcon(station.status)}
                                            >
                                                <Popup>
                                                    <div className="font-semibold">{station.station_name}</div>
                                                    <div className="text-xs">Distance: ~{(Math.sqrt(Math.pow(station.latitude - currentPlot.lat, 2) + Math.pow(station.longitude - currentPlot.lon, 2)) * 111).toFixed(2)} km</div>
                                                </Popup>
                                            </Marker>
                                            {/* Line connecting them */}
                                            <Polyline
                                                positions={[
                                                    [currentPlot.lat, currentPlot.lon],
                                                    [station.latitude, station.longitude]
                                                ]}
                                                pathOptions={{ color: 'blue', dashArray: '5, 10' }}
                                            />
                                        </>
                                    )}
                                </MapContainer>
                            )}

                            {/* Overlay Info */}
                            <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg border max-w-xs">
                                <h4 className="font-semibold text-sm mb-2 border-b pb-1 text-black">Plot Details</h4>
                                <div className="space-y-1 font-semibold text-xs text-black">
                                    <div className="flex justify-between"><span>Deed:</span> <span className="font-mono">{currentPlot?.land_title_deed}</span></div>
                                    <div className="flex justify-between"><span>Area:</span> <span>{currentPlot?.area_size_rai} Rai</span></div>
                                    <div className="flex justify-between"><span>UTM:</span> <span className="font-mono">{currentPlot?.utm_coords || '-'}</span></div>
                                    <div className="flex justify-between text-muted-foreground mt-2"><span>Nearest Station:</span> <span>{station?.station_name || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Risk Analysis (Right - Smaller) */}
                    <Card className="md:col-span-4 flex flex-col">
                        <CardHeader className="py-4 border-b">
                            <CardTitle>4-Pillar Risk Analysis</CardTitle>
                            <CardDescription>Current risk assessment per TOR</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center p-0">
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={riskData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Risk Level"
                                        dataKey="A"
                                        stroke="#0ea5e9"
                                        fill="#0ea5e9"
                                        fillOpacity={0.4}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => [value > 50 ? 'High' : 'Low', 'Risk']}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                        <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                            {riskData.map(risk => (
                                <div key={risk.subject} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                    <span>{risk.subject}</span>
                                    <div className={`h-2 w-2 rounded-full ${risk.A > 50 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* 3. Bottom Section: Environmental Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" /> Environmental Trends (24h)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="temp" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="temp">Temp & Humidity</TabsTrigger>
                                <TabsTrigger value="soil">Soil Moisture</TabsTrigger>
                                <TabsTrigger value="rain">Rainfall</TabsTrigger>
                            </TabsList>

                            {/* Temp & Humid Chart */}
                            <TabsContent value="temp" className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={tempHumidHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" minTickGap={30} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#f97316" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} name="Temperature (°C)" dot={false} />
                                        <Line yAxisId="right" type="monotone" dataKey="humid" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </TabsContent>

                            {/* Soil Chart */}
                            <TabsContent value="soil" className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={soilHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" minTickGap={30} />
                                        <YAxis stroke="#8b5cf6" />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} name="Soil Moisture (%)" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </TabsContent>

                            {/* Rain Chart */}
                            <TabsContent value="rain" className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={rainHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" minTickGap={30} />
                                        <YAxis stroke="#0ea5e9" />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="step" dataKey="value" stroke="#0ea5e9" strokeWidth={2} name="Rainfall (mm)" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

// --- Sub States ---

function WelcomeState() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="p-6 bg-emerald-50 rounded-full">
                    <Sprout className="h-16 w-16 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold">Welcome to Smart Farm View</h2>
                <p className="max-w-md text-muted-foreground">Register your first farm plot to start monitoring environmental data and disease risks.</p>
                <Button size="lg" asChild>
                    <Link to="/map">Register Plot</Link>
                </Button>
            </div>
        </DashboardLayout>
    );
}

function PendingState({ plots }: { plots: FarmPlot[] }) {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="p-6 bg-amber-50 rounded-full">
                    <Clock className="h-16 w-16 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold">Registration Pending</h2>
                <p className="max-w-md text-muted-foreground">
                    You have {plots.length} plot(s) waiting for approval.
                    Once approved, your dashboard will activate automatically.
                </p>
            </div>
        </DashboardLayout>
    );
}

function DashboardSkeleton() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-12 h-[500px]">
                    <Skeleton className="md:col-span-8 rounded-xl" />
                    <Skeleton className="md:col-span-4 rounded-xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </DashboardLayout>
    );
}
