import type { Elements, NominatimResult, Place } from "./types";
import { escapeHtml } from "./utils";

export const geocode = async (query: string): Promise<NominatimResult[]> => {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "6");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("q", query);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Accept-Language": navigator.language || "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim responded ${response.status}`);
  }

  return response.json();
};

export const renderSearchResults = (
  elements: Elements,
  results: NominatimResult[],
  onSelectPlace: (place: Place) => void,
): void => {
  elements.searchResults.innerHTML = "";

  if (!results.length) {
    renderSearchError(elements, "No locations found");
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `<span>${escapeHtml(primaryName(result))}</span><small>${escapeHtml(result.display_name)}</small>`;
    button.addEventListener("click", () => {
      const place: Place = {
        name: result.display_name,
        lat: Number(result.lat),
        lon: Number(result.lon),
        altitude: altitudeForResult(result),
        heading: 0,
      };
      onSelectPlace(place);
    });
    fragment.append(button);
  });

  elements.searchResults.append(fragment);
  elements.searchResults.classList.add("is-open");
};

export const renderSearchError = (elements: Elements, message: string): void => {
  elements.searchResults.innerHTML = `<div class="search-result" role="status">${escapeHtml(message)}</div>`;
  elements.searchResults.classList.add("is-open");
};

const primaryName = (result: NominatimResult): string =>
  result.name || result.display_name.split(",")[0] || "Location";

const altitudeForResult = (result: NominatimResult): number => {
  const type = result.type || "";
  if (["house", "building", "amenity", "tourism", "shop"].includes(type)) {
    return 800;
  }
  if (["road", "neighbourhood", "suburb", "quarter"].includes(type)) {
    return 1500;
  }
  if (["city", "town", "administrative"].includes(type)) {
    return 4200;
  }
  return 2500;
};
