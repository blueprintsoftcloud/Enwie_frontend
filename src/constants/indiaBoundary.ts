// src/constants/indiaBoundary.ts
// Accurate boundary polygon of India (Mainland, Andaman & Nicobar, Lakshadweep)
// Used for:
// 1. Visually rendering India's national border on Leaflet maps
// 2. Client-side point-in-polygon validation (instantly rejects clicks in oceans / neighboring countries)

export const INDIA_MAINLAND_COORDS: [number, number][] = [
  // Northern tip (Ladakh / Siachen / Kashmir)
  [35.5, 76.8],
  [35.4, 77.8],
  [34.8, 78.8],
  [33.8, 79.2],
  [32.8, 78.7],
  [31.8, 78.8],
  [31.0, 79.1],
  [30.5, 80.5],
  [30.1, 81.0],

  // Along Nepal border (Uttarakhand, UP, Bihar, WB)
  [29.0, 80.2],
  [28.8, 80.5],
  [28.4, 81.1],
  [27.7, 82.2],
  [27.4, 83.5],
  [27.0, 84.8],
  [26.6, 86.2],
  [26.5, 87.5],
  [26.7, 88.1],

  // Sikkim & Bhutan border
  [27.1, 88.1],
  [27.8, 88.2],
  [28.1, 88.7],
  [27.8, 88.9],
  [27.2, 88.9],
  [26.8, 89.8],
  [27.3, 91.5],
  [27.8, 91.7],
  [28.0, 92.0],

  // Arunachal Pradesh
  [27.6, 92.5],
  [28.1, 93.6],
  [28.7, 94.6],
  [29.1, 95.6],
  [28.6, 96.5],
  [28.3, 97.2],
  [27.8, 97.1],

  // Myanmar border (Nagaland, Manipur, Mizoram)
  [27.1, 96.3],
  [26.2, 95.2],
  [25.2, 94.8],
  [24.2, 94.3],
  [23.4, 93.4],
  [22.4, 93.1],
  [21.9, 92.9],
  [21.9, 92.5],

  // Bangladesh border & Northeast loops
  [22.8, 92.2],
  [23.7, 92.3],
  [24.5, 92.4],
  [25.1, 92.0],
  [25.2, 90.1],
  [25.8, 89.8],
  [26.3, 89.6],
  [26.1, 88.3],
  [24.8, 88.1],
  [24.0, 88.6],
  [22.8, 88.9],
  [22.1, 89.1],
  [21.6, 88.2], // Sundarbans coast

  // East Coast (West Bengal, Odisha, Andhra Pradesh, Tamil Nadu)
  [21.2, 86.9],
  [20.5, 86.8],
  [19.8, 85.8],
  [19.2, 84.9],
  [18.3, 84.1],
  [17.7, 83.3], // Visakhapatnam
  [16.9, 82.3],
  [16.2, 81.6],
  [15.8, 80.8],
  [15.2, 80.1],
  [14.0, 80.1],
  [13.1, 80.3], // Chennai
  [12.4, 80.2],
  [11.8, 79.8],
  [10.8, 79.9],
  [10.3, 79.4],
  [9.3, 79.2],  // Rameshwaram (kept strictly north of Sri Lanka)
  [8.8, 78.2],
  [8.08, 77.55], // Kanyakumari (Southern tip)

  // West Coast (Kerala, Karnataka, Goa, Maharashtra, Gujarat)
  [8.5, 76.9],  // Thiruvananthapuram
  [9.0, 76.5],  // Kollam
  [9.5, 76.3],  // Alappuzha
  [9.95, 76.2], // Kochi
  [10.8, 75.9],
  [11.25, 75.76], // Kozhikode
  [11.9, 75.35],  // Kannur
  [12.5, 74.98],  // Kasaragod
  [12.9, 74.8],   // Mangaluru
  [13.8, 74.6],   // Udupi
  [14.4, 74.4],   // Bhatkal
  [15.0, 74.1],   // Karwar
  [15.5, 73.75],  // Goa
  [16.2, 73.4],
  [16.9, 73.3],   // Ratnagiri
  [18.3, 72.9],
  [18.95, 72.8],  // Mumbai
  [19.8, 72.75],
  [20.5, 72.85],  // Daman
  [21.2, 72.8],   // Surat
  [21.7, 72.2],   // Bhavnagar
  [20.7, 70.9],   // Diu
  [20.9, 70.3],   // Somnath
  [21.6, 69.6],   // Porbandar
  [22.25, 68.95], // Dwarka
  [22.8, 70.0],
  [23.1, 68.6],   // Kutch Western Tip
  [23.7, 68.8],
  [24.1, 69.8],
  [24.5, 71.0],   // Rann of Kutch

  // Western land border (Rajasthan, Punjab, J&K)
  [25.0, 71.0],
  [25.7, 70.4],
  [26.8, 70.0],
  [27.6, 70.6],
  [28.4, 71.8],
  [29.5, 72.9],
  [30.2, 73.8],
  [31.2, 74.5],
  [32.2, 74.9],
  [32.8, 74.4],
  [33.5, 74.2],
  [34.3, 74.0],
  [34.8, 74.5],
  [35.3, 75.8],
  [35.5, 76.8], // Closing mainland loop
];

// Lakshadweep Islands Polygon Bounding Regions
export const LAKSHADWEEP_COORDS: [number, number][] = [
  [8.1, 72.8],
  [8.5, 73.3],
  [11.9, 73.9],
  [12.5, 73.3],
  [12.5, 71.8],
  [10.0, 71.8],
  [8.1, 72.8],
];

// Andaman & Nicobar Islands Polygon Bounding Region
export const ANDAMAN_NICOBAR_COORDS: [number, number][] = [
  [6.5, 93.3],
  [7.2, 94.1],
  [13.8, 93.6],
  [13.8, 92.5],
  [9.0, 92.4],
  [6.5, 93.3],
];

export const ALL_INDIA_POLYGONS = [
  INDIA_MAINLAND_COORDS,
  LAKSHADWEEP_COORDS,
  ANDAMAN_NICOBAR_COORDS,
];

/**
 * Standard ray-casting algorithm to test if [lat, lng] is strictly inside a polygon.
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validates if the coordinates are strictly inside Indian territory (Mainland or Islands).
 * Returns true if inside India, false if in the sea, Sri Lanka, Pakistan, etc.
 */
export function isStrictlyInsideIndia(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;
  return ALL_INDIA_POLYGONS.some((poly) => isPointInPolygon([lat, lng], poly));
}
