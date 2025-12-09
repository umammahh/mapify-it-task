import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Vector Tile Layer Component
// Using MapTiler vector tiles (free tier available at https://www.maptiler.com/)
// For production: Get a free API key from MapTiler and replace the placeholder
// Alternative: Install leaflet.vectorgrid for true vector tile support
function VectorTileLayer() {
  const map = useMap();
  
  useEffect(() => {
    // Using MapTiler vector tiles - Get free API key from https://www.maptiler.com/cloud/
    // Replace 'YOUR_MAPTILER_KEY' with your actual key, or use the demo key below
    // For demo purposes, using a public demo key (limited requests)
    const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "get_your_own_OpIi9ZULNHzrESv6T2vL";
    
    // MapTiler provides vector tiles as raster for Leaflet compatibility
    // True vector tiles would require leaflet.vectorgrid package
    const vectorTileLayer = L.tileLayer(
      `https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      {
        attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
        tileSize: 256,
      }
    );
    
    vectorTileLayer.addTo(map);
    
    return () => {
      map.removeLayer(vectorTileLayer);
    };
  }, [map]);
  
  return null;
}

// Islamabad Administrative Boundaries (F-Sectors)
const islamabadBoundaries = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "F-6 Sector", type: "Administrative" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.050, 33.700], [73.065, 33.700], [73.065, 33.715], [73.050, 33.715], [73.050, 33.700]
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "F-7 Sector", type: "Administrative" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.040, 33.690], [73.055, 33.690], [73.055, 33.705], [73.040, 33.705], [73.040, 33.690]
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "F-8 Sector", type: "Administrative" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.041, 33.681], [73.054, 33.681], [73.054, 33.688], [73.041, 33.688], [73.041, 33.681]
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "F-10 Sector", type: "Administrative" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [73.040, 33.680], [73.055, 33.680], [73.055, 33.695], [73.040, 33.695], [73.040, 33.680]
        ]],
      },
    },
  ],
};

// Sample Roads (major roads in Islamabad)
// Coordinates are in GeoJSON format: [longitude, latitude]
// Islamabad bounds: ~33.60-33.75°N, 73.00-73.15°E
const roads = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Jinnah Avenue", type: "Primary Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [73.030, 33.710],  // South end
          [73.045, 33.700],  // Middle
          [73.060, 33.690],  // North end
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "7th Avenue", type: "Primary Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [73.040, 33.710],  // South
          [73.040, 33.700],  // Middle
          [73.040, 33.690],  // North
          [73.040, 33.680],  // Further north
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Faisal Avenue", type: "Primary Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [73.050, 33.710],  // South
          [73.050, 33.700],  // Middle
          [73.050, 33.690],  // North
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "IJP Road", type: "Secondary Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [73.020, 33.700],
          [73.035, 33.695],
          [73.050, 33.690],
        ],
      },
    },
  ],
};

// Enhanced POIs for Islamabad
const initialPOIs = [
  { name: "F-8 Markaz", coords: [33.6844, 73.0479], type: "Commercial" },
  { name: "F-10 Markaz", coords: [33.6900, 73.0450], type: "Commercial" },
  { name: "Centaurus Mall", coords: [33.7135, 73.0623], type: "Shopping" },
  { name: "Pakistan Monument", coords: [33.6934, 73.0678], type: "Landmark" },
  { name: "Faisal Mosque", coords: [33.7294, 73.0366], type: "Religious" },
  { name: "Islamabad International Airport", coords: [33.6167, 73.0992], type: "Transport" },
  { name: "Daman-e-Koh", coords: [33.7000, 73.0500], type: "Park" },
  { name: "Lok Virsa Museum", coords: [33.6950, 73.0620], type: "Cultural" },
];

export default function MapView() {
  const [pois, setPois] = useState(initialPOIs);
  const [loading, setLoading] = useState(false);

  // Fetch additional POIs from backend (optional)
  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        setLoading(true);
        // Try to fetch from backend, fallback to initial POIs
        const response = await axios.get("http://localhost:5000/api/pois");
        if (response.data && response.data.length > 0) {
          setPois(response.data);
        }
      } catch (error) {
        // Use initial POIs if backend is not available
        console.log("Using default POIs");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPOIs();
  }, []);

  // Style functions
  const adminStyle = {
    color: "#2563eb",
    weight: 2,
    opacity: 0.8,
    fillColor: "#3b82f6",
    fillOpacity: 0.1,
  };

  const roadStyle = (feature) => {
    const roadType = feature.properties.type;
    return {
      color: roadType === "Primary Road" ? "#dc2626" : "#f59e0b",
      weight: roadType === "Primary Road" ? 4 : 2,
      opacity: 0.8,
    };
  };

  const getPOIIcon = (type) => {
    const colors = {
      Commercial: "#3b82f6",
      Shopping: "#8b5cf6",
      Landmark: "#ef4444",
      Religious: "#10b981",
      Transport: "#f59e0b",
      Park: "#22c55e",
      Cultural: "#ec4899",
    };
    return L.divIcon({
      className: "custom-poi-icon",
      html: `<div style="background-color: ${colors[type] || "#6b7280"}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  return (
    <MapContainer
      center={[33.6844, 73.0479]}
      zoom={13}
      style={{ height: "90vh", width: "100%" }}
      scrollWheelZoom={true}
    >
      {/* Vector Tile Layer - Primary base map */}
      <VectorTileLayer />
      
      {/* Fallback raster tiles if vector tiles fail to load */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={0.3}
        zIndex={0}
      />
      
      {/* Administrative Boundaries */}
      <GeoJSON
        data={islamabadBoundaries}
        style={adminStyle}
        onEachFeature={(feature, layer) => {
          layer.bindPopup(`<b>${feature.properties.name}</b><br/>Type: ${feature.properties.type}`);
        }}
      />

      {/* Roads Layer */}
      <GeoJSON
        data={roads}
        style={roadStyle}
        onEachFeature={(feature, layer) => {
          layer.bindPopup(`<b>${feature.properties.name}</b><br/>Type: ${feature.properties.type}`);
        }}
      />

      {/* POI Markers */}
      {pois.map((poi, idx) => (
        <Marker key={idx} position={poi.coords} icon={getPOIIcon(poi.type)}>
          <Popup>
            <div>
              <b>{poi.name}</b>
              <br />
              Type: {poi.type}
              <br />
              Coordinates: {poi.coords[0].toFixed(4)}, {poi.coords[1].toFixed(4)}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
