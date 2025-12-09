const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static geojson data
const dataPath = path.join(__dirname, '..', 'data');
console.log('Serving data from:', dataPath);
console.log('Absolute path:', path.resolve(dataPath));

// Serve static files with proper content type
app.use('/data', express.static(dataPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.geojson')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// Explicit route handlers for GeoJSON files (fallback)
app.get('/data/islamabad.geojson', (req, res) => {
  const fs = require('fs');
  const filePath = path.join(dataPath, 'islamabad.geojson');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/data/rawPois.geojson', (req, res) => {
  const fs = require('fs');
  const filePath = path.join(dataPath, 'rawPois.geojson');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'MapifyIt backend' }));

// Test endpoint to verify data directory is accessible
app.get('/test-data', (req, res) => {
  const fs = require('fs');
  const dataPath = path.join(__dirname, '..', 'data');
  try {
    const files = fs.readdirSync(dataPath);
    res.json({ 
      dataPath, 
      files,
      exists: fs.existsSync(dataPath),
      islamabadExists: fs.existsSync(path.join(dataPath, 'islamabad.geojson')),
      rawPoisExists: fs.existsSync(path.join(dataPath, 'rawPois.geojson'))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to fetch POIs for Islamabad
app.get('/api/pois', async (req, res) => {
  try {
    // Using Overpass API to fetch real POIs from OpenStreetMap
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|hospital|school|bank|fuel"](33.65,73.0,33.75,73.15);
        node["tourism"~"attraction|museum|hotel"](33.65,73.0,33.75,73.15);
        node["shop"~"mall|supermarket"](33.65,73.0,33.75,73.15);
      );
      out body;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'text/plain' }
    });

    const pois = response.data.elements
      .filter(el => el.lat && el.lon)
      .map(el => ({
        name: el.tags?.name || el.tags?.amenity || el.tags?.tourism || 'Unnamed POI',
        coords: [el.lat, el.lon],
        type: el.tags?.amenity || el.tags?.tourism || el.tags?.shop || 'Other',
      }))
      .slice(0, 50); // Limit to 50 POIs

    res.json(pois);
  } catch (error) {
    console.error('Error fetching POIs:', error.message);
    // Return default POIs if Overpass API fails
    res.json([
      { name: "F-8 Markaz", coords: [33.6844, 73.0479], type: "Commercial" },
      { name: "F-10 Markaz", coords: [33.6900, 73.0450], type: "Commercial" },
      { name: "Centaurus Mall", coords: [33.7135, 73.0623], type: "Shopping" },
      { name: "Pakistan Monument", coords: [33.6934, 73.0678], type: "Landmark" },
      { name: "Faisal Mosque", coords: [33.7294, 73.0366], type: "Religious" },
    ]);
  }
});

// API endpoint to fetch roads for Islamabad
app.get('/api/roads', async (req, res) => {
  try {
    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["highway"~"primary|secondary|tertiary"](33.65,73.0,33.75,73.15);
      );
      out geom;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'text/plain' }
    });

    // Islamabad bounding box: 33.60-33.75°N, 73.00-73.15°E
    const ISLAMABAD_BOUNDS = {
      minLat: 33.60,
      maxLat: 33.75,
      minLon: 73.00,
      maxLon: 73.15,
    };

    const roads = response.data.elements
      .filter(el => el.geometry && el.geometry.length > 0)
      .map(el => {
        // Filter coordinates to only include those within Islamabad bounds
        const validCoords = el.geometry
          .map(coord => [coord.lon, coord.lat])
          .filter(([lon, lat]) => 
            lat >= ISLAMABAD_BOUNDS.minLat && 
            lat <= ISLAMABAD_BOUNDS.maxLat &&
            lon >= ISLAMABAD_BOUNDS.minLon && 
            lon <= ISLAMABAD_BOUNDS.maxLon
          );
        
        // Only include roads with at least 2 valid coordinates
        if (validCoords.length < 2) return null;
        
        return {
          type: "Feature",
          properties: {
            name: el.tags?.name || 'Unnamed Road',
            type: el.tags?.highway || 'Road',
          },
          geometry: {
            type: "LineString",
            coordinates: validCoords,
          },
        };
      })
      .filter(road => road !== null); // Remove null entries

    res.json({ type: "FeatureCollection", features: roads });
  } catch (error) {
    console.error('Error fetching roads:', error.message);
    res.json({ type: "FeatureCollection", features: [] });
  }
});

// API endpoint to fetch administrative boundaries
app.get('/api/boundaries', async (req, res) => {
  try {
    const overpassQuery = `
      [out:json][timeout:25];
      (
        relation["admin_level"="4"]["name"="Islamabad"](33.65,73.0,33.75,73.15);
      );
      out geom;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'text/plain' }
    });

    // Process boundaries (simplified for demo)
    res.json({ type: "FeatureCollection", features: [] });
  } catch (error) {
    console.error('Error fetching boundaries:', error.message);
    res.json({ type: "FeatureCollection", features: [] });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
