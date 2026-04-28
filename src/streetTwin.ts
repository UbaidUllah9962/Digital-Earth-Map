import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  HeightReference,
  LabelStyle,
  NearFarScalar,
} from "cesium";
import type { AppContext, OverpassBBox, OverpassCounts, OverpassElement, OverpassResponse } from "./types";
import {
  DETAIL_ALTITUDE_LIMIT,
  DETAIL_RELOAD_MS,
  EARTH_RADIUS_METERS,
  MAX_DETAIL_FEATURES,
} from "./constants";
import { clamp, hashNumber, normalizeLongitude, toDegrees } from "./utils";
import { getViewCenter } from "./telemetry";

export const maybeLoadStreetTwin = async (context: AppContext, force: boolean): Promise<void> => {
  if (!context.state.streetTwin) {
    return;
  }

  const center = getViewCenter(context.viewer);
  const altitude = context.viewer.camera.positionCartographic.height;

  if (!center || altitude > DETAIL_ALTITUDE_LIMIT) {
    if (force) {
      context.elements.detailOutput.value = "Zoom closer";
    }
    return;
  }

  const now = Date.now();
  const radius = clamp(altitude * 0.58, 520, 2600);
  const key = detailKey(center, radius);

  if (!force && (context.state.lastDetailKey === key || now - context.state.lastDetailAt < DETAIL_RELOAD_MS)) {
    return;
  }

  context.state.lastDetailAt = now;
  context.state.lastDetailKey = key;
  await loadStreetTwin(context, center, radius);
};

export const clearStreetTwin = (context: AppContext): void => {
  if (context.state.detailAbort) {
    context.state.detailAbort.abort();
    context.state.detailAbort = null;
  }

  for (const entity of context.state.detailEntities) {
    context.viewer.entities.remove(entity);
  }

  context.state.detailEntities = [];
  context.elements.detailOutput.value = "Ready";
  context.viewer.scene.requestRender();
};

const loadStreetTwin = async (context: AppContext, center: Cartographic, radiusMeters: number): Promise<void> => {
  if (context.state.detailAbort) {
    context.state.detailAbort.abort();
  }

  const controller = new AbortController();
  context.state.detailAbort = controller;

  const bbox = bboxAround(center, radiusMeters);
  const query = buildOverpassQuery(bbox);
  const body = new URLSearchParams({ data: query });

  context.elements.detailOutput.value = "Loading twin";

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass responded ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;
    clearStreetTwin(context);
    const counts = renderStreetTwin(context, data.elements ?? []);
    context.elements.detailOutput.value = `${counts.buildings} buildings, ${counts.roads} roads`;
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      context.elements.detailOutput.value = "Twin unavailable";
      console.warn("Overpass detail load failed.", error);
    }
  } finally {
    context.viewer.scene.requestRender();
  }
};

const buildOverpassQuery = ({ south, west, north, east }: OverpassBBox): string => `
    [out:json][timeout:18];
    (
      way["building"](${south},${west},${north},${east});
      way["highway"](${south},${west},${north},${east});
    );
    out tags geom ${MAX_DETAIL_FEATURES};
  `;

const renderStreetTwin = (context: AppContext, elementsList: OverpassElement[]): OverpassCounts => {
  let buildings = 0;
  let roads = 0;
  const buildingColor = Color.fromCssColorString("#dfe7e5").withAlpha(0.58);
  const buildingOutline = Color.fromCssColorString("#78ead8").withAlpha(0.35);
  const roadColor = Color.fromCssColorString("#f2c86d").withAlpha(0.92);
  const minorRoadColor = Color.fromCssColorString("#f5f0df").withAlpha(0.66);

  const buildingElements = elementsList
    .filter((item) => item.type === "way" && item.tags?.building && item.geometry?.length && item.geometry.length > 3)
    .slice(0, 220);

  const roadElements = elementsList
    .filter((item) => item.type === "way" && item.tags?.highway && item.geometry?.length && item.geometry.length > 1)
    .slice(0, 220);

  for (const item of buildingElements) {
    const positions = geometryToPositions(item.geometry ?? []);
    if (positions.length < 3) {
      continue;
    }

    const height = buildingHeight(item.tags ?? {}, item.id);
    const entity = context.viewer.entities.add({
      name: item.tags?.name || item.tags?.building || "Building",
      polygon: {
        hierarchy: positions,
        material: buildingColor,
        outline: true,
        outlineColor: buildingOutline,
        height: 0,
        extrudedHeight: height,
      },
    });

    context.state.detailEntities.push(entity);
    buildings += 1;
  }

  for (const item of roadElements) {
    const positions = geometryToPositions(item.geometry ?? []);
    if (positions.length < 2) {
      continue;
    }

    const highway = item.tags?.highway ?? "";
    const major = ["motorway", "trunk", "primary", "secondary"].includes(highway);
    const entity = context.viewer.entities.add({
      name: item.tags?.name || highway,
      polyline: {
        positions,
        width: major ? 5 : 3,
        material: major ? roadColor : minorRoadColor,
        clampToGround: true,
      },
    });

    context.state.detailEntities.push(entity);
    roads += 1;

    if (item.tags?.name && roads < 42) {
      const label = roadLabelEntity(context, item, positions);
      if (label) {
        context.state.detailEntities.push(label);
      }
    }
  }

  return { buildings, roads };
};

const roadLabelEntity = (context: AppContext, item: OverpassElement, positions: Cartesian3[]) => {
  const midpoint = positions[Math.floor(positions.length / 2)];
  if (!midpoint || !item.tags?.name) {
    return null;
  }

  return context.viewer.entities.add({
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
};

const geometryToPositions = (geometry: Array<{ lon: number; lat: number }>) =>
  geometry
    .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat))
    .map((point) => Cartesian3.fromDegrees(point.lon, point.lat));

const buildingHeight = (tags: Record<string, string>, id = 0): number => {
  const taggedHeight = parseFloat(String(tags.height || "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(taggedHeight) && taggedHeight > 0) {
    return clamp(taggedHeight, 4, 260);
  }

  const levels = parseFloat(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0) {
    return clamp(levels * 3.2, 4, 220);
  }

  return 9 + (hashNumber(id) % 12) * 2.5;
};

const bboxAround = (center: Cartographic, radiusMeters: number): OverpassBBox => {
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
};

const detailKey = (center: Cartographic, radiusMeters: number): string => {
  const lat = toDegrees(center.latitude);
  const lon = toDegrees(center.longitude);
  return `${Math.round(lat * 400)}:${Math.round(lon * 400)}:${Math.round(radiusMeters / 350)}`;
};
