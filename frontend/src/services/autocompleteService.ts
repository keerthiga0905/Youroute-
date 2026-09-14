import { locationService, LocationResult } from './locationService';

// Debounce helper to prevent excessive API requests while typing
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const autocompleteService = {
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
        const results = await locationService.searchPlaces(query);
        onSuccess(results);
      } catch (err) {
        console.warn("Autocomplete fetch error:", err);
        onSuccess([]);
      }
    }, delayMs);
  }
};
