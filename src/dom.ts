import type { Elements } from "./types";

export const getElements = (): Elements => ({
  loadingScreen: document.querySelector<HTMLElement>("#loadingScreen")!,
  modeLabel: document.querySelector<HTMLElement>("#modeLabel")!,
  searchForm: document.querySelector<HTMLFormElement>("#searchForm")!,
  searchInput: document.querySelector<HTMLInputElement>("#searchInput")!,
  searchResults: document.querySelector<HTMLDivElement>("#searchResults")!,
  altitudeOutput: document.querySelector<HTMLOutputElement>("#altitudeOutput")!,
  centerOutput: document.querySelector<HTMLOutputElement>("#centerOutput")!,
  detailOutput: document.querySelector<HTMLOutputElement>("#detailOutput")!,
  labelsToggle: document.querySelector<HTMLInputElement>("#labelsToggle")!,
  nightToggle: document.querySelector<HTMLInputElement>("#nightToggle")!,
  streetTwinToggle: document.querySelector<HTMLInputElement>("#streetTwinToggle")!,
  loadDetailButton: document.querySelector<HTMLButtonElement>("#loadDetailButton")!,
  clearDetailButton: document.querySelector<HTMLButtonElement>("#clearDetailButton")!,
  homeButton: document.querySelector<HTMLAnchorElement>("#homeButton")!,
});
