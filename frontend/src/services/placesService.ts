import { validateTNLocation } from './geofenceService';
import { LocationResult } from './locationService';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const placesService = {
  // Real Place Autocomplete Service (Google Places API + Nominatim TN Search)
  fetchSuggestions: (
    query: string,
    onSuccess: (results: LocationResult[]) => void,
    delayMs = 250
  ): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!query || query.trim().length < 2) {
      onSuccess([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        if (
          typeof window !== 'undefined' &&
          window.google &&
          window.google.maps &&
          window.google.maps.places
        ) {
          const autocompleteService = new window.google.maps.places.AutocompleteService();
          const geocoder = new window.google.maps.Geocoder();

          autocompleteService.getPlacePredictions(
            {
              input: query,
              componentRestrictions: { country: 'in' },
              locationRestriction: {
                north: 13.7,
                south: 7.8,
                east: 80.6,
                west: 76.0
              }
            },
            async (predictions, status) => {
              if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                predictions &&
                predictions.length > 0
              ) {
                const results: LocationResult[] = [];
                for (const pred of predictions.slice(0, 5)) {
                  try {
                    const geoRes = await geocoder.geocode({ placeId: pred.place_id });
                    if (geoRes.results && geoRes.results.length > 0) {
                      const loc = geoRes.results[0].geometry.location;
                      const lat = loc.lat();
                      const lng = loc.lng();
                      const val = validateTNLocation(pred.description, lat, lng);

                      results.push({
                        placeId: pred.place_id,
                        lat,
                        lng,
                        displayName: pred.structured_formatting.main_text || pred.description,
                        formattedAddress: pred.description,
                        district: pred.structured_formatting.secondary_text,
                        isInTN: val.isValid
                      });
                    }
                  } catch (e) {
                    console.warn("Geocode placeId notice:", e);
                  }
                }
                if (results.length > 0) {
                  onSuccess(results);
                  return;
                }
              }
              placesService._fallbackOSMSearch(query, onSuccess);
            }
          );
          return;
        }

        placesService._fallbackOSMSearch(query, onSuccess);
      } catch (err) {
        console.warn("Places autocomplete error:", err);
        placesService._fallbackOSMSearch(query, onSuccess);
      }
    }, delayMs);
  },

  geocodeText: async (query: string): Promise<LocationResult | null> => {
    return new Promise((resolve) => {
      placesService.fetchSuggestions(query, (results) => {
        if (results && results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      }, 0);
    });
  },

  _fallbackOSMSearch: async (query: string, onSuccess: (results: LocationResult[]) => void) => {
    try {
      const searchQuery = query.toLowerCase().includes("tamil nadu") || query.toLowerCase().includes("tn")
        ? query
        : `${query}, Tamil Nadu`;

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&viewbox=76.0,7.8,80.6,13.7&bounded=1&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SafeRouteAI/1.0' } });
      const data = await res.json();

      if (Array.isArray(data)) {
        const results: LocationResult[] = data.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const valResult = validateTNLocation(item.display_name, lat, lng);

          return {
            lat,
            lng,
            displayName: item.display_name.split(',')[0],
            formattedAddress: item.display_name,
            district: item.address?.state_district || item.address?.county || item.address?.city || 'Tamil Nadu',
            isInTN: valResult.isValid
          };
        });
        onSuccess(results);
        return;
      }
      onSuccess([]);
    } catch (e) {
      console.warn("OSM fallback search warning:", e);
      onSuccess([]);
    }
  }
};
