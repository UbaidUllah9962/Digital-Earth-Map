import { Cartesian2, Cartesian3, Color, HeightReference, LabelStyle, NearFarScalar } from "cesium";
import type { AppContext, Place } from "./types";

export const setSelectedMarker = (context: AppContext, place: Place): void => {
  clearSelectedMarker(context);
  context.state.selectedMarker = context.viewer.entities.add({
    name: place.name,
    position: Cartesian3.fromDegrees(place.lon, place.lat),
    point: {
      pixelSize: 10,
      color: Color.fromCssColorString("#66e1d2"),
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: place.name.split(",")[0],
      font: "600 14px Inter, system-ui, sans-serif",
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian2(0, -22),
      heightReference: HeightReference.CLAMP_TO_GROUND,
      scaleByDistance: new NearFarScalar(500, 1, 600000, 0),
    },
  });
};

export const clearSelectedMarker = (context: AppContext): void => {
  const { state, viewer } = context;
  if (state.selectedMarker) {
    viewer.entities.remove(state.selectedMarker);
    state.selectedMarker = null;
  }
};
