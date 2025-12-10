Islamabad GIS Platform – MapifyIt Assignment

By Umama

This project delivers a complete GIS solution for Islamabad, including an interactive web map, routing, geocoding, dataset enrichment, and a GIS spatial operation. Everything is fully deployed with public URLs and ready for evaluation.

Live URLs

Frontend: https://mapify-it-task.vercel.app

Backend: https://mapify-it-task.onrender.com

1. Web Map Deployment

The frontend is built with React, Leaflet, and Leaflet.VectorGrid.
The map displays Islamabad using OpenStreetMap tiles and Mapbox vector tiles for roads, landuse, boundaries, and buildings.
Islamabad’s administrative boundary is loaded from islamabad.geojson, and POIs are loaded from an enriched dataset.
POIs are shown as colored markers based on their category.
Reverse geocoding triggers when the user clicks anywhere on the map, and the nearest POI is highlighted.
Vector tiles are only loaded when the map is inside Islamabad to optimize performance.

2. Routing API

The backend exposes a routing endpoint that uses OSRM to compute driving routes between two coordinates.

Example:
/route?start=33.6844,73.0479&end=33.7000,73.0500

The API returns distance, duration, and full GeoJSON route geometry, which is rendered on the map in the frontend using a styled polyline.

3. Geocoding & Reverse Geocoding

Forward geocoding:
/search?q=<place>
Searches the enriched POI dataset for partial name matches.

Reverse geocoding:
/reverse?lat=<lat>&lng=<lng>
Finds the nearest POI using Turf.js distance calculation and returns its name, category, coordinates, and distance from the clicked point.

Both features are fully integrated into the map (search bar and map click).

4. Data Enrichment

The enrichment process converts rawPois.geojson into a cleaner, more usable dataset.
Steps performed include:
– cleaning POI names
– adding normalized fields (name_clean)
– grouping all POIs into semantic categories
– removing invalid or duplicate entries
– keeping only Islamabad-area points
– preparing POIs for search and reverse geocoding

The final dataset used by the application is enrichedPois.geojson.

5. GIS Operation

A spatial analysis was performed on all POIs belonging to the “Health” category.
Using Turf.js, 500-meter buffer polygons were generated around each health facility.
These buffers are accessible via /health-buffers and are rendered on the map as semi-transparent green shapes.

6. Running Locally
Backend
cd backend
npm install
node index.js

Frontend
cd frontend
npm install
npm run dev

7. Project Structure

Backend (Node.js + Express) serves all APIs and datasets.
Frontend (React + Leaflet) displays the interactive map, search, routing, POIs, and GIS overlays.
All GeoJSON files are stored in the /data folder inside the backend.

8. Completed Requirements

This submission includes:
– Fully deployed interactive map
– Vector tiles for Islamabad
– Routing API
– Geocoding and reverse geocoding
– Enriched dataset
– GIS buffer analysis
– Public URLs for all services
– This README as documentation
