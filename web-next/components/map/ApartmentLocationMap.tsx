"use client";

import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface ApartmentLocationMapProps {
  latitude: number;
  longitude: number;
}

// Exact pin replaced by a ~200m circle — listing addresses are sensitive pre-match
export default function ApartmentLocationMap({ latitude, longitude }: ApartmentLocationMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[latitude, longitude]}
        radius={200}
        pathOptions={{ color: "#1a3c8f", fillColor: "#1a3c8f", fillOpacity: 0.15, weight: 2 }}
      />
    </MapContainer>
  );
}
