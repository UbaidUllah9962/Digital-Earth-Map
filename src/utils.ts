import { Math as CesiumMath } from "cesium";

export const toDegrees = (radians: number): number => CesiumMath.toDegrees(radians);

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const inverseLerp = (start: number, end: number, value: number): number => (value - start) / (end - start);

export const normalizeLongitude = (lon: number): number => ((((lon + 180) % 360) + 360) % 360) - 180;

export const hashNumber = (value: number | string): number => {
  const input = String(value);
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const throttle = <T extends (...args: any[]) => void>(callback: T, wait: number) => {
  let last = 0;
  let timer: number | undefined;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - last);

    if (remaining <= 0) {
      window.clearTimeout(timer);
      timer = undefined;
      last = now;
      callback(...args);
      return;
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        last = Date.now();
        timer = undefined;
        callback(...args);
      }, remaining);
    }
  };
};

export const escapeHtml = (value: string): string =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
