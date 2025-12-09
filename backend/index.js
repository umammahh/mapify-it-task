const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const turf = require('@turf/turf');

const app = express();

// CORS configuration - allow frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mapify-it-task.vercel.app',
  // Add custom frontend URL from environment variable if provided
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin
  
  // Check exact match
  if (uniqueOrigins.indexOf(origin) !== -1) {
    return true;
  }
  
  // Allow all Vercel preview URLs (they all end with .vercel.app)
  if (origin.endsWith('.vercel.app')) {
    return true;
  }
  
  // Allow all Netlify preview URLs
  if (origin.includes('.netlify.app')) {
    return true;
  }
  
  return false;
};

// CORS middleware function
const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // In production, be strict; in development, allow all
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Additional CORS middleware for /data routes (static files)
app.use('/data', (req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow if origin is in allowed list, is a Vercel/Netlify URL, or in development
  if (isOriginAllowed(origin) || process.env.NODE_ENV !== 'production') {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Data path - now pointing to backend/data folder
const dataPath = path.join(__dirname, 'data');
console.log('Serving data from:', dataPath);
console.log('Absolute path:', path.resolve(dataPath));

// Load enriched POIs for geocoding
let enrichedPOIs = null;
let poiCollection = null;
try {
  const enrichedPOIsPath = path.join(dataPath, 'enrichedPois.geojson');
  if (fs.existsSync(enrichedPOIsPath)) {
    enrichedPOIs = JSON.parse(fs.readFileSync(enrichedPOIsPath, 'utf8'));
    poiCollection = turf.featureCollection(enrichedPOIs.features);
    console.log(`Loaded ${enrichedPOIs.features.length} enriched POIs for geocoding`);
  } else {
    console.warn('enrichedPois.geojson not found, geocoding endpoints will not work');
  }
} catch (error) {
  console.error('Error loading enriched POIs:', error.message);
}

app.use('/data', express.static(dataPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.geojson')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// Explicit route handlers for GeoJSON files (fallback)
app.get('/data/islamabad.geojson', (req, res) => {
  const filePath = path.join(dataPath, 'islamabad.geojson');
  console.log('Requested file:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.sendFile(filePath);
  } else {
    console.error('File not found:', filePath);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.status(404).json({ error: 'File not found', path: filePath });
  }
});

app.get('/data/rawPois.geojson', (req, res) => {
  const filePath = path.join(dataPath, 'rawPois.geojson');
  console.log('Requested file:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.sendFile(filePath);
  } else {
    console.error('File not found:', filePath);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.status(404).json({ error: 'File not found', path: filePath });
  }
});

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.json({ 
    status: 'ok', 
    message: 'MapifyIt backend',
    cors: 'enabled',
    allowedOrigins: uniqueOrigins
  });
});

// Test endpoint to verify data directory is accessible
app.get('/test-data', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  const testDataPath = path.join(__dirname, 'data');
  try {
    const files = fs.readdirSync(testDataPath);
    res.json({ 
      dataPath: testDataPath, 
      absolutePath: path.resolve(testDataPath),
      files,
      exists: fs.existsSync(testDataPath),
      islamabadExists: fs.existsSync(path.join(testDataPath, 'islamabad.geojson')),
      rawPoisExists: fs.existsSync(path.join(testDataPath, 'rawPois.geojson'))
    });
  } catch (error) {
    console.error('Test-data error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
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

// OSRM Routing API endpoint
app.get('/route', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({ 
        error: "start and end parameters required",
        example: "/route?start=33.6844,73.0479&end=33.7000,73.0500"
      });
    }

    // Parse coordinates
    const startCoords = start.split(",").map(coord => parseFloat(coord.trim()));
    const endCoords = end.split(",").map(coord => parseFloat(coord.trim()));

    // Validate coordinate format
    if (startCoords.length !== 2 || endCoords.length !== 2 ||
        isNaN(startCoords[0]) || isNaN(startCoords[1]) ||
        isNaN(endCoords[0]) || isNaN(endCoords[1])) {
      return res.status(400).json({ 
        error: "Invalid coordinate format. Use: lat,lng (e.g., 33.6844,73.0479)"
      });
    }

    const [startLat, startLng] = startCoords;
    const [endLat, endLng] = endCoords;

    // OSRM expects LONGITUDE first, then LATITUDE
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    console.log('Fetching route from OSRM:', osrmUrl);
    
    const response = await axios.get(osrmUrl);

    // Check if route was found
    if (!response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({ 
        error: "No route found between the specified points"
      });
    }

    // Format response to match the specified structure
    const route = response.data.routes[0];
    const waypoints = response.data.waypoints || [];

    res.json({
      route: {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        geometry: route.geometry
      },
      waypoints: waypoints.map((wp, index) => ({
        name: index === 0 ? "Start Point" : index === waypoints.length - 1 ? "End Point" : `Waypoint ${index + 1}`,
        location: wp.location // [lng, lat]
      }))
    });
  } catch (error) {
    console.error('Routing error:', error.message);
    
    // Handle OSRM API errors
    if (error.response) {
      return res.status(error.response.status || 500).json({ 
        error: "Routing failed",
        details: error.response.data?.message || error.message
      });
    }
    
    res.status(500).json({ 
      error: "Routing failed",
      details: error.message
    });
  }
});

// Geocoding API endpoints

// Test endpoint to verify geocoding is available
app.get('/api/geocoding/status', (req, res) => {
  res.json({
    status: 'ok',
    geocoding: 'enabled',
    poiDataLoaded: poiCollection !== null,
    poiCount: poiCollection ? poiCollection.features.length : 0
  });
});

// Search geocoding: search POIs by name
app.get('/search', (req, res) => {
  try {
    const q = req.query.q;
    
    if (!q) {
      return res.status(400).json({ error: "Query parameter q is required" });
    }

    if (!poiCollection) {
      return res.status(503).json({ error: "POI data not loaded" });
    }

    const searchQuery = q.toLowerCase().trim();
    const results = poiCollection.features
      .filter(f => {
        const name = f.properties?.name || f.properties?.name_clean || '';
        return name.toLowerCase().includes(searchQuery);
      })
      .slice(0, 20) // Limit to 20 results
      .map(f => ({
        name: f.properties?.name || f.properties?.name_clean || 'Unnamed',
        category: f.properties?.category_group || f.properties?.amenity || 'N/A',
        coordinates: f.geometry.coordinates, // [lng, lat]
      }));

    res.json({ results });
  } catch (error) {
    console.error('Search geocoding error:', error.message);
    res.status(500).json({ error: "Search failed", details: error.message });
  }
});

// Reverse geocoding: lat,lng → nearest POI
app.get('/reverse', (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    if (!poiCollection) {
      return res.status(503).json({ error: "POI data not loaded" });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: "Invalid lat/lng format" });
    }

    // Create point from query coordinates
    const queryPoint = turf.point([lngNum, latNum]);

    let nearest = null;
    let minDist = Infinity;

    poiCollection.features.forEach(f => {
      const d = turf.distance(queryPoint, f, { units: 'kilometers' });
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    });

    if (!nearest) {
      return res.status(404).json({ error: "No POI found" });
    }

    res.json({
      name: nearest.properties?.name || nearest.properties?.name_clean || 'Unnamed',
      category: nearest.properties?.category_group || nearest.properties?.amenity || 'N/A',
      coordinates: nearest.geometry.coordinates, // [lng, lat]
      distance_km: parseFloat(minDist.toFixed(2)),
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    res.status(500).json({ error: "Reverse geocoding failed", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
