import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  CesiumTerrainProvider,
  Color,
  Credit,
  EllipsoidTerrainProvider,
  HeightReference,
  Ion,
  JulianDate,
  LabelStyle,
  Math as CesiumMath,
  NearFarScalar,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./styles.css";

Ion.defaultAccessToken = "";

const EARTH_RADIUS_METERS = 6378137;
const MAX_DETAIL_FEATURES = 420;
const DETAIL_ALTITUDE_LIMIT = 18000;
const DETAIL_RELOAD_MS = 9000;
// Tuned via visual checks to keep a dark, desaturated basemap while preserving coastline detail.
const NIGHT_BASE_STYLE = {
  brightness: 0.22,
  contrast: 1.18,
  saturation: 0.24,
  gamma: 0.78,
};
const DAY_BASE_STYLE = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
};
// Boost city lights so they read clearly against the dimmed basemap without overblooming.
const NIGHT_LIGHT_STYLE = {
  brightness: 1.15,
  contrast: 1.25,
  saturation: 1.35,
  gamma: 0.92,
};
const DAY_LIGHT_STYLE = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
};
// Dim label intensity for night mode readability.
const NIGHT_LABEL_ALPHA_SCALE = 0.58;
// Cap city-light blend to avoid washing out the basemap at low altitude.
const NIGHT_LIGHT_MAX_ALPHA = 0.85;

const PLACES = {
  "new-york": {
    name: "Times Square, New York",
    lat: 40.758,
    lon: -73.9855,
    altitude: 1800,
    heading: 28,
  },
  tokyo: {
    name: "Shibuya, Tokyo",
    lat: 35.6595,
    lon: 139.7005,
    altitude: 1900,
    heading: 315,
  },
  dubai: {
    name: "Downtown Dubai",
    lat: 25.1972,
    lon: 55.2744,
    altitude: 2200,
    heading: 22,
  },
  paris: {
    name: "Central Paris",
    lat: 48.8584,
    lon: 2.2945,
    altitude: 1700,
    heading: 70,
  },
  rio: {
    name: "Rio de Janeiro",
    lat: -22.9519,
    lon: -43.2105,
    altitude: 2600,
    heading: 112,
  },
};

const state = {
  base: "satellite",
  labels: true,
  night: false,
  streetTwin: true,
  quality: "balanced",
  lastDetailAt: 0,
  lastDetailKey: "",
  detailAbort: null,
  detailEntities: [],
  selectedMarker: null,
};

const elements = {
  loadingScreen: document.querySelector("#loadingScreen"),
  modeLabel: document.querySelector("#modeLabel"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  altitudeOutput: document.querySelector("#altitudeOutput"),
  centerOutput: document.querySelector("#centerOutput"),
  detailOutput: document.querySelector("#detailOutput"),
  labelsToggle: document.querySelector("#labelsToggle"),
  nightToggle: document.querySelector("#nightToggle"),
  streetTwinToggle: document.querySelector("#streetTwinToggle"),
  loadDetailButton: document.querySelector("#loadDetailButton"),
  clearDetailButton: document.querySelector("#clearDetailButton"),
  homeButton: document.querySelector("#homeButton"),
};

const imagery = createImageryProviders();

const viewer = new Viewer("earth", {
  animation: false,
  baseLayer: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  navigationHelpButton: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  terrainProvider: new EllipsoidTerrainProvider(),
  useBrowserRecommendedResolution: true,
  requestRenderMode: true,
  maximumRenderTimeChange: 0.5,
});

viewer.imageryLayers.removeAll();

const layers = {
  satellite: viewer.imageryLayers.addImageryProvider(imagery.satellite),
  blue: viewer.imageryLayers.addImageryProvider(imagery.blue),
  street: viewer.imageryLayers.addImageryProvider(imagery.street),
  labels: viewer.imageryLayers.addImageryProvider(imagery.labels),
  night: viewer.imageryLayers.addImageryProvider(imagery.night),
};

layers.satellite.show = true;
layers.blue.show = false;
layers.street.show = false;
layers.labels.show = true;
layers.labels.alpha = 0.16;
layers.night.show = false;
layers.night.alpha = 0.0;

configureScene();
attachEvents();
setQuality("balanced");
setBaseLayer("satellite");
loadTerrain();
flyHome(0);

setTimeout(() => {
  elements.loadingScreen.classList.add("is-hidden");
}, 1000);

function createImageryProviders() {
  return {
    satellite: new UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 19,
      credit: new Credit("Sources: Esri, Maxar, Earthstar Geographics, GIS User Community"),
    }),
    blue: new UrlTemplateImageryProvider({
      url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
      maximumLevel: 8,
      credit: new Credit("NASA Global Imagery Browse Services"),
    }),
    street: new UrlTemplateImageryProvider({
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c", "d"],
      maximumLevel: 20,
      credit: new Credit("Map tiles by CARTO, under CC BY 3.0. Data by OpenStreetMap, under ODbL."),
    }),
    labels: new UrlTemplateImageryProvider({
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c", "d"],
      maximumLevel: 20,
      credit: new Credit("Labels by CARTO. Data by OpenStreetMap contributors."),
    }),
    night: new UrlTemplateImageryProvider({
      url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
      maximumLevel: 8,
      credit: new Credit("NASA Earth Observatory / NOAA NGDC"),
    }),
  };
}

