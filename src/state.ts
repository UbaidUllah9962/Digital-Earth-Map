import type { AppState } from "./types";

export const createState = (): AppState => ({
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
  lastNightModeState: false,
});
