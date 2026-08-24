"use client";

import { MapContainer, TileLayer, Marker, LayersControl, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";

// Fix Leaflet default icon issue with Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface AddressData {
  fullAddress: string;
  city: string;
  region: string;
  neighborhood: string;
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: AddressData) => void;
  initialLat?: number;
  initialLng?: number;
  focusLat?: number;
  focusLng?: number;
  focusZoom?: number;
}

async function reverseGeocode(lat: number, lng: number): Promise<AddressData | null> {
  try {
    const response = await fetch("/api/reverse-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {}
  return null;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    async click(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

function DraggableMarker({ position, onDragEnd }: { position: [number, number]; onDragEnd: (lat: number, lng: number) => void }) {
  const [draggable, setDraggable] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    setDraggable(true);
  }, []);

  const handleDragEnd = async () => {
    const marker = markerRef.current;
    if (!marker) return;
    const { lat, lng } = marker.getLatLng();
    onDragEnd(lat, lng);
  };

  return (
    <Marker
      position={position}
      icon={customIcon}
      draggable={draggable}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
      ref={markerRef}
    />
  );
}

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoom) {
      map.flyTo(center, zoom, { duration: 1.2 });
    } else {
      map.setView(center);
    }
  }, [center, zoom, map]);
  return null;
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng, focusLat, focusLng, focusZoom }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Default to Northern Cyprus
  const defaultCenter: [number, number] = [35.1856, 33.3823];
  const center = markerPosition || defaultCenter;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    setLoading(true);
    
    const addressData = await reverseGeocode(lat, lng);
    if (addressData) {
      setAddress(addressData.fullAddress);
      onLocationSelect(lat, lng, addressData);
    } else {
      setAddress("");
      onLocationSelect(lat, lng);
    }
    setLoading(false);
  };

  if (!mounted) {
    return (
      <div className="h-[400px] w-full rounded-xl bg-zinc-100 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Harita yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-zinc-200">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          className="z-0"
          style={{ height: "400px", width: "100%" }}
        >
          <MapController center={focusLat && focusLng ? [focusLat, focusLng] : center} zoom={focusZoom} />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Harita">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Uydu">
              {/* Esri World Imagery: anahtar gerektirmez, KKTC dahil yüksek çözünürlük. */}
              <TileLayer
                attribution="Kaynak: Esri, Maxar, Earthstar Geographics"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay name="Uydu üzerinde sokak adları">
              {/* Uydu görünümünde yol ve yer adlarını okunur tutmak için şeffaf etiket katmanı. */}
              <TileLayer
                attribution="Kaynak: Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.Overlay>
          </LayersControl>
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {markerPosition && (
            <DraggableMarker position={markerPosition} onDragEnd={handleLocationSelect} />
          )}
        </MapContainer>
      </div>
      
      {loading && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-blue-700">Adres bilgisi alınıyor...</span>
        </div>
      )}

      {address && !loading && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs font-medium text-emerald-700 mb-1">Seçili adres:</p>
          <p className="text-sm text-emerald-900">{address}</p>
        </div>
      )}

      {markerPosition && !loading && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <span className="text-xs font-medium text-zinc-600">Koordinat:</span>
          <code className="text-xs font-mono text-zinc-700">
            {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
          </code>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        💡 Haritada bir noktaya tıklayın veya pin sürükleyerek konumu değiştirin. Sağ üstteki katman
        düğmesinden <strong className="font-semibold text-zinc-600">Uydu</strong> görünümüne geçebilirsiniz.
      </p>
    </div>
  );
}
