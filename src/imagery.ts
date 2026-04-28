import { Credit, UrlTemplateImageryProvider } from "cesium";
import type { ImageryProviders } from "./types";

export const createImageryProviders = (): ImageryProviders => ({
  satellite: new UrlTemplateImageryProvider({
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maximumLevel: 19,
    credit: new Credit("Sources: Esri, Maxar, Earthstar Geographics, GIS User Community"),
  }),
  blue: new UrlTemplateImageryProvider({
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
    maximumLevel: 8,
    credit: new Credit("NASA Global Imagery Browse Services"),
  }),
  street: new UrlTemplateImageryProvider({
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
    maximumLevel: 20,
    credit: new Credit("Map tiles by CARTO, under CC BY 3.0. Data by OpenStreetMap, under ODbL."),
  }),
  labels: new UrlTemplateImageryProvider({
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
    maximumLevel: 20,
    credit: new Credit("Labels by CARTO. Data by OpenStreetMap contributors."),
  }),
  night: new UrlTemplateImageryProvider({
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
    maximumLevel: 8,
    credit: new Credit("NASA Earth Observatory / NOAA NGDC"),
  }),
});
