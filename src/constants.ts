import type { Place, Style } from "./types";

export const EARTH_RADIUS_METERS = 6378137;
export const MAX_DETAIL_FEATURES = 420;
export const DETAIL_ALTITUDE_LIMIT = 18000;
export const DETAIL_RELOAD_MS = 9000;

export const NIGHT_BASE_STYLE: Style = {
  brightness: 0.22,
  contrast: 1.18,
  saturation: 0.24,
  gamma: 0.78,
};

export const DAY_BASE_STYLE: Style = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
};

export const NIGHT_LIGHT_STYLE: Style = {
  brightness: 1.15,
  contrast: 1.25,
  saturation: 1.35,
  gamma: 0.92,
};

export const DAY_LIGHT_STYLE: Style = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
};

export const NIGHT_LABEL_ALPHA_SCALE = 0.58;
export const NIGHT_LIGHT_LAYER_MAX_ALPHA = 0.85;

export const PLACES = {
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
} satisfies Record<string, Place>;

export type PlaceKey = keyof typeof PLACES;

export const isPlaceKey = (value: string): value is PlaceKey =>
  Object.prototype.hasOwnProperty.call(PLACES, value);