function configureScene() {
  const { scene } = viewer;

  scene.globe.enableLighting = false;
  scene.globe.depthTestAgainstTerrain = true;
  scene.globe.tileCacheSize = 320;
  scene.skyAtmosphere.show = true;
  scene.sun.show = true;
  scene.moon.show = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.00018;
  scene.highDynamicRange = true;
  scene.camera.percentageChanged = 0.01;

  const controller = scene.screenSpaceCameraController;
  controller.minimumZoomDistance = 18;
  controller.maximumZoomDistance = 52000000;
  controller.enableCollisionDetection = true;

  viewer.clock.currentTime = JulianDate.fromIso8601("2025-06-21T16:00:00Z");
  viewer.scene.requestRender();
}

async function loadTerrain() {
  try {
    elements.detailOutput.value = "Terrain loading";
    const terrain = await CesiumTerrainProvider.fromUrl("https://assets.agi.com/stk-terrain/world", {
      requestVertexNormals: true,
      requestWaterMask: true,
    });
    viewer.terrainProvider = terrain;
    elements.detailOutput.value = "Terrain ready";
  } catch (error) {
    viewer.terrainProvider = new EllipsoidTerrainProvider();
    elements.detailOutput.value = "Terrain fallback";
    console.warn("Terrain provider unavailable; using ellipsoid.", error);
  } finally {
    viewer.scene.requestRender();
  }
}

function attachEvents() {
  elements.searchForm.addEventListener("submit", handleSearch);
  elements.labelsToggle.addEventListener("change", (event) => {
    state.labels = event.target.checked;
    updateLayerBlend();
  });
  elements.nightToggle.addEventListener("change", (event) => {
    state.night = event.target.checked;
    updateLayerBlend();
  });
  elements.streetTwinToggle.addEventListener("change", (event) => {
    state.streetTwin = event.target.checked;
    if (state.streetTwin) {
      maybeLoadStreetTwin(true);
    }
  });
  elements.loadDetailButton.addEventListener("click", () => maybeLoadStreetTwin(true));
  elements.clearDetailButton.addEventListener("click", clearStreetTwin);
  elements.homeButton.addEventListener("click", (event) => {
    event.preventDefault();
    flyHome(2.4);
  });

  document.querySelectorAll("[data-place]").forEach((button) => {
    button.addEventListener("click", () => {
      const place = PLACES[button.dataset.place];
      if (place) {
        flyToPlace(place);
      }
    });
  });

  document.querySelectorAll("[data-base]").forEach((button) => {
    button.addEventListener("click", () => setBaseLayer(button.dataset.base));
  });

  document.querySelectorAll("[data-quality]").forEach((button) => {
    button.addEventListener("click", () => setQuality(button.dataset.quality));
  });

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(() => elements.searchResults.classList.remove("is-open"), ScreenSpaceEventType.LEFT_DOWN);
  handler.setInputAction(() => elements.searchResults.classList.remove("is-open"), ScreenSpaceEventType.WHEEL);

  viewer.camera.changed.addEventListener(throttle(updateTelemetry, 140));
  viewer.camera.moveEnd.addEventListener(() => {
    updateTelemetry();
    maybeLoadStreetTwin(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      elements.searchResults.classList.remove("is-open");
    }
  });
}

function flyHome(duration = 2.8) {
  clearSelectedMarker();
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(8, 18, 20500000),
    orientation: {
      heading: CesiumMath.toRadians(0),
      pitch: CesiumMath.toRadians(-90),
      roll: 0,
    },
    duration,
    complete: updateTelemetry,
  });
}

function flyToPlace(place) {
  elements.searchInput.value = place.name;
  elements.searchResults.classList.remove("is-open");
  setSelectedMarker(place);
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(place.lon, place.lat, place.altitude),
    orientation: {
      heading: CesiumMath.toRadians(place.heading ?? 0),
      pitch: CesiumMath.toRadians(-58),
      roll: 0,
    },
    duration: 3.2,
    complete: () => {
      updateTelemetry();
      maybeLoadStreetTwin(true);
    },
  });
}

