import { Cartesian3, Math as CesiumMath } from "cesium";
import type { AppContext, Place } from "./types";
import { clearSelectedMarker, setSelectedMarker } from "./selection";
import { maybeLoadStreetTwin } from "./streetTwin";
import { updateTelemetry } from "./telemetry";

export const flyHome = (context: AppContext, duration = 2.8): void => {
  clearSelectedMarker(context);
  context.viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(8, 18, 20500000),
    orientation: {
      heading: CesiumMath.toRadians(0),
      pitch: CesiumMath.toRadians(-90),
      roll: 0,
    },
    duration,
    complete: () => updateTelemetry(context),
  });
};

export const flyToPlace = (context: AppContext, place: Place): void => {
  context.elements.searchInput.value = place.name;
  context.elements.searchResults.classList.remove("is-open");
  setSelectedMarker(context, place);
  context.viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(place.lon, place.lat, place.altitude),
    orientation: {
      heading: CesiumMath.toRadians(place.heading ?? 0),
      pitch: CesiumMath.toRadians(-58),
      roll: 0,
    },
    duration: 3.2,
    complete: () => {
      updateTelemetry(context);
      void maybeLoadStreetTwin(context, true);
    },
  });
};
