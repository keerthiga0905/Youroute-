import { isCoordinateInTamilNadu } from './geofenceService';

export interface ReverseGeocodeResult {
  address: string;
  formattedAddress: string;
  district?: string;
  isInTN: boolean;
}

export const reverseGeocodeService = {
  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    const isInTN = isCoordinateInTamilNadu(lat, lng);

    try {
      // 1. Google Maps Geocoder (if available)
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

      // 2. OpenStreetMap Nominatim reverse geocoder fallback
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
          district: data.address.state_district || data.address.county || city,
          isInTN: isInTN || (state.toLowerCase().includes("tamil nadu") || state.toLowerCase().includes("tn"))
        };
      }

      return {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}, Tamil Nadu`,
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}, Tamil Nadu`,
        isInTN
      };
    } catch (e) {
      console.warn("Reverse geocoding error:", e);
      return {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        isInTN
      };
    }
  }
};
