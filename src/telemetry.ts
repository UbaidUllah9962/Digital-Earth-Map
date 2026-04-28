import { Cartesian2, Cartographic } from "cesium";
import type { AppContext } from "./types";
import { updateLayerBlend } from "./layers";
import { toDegrees } from "./utils";

export const getCameraCartographic = (viewer: AppContext["viewer"]) =>
  Cartographic.fromCartesian(viewer.camera.positionWC);

export const getViewCenter = (viewer: AppContext["viewer"]) => {
  const canvas = viewer.scene.canvas;
  const ray = viewer.camera.getPickRay(new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));

  if (!ray) {
    return null;
  }

  const picked = viewer.scene.globe.pick(ray, viewer.scene);
  return picked ? Cartographic.fromCartesian(picked) : getCameraCartographic(viewer);
};

export const modeForAltitude = (altitude: number): string => {
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
};

export const formatAltitude = (meters: number): string => {
  if (meters >= 1000000) {
    return `${(meters / 1000000).toFixed(1)} Mm`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.max(0, meters).toFixed(0)} m`;
};

export const updateTelemetry = (context: AppContext): void => {
  const { elements, viewer } = context;
  const cartographic = getCameraCartographic(viewer);
  const center = getViewCenter(viewer);
  const altitude = cartographic.height;

  elements.altitudeOutput.value = formatAltitude(altitude);
  elements.modeLabel.textContent = modeForAltitude(altitude);
  elements.centerOutput.value = center
    ? `${toDegrees(center.latitude).toFixed(4)}, ${toDegrees(center.longitude).toFixed(4)}`
    : "--";

  updateLayerBlend(context);
};