async function handleSearch(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  elements.detailOutput.value = "Searching";
  elements.searchResults.classList.remove("is-open");
  elements.searchResults.innerHTML = "";

  try {
    const results = await geocode(query);
    renderSearchResults(results);
    elements.detailOutput.value = results.length ? "Select result" : "No result";
  } catch (error) {
    elements.detailOutput.value = "Search failed";
    renderSearchError("Search service unavailable");
    console.error(error);
  }
}

async function geocode(query) {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "6");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("q", query);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Accept-Language": navigator.language || "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim responded ${response.status}`);
  }

  return response.json();
}

function renderSearchResults(results) {
  elements.searchResults.innerHTML = "";

  if (!results.length) {
    renderSearchError("No locations found");
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `<span>${escapeHtml(primaryName(result))}</span><small>${escapeHtml(result.display_name)}</small>`;
    button.addEventListener("click", () => {
      const place = {
        name: result.display_name,
        lat: Number(result.lat),
        lon: Number(result.lon),
        altitude: altitudeForResult(result),
        heading: 0,
      };
      flyToPlace(place);
    });
    fragment.append(button);
  });

  elements.searchResults.append(fragment);
  elements.searchResults.classList.add("is-open");
}

function renderSearchError(message) {
  elements.searchResults.innerHTML = `<div class="search-result" role="status">${escapeHtml(message)}</div>`;
  elements.searchResults.classList.add("is-open");
}

function primaryName(result) {
  return result.name || result.display_name.split(",")[0] || "Location";
}

function altitudeForResult(result) {
  const type = result.type || "";
  if (["house", "building", "amenity", "tourism", "shop"].includes(type)) {
    return 800;
  }
  if (["road", "neighbourhood", "suburb", "quarter"].includes(type)) {
    return 1500;
  }
  if (["city", "town", "administrative"].includes(type)) {
    return 4200;
  }
  return 2500;
}

function setBaseLayer(base) {
  state.base = base;
  layers.satellite.show = base === "satellite";
  layers.blue.show = base === "blue";
  layers.street.show = base === "street";

  document.querySelectorAll("[data-base]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.base === base);
  });

  updateLayerBlend();
}

function setQuality(quality) {
  state.quality = quality;

  if (quality === "lean") {
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 1);
    viewer.scene.globe.maximumScreenSpaceError = 4.0;
    viewer.scene.globe.tileCacheSize = 220;
  } else if (quality === "sharp") {
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.6);
    viewer.scene.globe.maximumScreenSpaceError = 1.4;
    viewer.scene.globe.tileCacheSize = 420;
  } else {
    viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.2);
    viewer.scene.globe.maximumScreenSpaceError = 2.2;
    viewer.scene.globe.tileCacheSize = 320;
  }

  document.querySelectorAll("[data-quality]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.quality === quality);
  });

  viewer.scene.requestRender();
}

function applyImageryStyle(layer, style) {
  layer.brightness = style.brightness;
  layer.contrast = style.contrast;
  layer.saturation = style.saturation;
  layer.gamma = style.gamma;
}

function updateNightStyling() {
  const baseStyle = state.night ? NIGHT_BASE_STYLE : DAY_BASE_STYLE;
  applyImageryStyle(layers.satellite, baseStyle);
  applyImageryStyle(layers.blue, baseStyle);
  applyImageryStyle(layers.street, baseStyle);

  const nightStyle = state.night ? NIGHT_LIGHT_STYLE : DAY_LIGHT_STYLE;
  applyImageryStyle(layers.night, nightStyle);
}

function updateLayerBlend() {
  const altitude = viewer.camera.positionCartographic.height;
  const streetBlend = state.labels ? clamp(inverseLerp(2500000, 45000, altitude), 0, 1) : 0;
  const nightBlend = state.night
    ? clamp(inverseLerp(9000000, 1400000, altitude), 0.0, NIGHT_LIGHT_MAX_ALPHA)
    : 0;
  const labelAlphaScale = state.night ? NIGHT_LABEL_ALPHA_SCALE : 1;

  layers.labels.show = state.labels && state.base !== "street";
  layers.labels.alpha = (state.base === "street" ? 0 : 0.12 + streetBlend * 0.54) * labelAlphaScale;
  layers.night.show = state.night;
  layers.night.alpha = nightBlend;

  if (state.base === "blue" && altitude < 1200000) {
    layers.labels.show = state.labels;
    layers.labels.alpha = 0.62 * labelAlphaScale;
  }

  updateNightStyling();
  viewer.scene.requestRender();
}

function updateTelemetry() {
  const cartographic = getCameraCartographic();
  const center = getViewCenter();
  const altitude = cartographic.height;

  elements.altitudeOutput.value = formatAltitude(altitude);
  elements.modeLabel.textContent = modeForAltitude(altitude);
  elements.centerOutput.value = center
    ? `${toDegrees(center.latitude).toFixed(4)}, ${toDegrees(center.longitude).toFixed(4)}`
    : "--";

  updateLayerBlend();
}

function getCameraCartographic() {
  return Cartographic.fromCartesian(viewer.camera.positionWC);
}

function getViewCenter() {
  const canvas = viewer.scene.canvas;
  const ray = viewer.camera.getPickRay(new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));

  if (!ray) {
    return null;
  }

  const picked = viewer.scene.globe.pick(ray, viewer.scene);
  return picked ? Cartographic.fromCartesian(picked) : getCameraCartographic();
}

function modeForAltitude(altitude) {
  if (altitude > 6500000) {
    return "Orbit view";
  }
  if (altitude > 600000) {
    return "Regional view";
  }
  if (altitude > 35000) {
    return "City approach";
  }
  return "Street twin";
}

function formatAltitude(meters) {
  if (meters >= 1000000) {
    return `${(meters / 1000000).toFixed(1)} Mm`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.max(0, meters).toFixed(0)} m`;
}

