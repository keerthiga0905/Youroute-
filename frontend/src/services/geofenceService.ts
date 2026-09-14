// Tamil Nadu Boundary Geofence Service Module
// Defines the exact geographical polygon boundary of Tamil Nadu state, India.

export interface LatLng {
  lat: number;
  lng: number;
}

// Precision polygon covering Tamil Nadu state boundaries
const TAMIL_NADU_POLYGON: [number, number][] = [
  [13.48, 80.20], // Thiruvallur / AP Border North-East
  [13.52, 79.80], // North border AP
  [12.95, 79.15], // Vellore / Ranipet AP border
  [12.80, 78.50], // Tirupathur / Krishnagiri border
  [12.75, 77.85], // Hosur / Karnataka border
  [12.10, 77.80], // Dharmapuri / Erode KA border
  [11.90, 77.10], // Nilgiris / KA border
  [11.50, 76.50], // Ooty / Gudalur / Kerala border
  [11.00, 76.80], // Coimbatore / Valparai KL border
  [10.20, 77.15], // Dindigul / Kodaikanal KL border
  [9.60, 77.30],  // Theni / Tenkasi KL border
  [8.90, 77.10],  // Tirunelveli / Papanasam border
  [8.30, 77.35],  // Kanyakumari / Padmanabhapuram
  [8.07, 77.55],  // Kanyakumari South Tip
  [8.50, 78.12],  // Tiruchendur / Gulf of Mannar Coast
  [9.25, 79.10],  // Thoothukudi / Rameswaram Coast
  [10.30, 79.85], // Thanjavur / Nagapattinam Coast
  [11.40, 79.80], // Cuddalore / Puducherry Coast
  [12.50, 80.20], // Chengalpattu / Mahabalipuram Coast
  [13.15, 80.30], // Chennai Coast
  [13.48, 80.20]  // Closing Loop
];

// Point-in-polygon ray casting algorithm
export const isCoordinateInTamilNadu = (lat: number, lng: number): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false;
  }

  // Quick Bounding Box Check (Min Lat ~7.8, Max Lat ~13.7, Min Lng ~76.0, Max Lng ~80.6)
  if (lat < 7.8 || lat > 13.7 || lng < 76.0 || lng > 80.6) {
    return false;
  }

  let inside = false;
  const poly = TAMIL_NADU_POLYGON;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

// Known major Tamil Nadu cities and districts for name validation fallback
export const TAMIL_NADU_CITIES = [
  'coimbatore', 'chennai', 'madurai', 'salem', 'tiruchirappalli', 'trichy',
  'tiruppur', 'erode', 'vellore', 'tirunelveli', 'thanjavur', 'dindigul',
  'hosur', 'ooty', 'udhagamandalam', 'pollachi', 'mettupalayam', 'karur',
  'namakkal', 'kanchipuram', 'cuddalore', 'thoothukudi', 'tuticorin',
  'kanyakumari', 'nagercoil', 'pudukkottai', 'ramanathapuram', 'sivaganga',
  'theni', 'tenkasi', 'ranipet', 'tirupathur', 'tiruvannamalai', 'kallakurichi',
  'perambalur', 'ariyalur', 'nagapattinam', 'mayiladuthurai', 'villupuram',
  'thiruvallur', 'chengalpattu', 'gandhipuram', 'peelamedu', 'rs puram',
  't nagar', 'anna nagar', 'adyar', 'velachery', 'singanallur', 'saravanampatti',
  'nehru nagar'
];

export const validateTNLocation = (name: string, lat: number, lng: number): { isValid: boolean; errorMessage?: string } => {
  const inPolygon = isCoordinateInTamilNadu(lat, lng);

  if (inPolygon) {
    return { isValid: true };
  }

  // Check if address name contains explicit TN city or state keyword
  const lowercaseName = (name || '').toLowerCase();
  const matchesCity = TAMIL_NADU_CITIES.some(city => lowercaseName.includes(city));
  const matchesTN = lowercaseName.includes('tamil nadu') || lowercaseName.includes('tn');

  if (matchesCity || matchesTN) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'SafeRoute currently supports Tamil Nadu only.'
  };
};
