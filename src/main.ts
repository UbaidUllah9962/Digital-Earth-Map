import { Ion } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./styles.css";
import type { AppContext } from "./types";
import { createImageryProviders } from "./imagery";
import { createState } from "./state";
import { getElements } from "./dom";
import { createLayers, createViewer, configureScene, loadTerrain } from "./viewer";
import { attachEvents } from "./events";
import { setBaseLayer, setQuality } from "./layers";
import { flyHome } from "./navigation";

Ion.defaultAccessToken = "";

const state = createState();
const elements = getElements();
const imagery = createImageryProviders();
const viewer = createViewer();
const layers = createLayers(viewer, imagery);
const context: AppContext = { state, elements, viewer, layers };

configureScene(viewer);
attachEvents(context);
setQuality(context, "balanced");
setBaseLayer(context, "satellite");
void loadTerrain(context);
flyHome(context, 0);

setTimeout(() => {
  elements.loadingScreen.classList.add("is-hidden");
}, 1000);
