import { ScreenSpaceEventHandler, ScreenSpaceEventType } from "cesium";
import type { AppContext, BaseLayer, QualitySetting } from "./types";
import { PLACES, isPlaceKey } from "./constants";
import { setBaseLayer, setQuality, updateLayerBlend, updateNightStyling } from "./layers";
import { flyHome, flyToPlace } from "./navigation";
import { geocode, renderSearchError, renderSearchResults } from "./search";
import { clearStreetTwin, maybeLoadStreetTwin } from "./streetTwin";
import { updateTelemetry } from "./telemetry";
import { throttle } from "./utils";

export const attachEvents = (context: AppContext): void => {
  const { elements, state, viewer } = context;

  elements.searchForm.addEventListener("submit", (event) => void handleSearch(context, event));
  elements.labelsToggle.addEventListener("change", (event) => {
    state.labels = (event.target as HTMLInputElement).checked;
    updateLayerBlend(context);
  });
  elements.nightToggle.addEventListener("change", (event) => {
    state.night = (event.target as HTMLInputElement).checked;
    updateNightStyling(context);
    updateLayerBlend(context);
  });
  elements.streetTwinToggle.addEventListener("change", (event) => {
    state.streetTwin = (event.target as HTMLInputElement).checked;
    if (state.streetTwin) {
      void maybeLoadStreetTwin(context, true);
    }
  });
  elements.loadDetailButton.addEventListener("click", () => void maybeLoadStreetTwin(context, true));
  elements.clearDetailButton.addEventListener("click", () => clearStreetTwin(context));
  elements.homeButton.addEventListener("click", (event) => {
    event.preventDefault();
    flyHome(context, 2.4);
  });

  document.querySelectorAll("[data-place]").forEach((button) => {
    button.addEventListener("click", () => {
      const placeKey = (button as HTMLButtonElement).dataset.place;
      if (placeKey && isPlaceKey(placeKey)) {
        flyToPlace(context, PLACES[placeKey]);
      }
    });
  });

  document.querySelectorAll("[data-base]").forEach((button) => {
    button.addEventListener("click", () => {
      const base = (button as HTMLButtonElement).dataset.base as BaseLayer | undefined;
      if (base) {
        setBaseLayer(context, base);
      }
    });
  });

  document.querySelectorAll("[data-quality]").forEach((button) => {
    button.addEventListener("click", () => {
      const quality = (button as HTMLButtonElement).dataset.quality as QualitySetting | undefined;
      if (quality) {
        setQuality(context, quality);
      }
    });
  });

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(() => elements.searchResults.classList.remove("is-open"), ScreenSpaceEventType.LEFT_DOWN);
  handler.setInputAction(() => elements.searchResults.classList.remove("is-open"), ScreenSpaceEventType.WHEEL);

  viewer.camera.changed.addEventListener(throttle(() => updateTelemetry(context), 140));
  viewer.camera.moveEnd.addEventListener(() => {
    updateTelemetry(context);
    void maybeLoadStreetTwin(context, false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      elements.searchResults.classList.remove("is-open");
    }
  });
};

const handleSearch = async (context: AppContext, event: Event): Promise<void> => {
  event.preventDefault();
  const query = context.elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  context.elements.detailOutput.value = "Searching";
  context.elements.searchResults.classList.remove("is-open");
  context.elements.searchResults.innerHTML = "";

  try {
    const results = await geocode(query);
    renderSearchResults(context.elements, results, (place) => flyToPlace(context, place));
    context.elements.detailOutput.value = results.length ? "Select result" : "No result";
  } catch (error) {
    context.elements.detailOutput.value = "Search failed";
    renderSearchError(context.elements, "Search service unavailable");
    console.error(error);
  }
};