async function maybeLoadStreetTwin(force) {
  if (!state.streetTwin) {
    return;
  }

  const center = getViewCenter();
  const altitude = viewer.camera.positionCartographic.height;

  if (!center || altitude > DETAIL_ALTITUDE_LIMIT) {
    if (force) {
      elements.detailOutput.value = "Zoom closer";
    }
    return;
  }

  const now = Date.now();
  const radius = clamp(altitude * 0.58, 520, 2600);
  const key = detailKey(center, radius);

  if (!force && (state.lastDetailKey === key || now - state.lastDetailAt < DETAIL_RELOAD_MS)) {
    return;
  }

  state.lastDetailAt = now;
  state.lastDetailKey = key;
  await loadStreetTwin(center, radius);
}

async function loadStreetTwin(center, radiusMeters) {
  if (state.detailAbort) {
    state.detailAbort.abort();
  }

  const controller = new AbortController();
  state.detailAbort = controller;

  const bbox = bboxAround(center, radiusMeters);
  const query = buildOverpassQuery(bbox);
  const body = new URLSearchParams({ data: query });

  elements.detailOutput.value = "Loading twin";

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass responded ${response.status}`);
    }

    const data = await response.json();
    clearStreetTwin();
    const counts = renderStreetTwin(data.elements || []);
    elements.detailOutput.value = `${counts.buildings} buildings, ${counts.roads} roads`;
  } catch (error) {
    if (error.name !== "AbortError") {
      elements.detailOutput.value = "Twin unavailable";
      console.warn("Overpass detail load failed.", error);
    }
  } finally {
    viewer.scene.requestRender();
  }
}

function buildOverpassQuery({ south, west, north, east }) {
  return `
    [out:json][timeout:18];
    (
      way["building"](${south},${west},${north},${east});
      way["highway"](${south},${west},${north},${east});
    );
    out tags geom ${MAX_DETAIL_FEATURES};
  `;
}

function renderStreetTwin(elementsList) {
  let buildings = 0;
  let roads = 0;
  const buildingColor = Color.fromCssColorString("#dfe7e5").withAlpha(0.58);
  const buildingOutline = Color.fromCssColorString("#78ead8").withAlpha(0.35);
  const roadColor = Color.fromCssColorString("#f2c86d").withAlpha(0.92);
  const minorRoadColor = Color.fromCssColorString("#f5f0df").withAlpha(0.66);

  const buildingElements = elementsList
    .filter((item) => item.type === "way" && item.tags?.building && item.geometry?.length > 3)
    .slice(0, 220);

  const roadElements = elementsList
    .filter((item) => item.type === "way" && item.tags?.highway && item.geometry?.length > 1)
    .slice(0, 220);

  for (const item of buildingElements) {
    const positions = geometryToPositions(item.geometry);
    if (positions.length < 3) {
      continue;
    }

    const height = buildingHeight(item.tags, item.id);
    const entity = viewer.entities.add({
      name: item.tags.name || item.tags.building || "Building",
      polygon: {
        hierarchy: positions,
        material: buildingColor,
        outline: true,
        outlineColor: buildingOutline,
        height: 0,
        extrudedHeight: height,
      },
    });

    state.detailEntities.push(entity);
    buildings += 1;
  }

  for (const item of roadElements) {
    const positions = geometryToPositions(item.geometry);
    if (positions.length < 2) {
      continue;
    }

    const highway = item.tags.highway;
    const major = ["motorway", "trunk", "primary", "secondary"].includes(highway);
    const entity = viewer.entities.add({
      name: item.tags.name || highway,
      polyline: {
        positions,
        width: major ? 5 : 3,
        material: major ? roadColor : minorRoadColor,
        clampToGround: true,
      },
    });

    state.detailEntities.push(entity);
    roads += 1;

    if (item.tags.name && roads < 42) {
      const label = roadLabelEntity(item, positions);
      if (label) {
        state.detailEntities.push(label);
      }
    }
  }

  return { buildings, roads };
}

function roadLabelEntity(item, positions) {
  const midpoint = positions[Math.floor(positions.length / 2)];
  if (!midpoint) {
    return null;
  }

  return viewer.entities.add({
    position: midpoint,
    label: {
      text: item.tags.name,
      font: "12px Inter, system-ui, sans-serif",
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK.withAlpha(0.68),
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      heightReference: HeightReference.CLAMP_TO_GROUND,
      pixelOffset: new Cartesian2(0, -9),
      scaleByDistance: new NearFarScalar(500, 1, 8500, 0.12),
      translucencyByDistance: new NearFarScalar(500, 1, 9000, 0),
    },
  });
}

function clearStreetTwin() {
  if (state.detailAbort) {
    state.detailAbort.abort();
    state.detailAbort = null;
  }

  for (const entity of state.detailEntities) {
    viewer.entities.remove(entity);
  }

  state.detailEntities = [];
  elements.detailOutput.value = "Ready";
  viewer.scene.requestRender();
}

function setSelectedMarker(place) {
  clearSelectedMarker();
  state.selectedMarker = viewer.entities.add({
    name: place.name,
    position: Cartesian3.fromDegrees(place.lon, place.lat),
    point: {
      pixelSize: 10,
      color: Color.fromCssColorString("#66e1d2"),
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: place.name.split(",")[0],
      font: "600 14px Inter, system-ui, sans-serif",
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian2(0, -22),
      heightReference: HeightReference.CLAMP_TO_GROUND,
      scaleByDistance: new NearFarScalar(500, 1, 600000, 0),
    },
  });
}

function clearSelectedMarker() {
  if (state.selectedMarker) {
    viewer.entities.remove(state.selectedMarker);
    state.selectedMarker = null;
  }
}

function geometryToPositions(geometry) {
  return geometry
    .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat))
    .map((point) => Cartesian3.fromDegrees(point.lon, point.lat));
}

function buildingHeight(tags = {}, id = 0) {
  const taggedHeight = parseFloat(String(tags.height || "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(taggedHeight) && taggedHeight > 0) {
    return clamp(taggedHeight, 4, 260);
  }

  const levels = parseFloat(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0) {
    return clamp(levels * 3.2, 4, 220);
  }

  return 9 + (hashNumber(id) % 12) * 2.5;
}

function bboxAround(center, radiusMeters) {
  const lat = toDegrees(center.latitude);
  const lon = toDegrees(center.longitude);
  const latDelta = toDegrees(radiusMeters / EARTH_RADIUS_METERS);
  const lonDelta = toDegrees(radiusMeters / (EARTH_RADIUS_METERS * Math.cos(center.latitude)));

  return {
    south: clamp(lat - latDelta, -89.9, 89.9).toFixed(6),
    west: normalizeLongitude(lon - lonDelta).toFixed(6),
    north: clamp(lat + latDelta, -89.9, 89.9).toFixed(6),
    east: normalizeLongitude(lon + lonDelta).toFixed(6),
  };
}

function detailKey(center, radiusMeters) {
  const lat = toDegrees(center.latitude);
  const lon = toDegrees(center.longitude);
  return `${Math.round(lat * 400)}:${Math.round(lon * 400)}:${Math.round(radiusMeters / 350)}`;
}

function hashNumber(value) {
  const input = String(value);
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function toDegrees(radians) {
  return CesiumMath.toDegrees(radians);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function inverseLerp(start, end, value) {
  return (value - start) / (end - start);
}

function throttle(callback, wait) {
  let last = 0;
  let timer = 0;

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);

    if (remaining <= 0) {
      window.clearTimeout(timer);
      timer = 0;
      last = now;
      callback(...args);
      return;
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        last = Date.now();
        timer = 0;
        callback(...args);
      }, remaining);
    }
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
