
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
import { MapPin, Sprout, Wind, Droplets, Thermometer, CloudRain, Clock, Map as MapIcon, Info, TrendingUp, AlertTriangle, CloudFog, Gauge, Monitor, Radio, Activity } from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useNavigate } from 'react-router-dom';
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

                            // // Filter to show only specifically requested sensors
                            // const allowedSensors = [
                            //     'wind_speed_ms',
                            //     'air_temp_c',
                            //     'air_rh_pct',
                            //     'air_pressure_hpa',
                            //     'soil_temp_c',
                            //     'soil_rh_pct' // Fallback
                            // ];

                            // const filteredData = flattenedData.filter((item: any) =>
                            //     allowedSensors.includes(item.sensor_type)
                            // );

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
            <div className="space-y-10 animate-in fade-in duration-500 pb-10">
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

                {/* 1. 4-Pillar Risk Analysis (Top Section) */}
                <div className="grid gap-4 md:grid-cols-4">
                    <RiskCard
                        title="ภัยแล้ง"
                        subTitle="Drought Risk"
                        percent={riskData[0].A}
                        type="drought"
                    />
                    <RiskCard
                        title="น้ำท่วม"
                        subTitle="Flood Risk"
                        percent={riskData[1].A}
                        type="flood"
                    />
                    <RiskCard
                        title="พายุ"
                        subTitle="Storm Risk"
                        percent={riskData[2].A}
                        type="storm"
                    />
                    <RiskCard
                        title="โรค/แมลง"
                        subTitle="Disease Risk"
                        percent={riskData[3].A}
                        type="disease"
                    />
                </div>

                {/* 2. Middle Section: Map & Risk Analysis */}
                <div className="grid gap-6 md:grid-cols-12 items-start">
                    {/* Interactive Map (Left - Larger) */}
                    <Card className="md:col-span-8 overflow-hidden flex flex-col h-[600px]">
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
                        <div className="flex-1 relative z-0 min-h-0">
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

                    {/* Sensor Status (Right - Smaller) */}
                    <div className="md:col-span-4 flex flex-col gap-4 h-[600px]">
                        <div className="bg-card rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-blue-600" />
                                    Live Sensors
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs text-muted-foreground">Live</span>
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto grow">
                                {sensorData.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {sensorData.map((sensor, idx) => (
                                            <MiniSensorCard key={sensor.sensor_id || idx} data={sensor} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                        <Monitor className="h-10 w-10 mb-2 opacity-20" />
                                        <p>No sensor data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
                    <Link to="/register-plot">Register Plot</Link>
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



function RiskCard({ title, subTitle, percent, type }: { title: string, subTitle: string, percent: number, type: 'drought' | 'flood' | 'storm' | 'disease' }) {
    const getConfig = () => {
        switch (type) {
            case 'drought': // Orange/Yellow
                return {
                    icon: Thermometer,
                    bg: 'bg-orange-50 dark:bg-orange-950/20',
                    border: 'border-orange-100 dark:border-orange-900',
                    text: 'text-orange-600 dark:text-orange-400',
                    bar: 'bg-orange-500'
                };
            case 'flood': // Blue
                return {
                    icon: CloudRain,
                    bg: 'bg-blue-50 dark:bg-blue-950/20',
                    border: 'border-blue-100 dark:border-blue-900',
                    text: 'text-blue-600 dark:text-blue-400',
                    bar: 'bg-blue-500'
                };
            case 'storm': // Purple
                return {
                    icon: Wind,
                    bg: 'bg-purple-50 dark:bg-purple-950/20',
                    border: 'border-purple-100 dark:border-purple-900',
                    text: 'text-purple-600 dark:text-purple-400',
                    bar: 'bg-purple-500'
                };
            case 'disease': // Red/Pink
                return {
                    icon: AlertTriangle, // Using Alert for Bug replacement if needed, or import Bug
                    bg: 'bg-red-50 dark:bg-red-950/20',
                    border: 'border-red-100 dark:border-red-900',
                    text: 'text-red-600 dark:text-red-400',
                    bar: 'bg-red-500'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    // Determine Status
    let status = 'Low Risk';
    let levelText = 'Low';
    let statusColor = 'bg-emerald-500';
    if (percent >= 40) {
        status = 'Medium Risk';
        levelText = 'Medium';
        statusColor = 'bg-amber-500';
    }
    if (percent >= 70) {
        status = 'High Risk';
        levelText = 'High';
        statusColor = 'bg-red-500';
    }

    return (
        <Card className={`border ${config.border} shadow-sm hover:shadow-md transition-all`}>
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-base">{title}</h4>
                        <p className="text-xs text-muted-foreground">{subTitle}</p>
                    </div>
                    <div className={`p-2 rounded-full ${config.bg} ${config.text}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-end gap-1">
                        <span className={`text-3xl font-bold ${config.text.split(' ')[0]}`}>{levelText}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>

                    <Badge className={`w-full justify-center ${statusColor} text-white hover:bg-opacity-90 border-0`}>
                        {status}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function MiniSensorCard({ data }: { data: any }) {
    const navigate = useNavigate();

    const getIcon = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('temp')) return Thermometer;
        if (lower.includes('humid')) return Droplets;
        if (lower.includes('rain')) return CloudRain;
        if (lower.includes('wind')) return Wind;
        if (lower.includes('press')) return Gauge;
        if (lower.includes('soil')) return Radio;
        return Activity;
    };

    const getColor = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('temp')) return { text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:border-orange-400' };
        if (lower.includes('humid')) return { text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400' };
        if (lower.includes('rain')) return { text: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:border-cyan-400' };
        if (lower.includes('wind')) return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', hover: 'hover:border-slate-400' };
        if (lower.includes('soil')) return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400' };
        return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400' };
    };

    const Icon = getIcon(data.sensor_type);
    const colors = getColor(data.sensor_type);

    return (
        <div
            onClick={() => navigate(`/sensors/${data.sensor_id}`)}
            className={`
                relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer
                bg-white dark:bg-card shadow-sm hover:shadow-md
                flex flex-col justify-between gap-3 overflow-hidden group
                ${colors.border} ${colors.hover}
            `}
        >
            <div className="flex justify-between items-start w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate max-w-[100px]">
                    {(data.sensor_type || 'Sensor').replace(/_/g, ' ')}
                </span>
                <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>

            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                    {typeof data.value === 'number' ? data.value.toFixed(1) : (data.value || '--')}
                </span>
                {data.unit && (
                    <span className="text-xs font-medium text-muted-foreground/70">
                        {data.unit}
                    </span>
                )}
            </div>
        </div>
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
