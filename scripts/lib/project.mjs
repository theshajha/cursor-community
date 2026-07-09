// Equirectangular projection into a 1000×500 viewBox.
// MIRROR: app.js has a character-identical project() — keep in sync.
export const MAP_W = 1000;
export const MAP_H = 500;
// Crop to 85°N–60°S: y(85)=13.9 → 14, height ≈ 402.8 → 403.
export const VIEWBOX = '0 14 1000 403';

export function project(lat, lng) {
  return {
    x: ((lng + 180) / 360) * MAP_W,
    y: ((90 - lat) / 180) * MAP_H,
  };
}
