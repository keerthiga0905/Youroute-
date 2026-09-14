export interface GPSResult {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  accuracyText: string;
  accuracyRating: 'high' | 'good' | 'limited';
  accuracyLabel: string;
  timestamp: string;
  warning?: string;
}

export const geolocationService = {
  getCurrentPosition: (): Promise<GPSResult> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error("Geolocation is not supported by your browser. Please enter your location manually."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 15);

          let accuracyRating: GPSResult['accuracyRating'] = 'high';
          let accuracyLabel = '✓ High accuracy';
          let warning: string | undefined = undefined;

          if (accuracy <= 30) {
            accuracyRating = 'high';
            accuracyLabel = '✓ High accuracy';
          } else if (accuracy <= 100) {
            accuracyRating = 'good';
            accuracyLabel = '~ Good accuracy';
          } else {
            accuracyRating = 'limited';
            accuracyLabel = '⚠ Location accuracy is limited';
            warning = "Location accuracy is limited. For better precision, enable GPS on your device.";
          }

          const timestampStr = new Date(position.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          resolve({
            lat,
            lng,
            accuracy,
            accuracyText: `GPS accuracy: ${accuracy} m`,
            accuracyRating,
            accuracyLabel,
            timestamp: timestampStr,
            warning
          });
        },
        (error) => {
          let userMsg = "Unable to detect your current location. Please enable device location or enter your starting location manually.";
          if (error.code === error.PERMISSION_DENIED) {
            userMsg = "Location permission is required to detect your current position. Please allow location access or enter starting location manually.";
          } else if (error.code === error.TIMEOUT) {
            userMsg = "Location request timed out. Please enter your starting location manually.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            userMsg = "Unable to detect your current location. Please enable device location or enter your starting location manually.";
          }
          reject(new Error(userMsg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  },

  watchPosition: (
    onSuccess: (result: GPSResult) => void,
    onError: (err: Error) => void
  ): number | null => {
    if (!('geolocation' in navigator)) {
      onError(new Error("Geolocation is not supported by your browser."));
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 15);

        let accuracyRating: GPSResult['accuracyRating'] = 'high';
        let accuracyLabel = '✓ High accuracy';

        if (accuracy <= 30) {
          accuracyRating = 'high';
          accuracyLabel = '✓ High accuracy';
        } else if (accuracy <= 100) {
          accuracyRating = 'good';
          accuracyLabel = '~ Good accuracy';
        } else {
          accuracyRating = 'limited';
          accuracyLabel = '⚠ Location accuracy is limited';
        }

        const timestampStr = new Date(position.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        onSuccess({
          lat,
          lng,
          accuracy,
          accuracyText: `GPS accuracy: ${accuracy} m`,
          accuracyRating,
          accuracyLabel,
          timestamp: timestampStr
        });
      },
      (error) => {
        onError(new Error(error.message || "GPS tracking error"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  },

  clearWatch: (watchId: number | null): void => {
    if (watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
};
