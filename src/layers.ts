import type { AppContext, BaseLayer, QualitySetting, Style } from "./types";
import {
  DAY_BASE_STYLE,
  DAY_LIGHT_STYLE,
  NIGHT_BASE_STYLE,
  NIGHT_LABEL_ALPHA_SCALE,
  NIGHT_LIGHT_LAYER_MAX_ALPHA,
  NIGHT_LIGHT_STYLE,
} from "./constants";
import { clamp, inverseLerp } from "./utils";

const applyImageryStyle = (layer: { brightness: number; contrast: number; saturation: number; gamma: number }, style: Style) => {
  layer.brightness = style.brightness;
  layer.contrast = style.contrast;
  layer.saturation = style.saturation;
  layer.gamma = style.gamma;
};

export const setBaseLayer = (context: AppContext, base: BaseLayer): void => {
  const { state, layers } = context;
  state.base = base;
  layers.satellite.show = base === "satellite";
  layers.blue.show = base === "blue";
  layers.street.show = base === "street";

  document.querySelectorAll("[data-base]").forEach((button) => {
    button.classList.toggle("is-active", (button as HTMLButtonElement).dataset.base === base);
  });

  updateLayerBlend(context);
};

export const setQuality = (context: AppContext, quality: QualitySetting): void => {
  const { state, viewer } = context;
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
    button.classList.toggle("is-active", (button as HTMLButtonElement).dataset.quality === quality);
  });

  viewer.scene.requestRender();
};

export const updateNightStyling = (context: AppContext): void => {
  const { state, layers } = context;
  if (state.lastNightModeState === state.night) {
    return;
  }

  state.lastNightModeState = state.night;
  const baseStyle = state.night ? NIGHT_BASE_STYLE : DAY_BASE_STYLE;
  applyImageryStyle(layers.satellite, baseStyle);
  applyImageryStyle(layers.blue, baseStyle);
  applyImageryStyle(layers.street, baseStyle);

  const nightStyle = state.night ? NIGHT_LIGHT_STYLE : DAY_LIGHT_STYLE;
  applyImageryStyle(layers.night, nightStyle);
};

export const updateLayerBlend = (context: AppContext): void => {
  const { state, viewer, layers } = context;
  const altitude = viewer.camera.positionCartographic.height;
  const streetBlend = state.labels ? clamp(inverseLerp(2500000, 45000, altitude), 0, 1) : 0;
  const nightBlend = state.night
    ? clamp(inverseLerp(9000000, 1400000, altitude), 0.0, NIGHT_LIGHT_LAYER_MAX_ALPHA)
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

  viewer.scene.requestRender();
};
