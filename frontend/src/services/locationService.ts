import { validateTNLocation, isCoordinateInTamilNadu } from './geofenceService';

export interface LocationResult {
  placeId?: string;
  lat: number;
  lng: number;
  displayName: string;
  formattedAddress: string;
  district?: string;
  isInTN: boolean;
}

export interface GPSPositionResult {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  accuracyText: string;
  isApproximate: boolean; // true if desktop/low accuracy (>100m)
  warning?: string;
}

export const locationService = {
  // Get real browser high-accuracy GPS coordinates & accuracy status
  getCurrentPosition: (): Promise<GPSPositionResult> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error("Geolocation is not supported by your browser. Please enter your location manually."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 25);
          const isApproximate = accuracy > 100;

          let warning: string | undefined = undefined;
          if (isApproximate) {
            warning = "Your browser provided an approximate location. Move outdoors or enter your location manually.";
          }

          resolve({
            lat,
            lng,
            accuracy,
            accuracyText: `GPS accuracy: ${accuracy} meters`,
            isApproximate,
            warning
          });
        },
        (error) => {
          let userMsg = "Unable to detect your location. Please enter your starting location manually.";
          if (error.code === error.PERMISSION_DENIED) {
            userMsg = "Location permission was denied. Please allow location access or enter your starting location manually.";
          } else if (error.code === error.TIMEOUT) {
            userMsg = "Location request timed out. Please try again or enter your location manually.";
          }
          reject(new Error(userMsg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  },

  // Reverse geocode coordinates to actual readable street address & validate TN boundary
  reverseGeocode: async (lat: number, lng: number): Promise<{ address: string; formattedAddress: string; isInTN: boolean }> => {
    const isInTN = isCoordinateInTamilNadu(lat, lng);

    try {
      // 1. Try Google Maps Geocoder if Google Maps API is loaded
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await geocoder.geocode({ location: { lat, lng } });
        if (res.results && res.results.length > 0) {
          const first = res.results[0];
          return {
            address: first.formatted_address,
            formattedAddress: first.formatted_address,
            isInTN: isInTN || first.formatted_address.toLowerCase().includes("tamil nadu")
          };
        }
      }

      // 2. Fallback to OpenStreetMap Nominatim reverse geocoder
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SafeRouteAI/1.0' } });
      const data = await res.json();
      
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.suburb || "";
        const city = data.address.city || data.address.town || data.address.village || data.address.county || "Coimbatore";
        const state = data.address.state || "Tamil Nadu";
        
        const fullAddr = [road, city, state].filter(Boolean).join(", ");
        return {
          address: fullAddr || `${city}, ${state}`,
          formattedAddress: data.display_name || fullAddr,
          isInTN: isInTN || (state.toLowerCase().includes("tamil nadu") || state.toLowerCase().includes("tn"))
        };
      }
      return {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}, Tamil Nadu`,
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}, Tamil Nadu`,
        isInTN
      };
    } catch (e) {
      console.warn("Reverse geocoding notice:", e);
      return {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        isInTN
      };
    }
  },

  // Search places via autocomplete / geocoding
  searchPlaces: async (query: string): Promise<LocationResult[]> => {
    if (!query || query.trim().length < 2) return [];
    try {
      const { placesService } = await import('./placesService');
      return new Promise((resolve) => {
        placesService.fetchSuggestions(query, (results) => resolve(results), 0);
      });
    } catch (e) {
      console.warn("searchPlaces error:", e);
      return [];
    }
  }
};
