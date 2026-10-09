// attribution.ts — fills in the data credits shown at the bottom of the screen.
// OpenStreetMap's license requires this credit to be visible whenever we show their data.

export function renderAttribution(el: HTMLElement): void {
  el.innerHTML =
    'Peak data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>' +
    ' · Elevation: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen Terrarium tiles (AWS Open Data)</a>';
}
