import type { Entity, ImageryLayer, UrlTemplateImageryProvider, Viewer } from "cesium";

export type BaseLayer = "satellite" | "blue" | "street";
export type QualitySetting = "lean" | "balanced" | "sharp";

export type Style = {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
};

export type Place = {
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  heading?: number;
};

export type AppState = {
  base: BaseLayer;
  labels: boolean;
  night: boolean;
  streetTwin: boolean;
  quality: QualitySetting;
  lastDetailAt: number;
  lastDetailKey: string;
  detailAbort: AbortController | null;
  detailEntities: Entity[];
  selectedMarker: Entity | null;
  lastNightModeState: boolean;
};

export type Elements = {
  loadingScreen: HTMLElement;
  modeLabel: HTMLElement;
  searchForm: HTMLFormElement;
  searchInput: HTMLInputElement;
  searchResults: HTMLDivElement;
  altitudeOutput: HTMLOutputElement;
  centerOutput: HTMLOutputElement;
  detailOutput: HTMLOutputElement;
  labelsToggle: HTMLInputElement;
  nightToggle: HTMLInputElement;
  streetTwinToggle: HTMLInputElement;
  loadDetailButton: HTMLButtonElement;
  clearDetailButton: HTMLButtonElement;
  homeButton: HTMLAnchorElement;
};

export type ImageryProviders = {
  satellite: UrlTemplateImageryProvider;
  blue: UrlTemplateImageryProvider;
  street: UrlTemplateImageryProvider;
  labels: UrlTemplateImageryProvider;
  night: UrlTemplateImageryProvider;
};

export type LayerSet = {
  satellite: ImageryLayer;
  blue: ImageryLayer;
  street: ImageryLayer;
  labels: ImageryLayer;
  night: ImageryLayer;
};

export type AppContext = {
  viewer: Viewer;
  layers: LayerSet;
  elements: Elements;
  state: AppState;
};

export type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  name?: string;
};

export type OverpassElement = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

export type OverpassResponse = {
  elements?: OverpassElement[];
};

export type OverpassBBox = {
  south: string;
  west: string;
  north: string;
  east: string;
};

export type OverpassCounts = {
  buildings: number;
  roads: number;
};
