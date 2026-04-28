import { CesiumTerrainProvider, EllipsoidTerrainProvider, JulianDate, Viewer } from "cesium";
import type { AppContext, ImageryProviders, LayerSet } from "./types";

export const createViewer = (): Viewer =>
  new Viewer("earth", {
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

export const createLayers = (viewer: Viewer, imagery: ImageryProviders): LayerSet => {
  viewer.imageryLayers.removeAll();

  const layers: LayerSet = {
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

  return layers;
};

export const configureScene = (viewer: Viewer): void => {
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
};

export const loadTerrain = async (context: AppContext): Promise<void> => {
  try {
    context.elements.detailOutput.value = "Terrain loading";
    const terrain = await CesiumTerrainProvider.fromUrl("https://assets.agi.com/stk-terrain/world", {
      requestVertexNormals: true,
      requestWaterMask: true,
    });
    context.viewer.terrainProvider = terrain;
    context.elements.detailOutput.value = "Terrain ready";
  } catch (error) {
    context.viewer.terrainProvider = new EllipsoidTerrainProvider();
    context.elements.detailOutput.value = "Terrain fallback";
    console.warn("Terrain provider unavailable; using ellipsoid.", error);
  } finally {
    context.viewer.scene.requestRender();
  }
};
