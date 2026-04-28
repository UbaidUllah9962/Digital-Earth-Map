# Digital Earth

Interactive browser-based 3D digital twin of Earth built with CesiumJS. It streams satellite imagery, public basemaps, terrain where available, city search, and on-demand OpenStreetMap road/building geometry for street-level exploration.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Public Data Sources

- CesiumJS for the WebGL globe engine and WGS84 camera controls.
- Esri World Imagery for satellite basemap tiles.
- NASA GIBS for Blue Marble and city-light imagery.
- CARTO Voyager for street labels and street-map context.
- OpenStreetMap data via Nominatim search and Overpass API street/building queries.

The local street twin intentionally requests only a small bounding box around the current camera center and does not prefetch or bulk download map data.
