import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { MapPin } from 'lucide-react';

// Define Props
interface StationMapPickerProps {
    latitude: number | null;
    longitude: number | null;
    onLocationSelect: (lat: number, lon: number) => void;
}

// Custom Marker Icon
const markerIcon = L.divIcon({
    className: 'custom-marker-icon',
    html: renderToString(
        <div className="relative flex items-center justify-center w-8 h-8 -mt-8 -ml-4 pointer-events-none">
            <MapPin className="h-8 w-8 text-red-500 drop-shadow-md" fill="currentColor" />
        </div>
    ),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

// Component to handle map clicks
function LocationMarker({ onLocationSelect, position }: { onLocationSelect: (lat: number, lon: number) => void, position: { lat: number, lng: number } | null }) {
    const map = useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);


    return position === null ? null : (
        <Marker position={position} icon={markerIcon} />
    );
}

export function StationMapPicker({ latitude, longitude, onLocationSelect }: StationMapPickerProps) {
    const defaultCenter: [number, number] = [13.7563, 100.5018]; // Bangkok Default
    const position = latitude && longitude ? { lat: latitude, lng: longitude } : null;

    return (
        <div className="h-[500px] w-full rounded-md border overflow-hidden relative z-0">
            <MapContainer
                center={position ? [position.lat, position.lng] : defaultCenter}
                zoom={6}
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker onLocationSelect={onLocationSelect} position={position} />
            </MapContainer>

            {!position && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow text-xs font-medium text-muted-foreground pointer-events-none border">
                    Click on map to set location
                </div>
            )}
        </div>
    );
}
