/// <reference types="vite/client" />

export interface GoogleMapsLoadStatus {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

let loadPromise: Promise<void> | null = null;

export const googleMapsService = {
  getApiKey: (): string => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (window as any).VITE_GOOGLE_MAPS_API_KEY || '';
    return typeof key === 'string' ? key.trim() : '';
  },

  isApiKeyValid: (): boolean => {
    const key = googleMapsService.getApiKey();
    return Boolean(key && key.length > 10 && !key.includes('YourRestricted') && !key.includes('YOUR_KEY'));
  },

  loadGoogleMapsScript: (): Promise<void> => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      return Promise.resolve();
    }

    if (loadPromise) {
      return loadPromise;
    }

    const apiKey = googleMapsService.getApiKey();
    if (!googleMapsService.isApiKeyValid()) {
      return Promise.reject(new Error("Google Maps API key is missing or unconfigured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file."));
    }

    loadPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-maps-js-script') as HTMLScriptElement;
      if (existingScript) {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', (e) => reject(new Error("Failed to load Google Maps JS script")));
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-js-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Google Maps API failed to load. Check network connection and API key permissions."));
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }
};
