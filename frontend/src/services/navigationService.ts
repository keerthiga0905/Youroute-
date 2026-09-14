// Real-time Navigation Service Engine

let lastSpokenInstruction: string | null = null;

export const navigationService = {
  // Voice Guidance SpeechSynthesis Manager
  speakInstruction: (text: string, force = false): void => {
    if (!('speechSynthesis' in window) || !text) return;

    // Prevent repeated announcements of identical maneuver text
    if (!force && lastSpokenInstruction === text) return;

    try {
      window.speechSynthesis.cancel(); // Stop active utterance before new maneuver instruction
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Clear natural speed
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN'; // Indian English pronunciation for Tamil Nadu streets
      
      lastSpokenInstruction = text;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis notice:", e);
    }
  },

  // Reset voice memory when starting a new navigation session
  resetVoice: (): void => {
    lastSpokenInstruction = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  // Calculate straight-line distance in meters between two lat/lng coordinates (Haversine)
  getDistanceMeters: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Calculate perpendicular distance in meters from user position to a line segment (for off-route detection)
  distanceToSegmentMeters: (
    pLat: number, pLng: number,
    aLat: number, aLng: number,
    bLat: number, bLng: number
  ): number => {
    const dAB = navigationService.getDistanceMeters(aLat, aLng, bLat, bLng);
    if (dAB === 0) return navigationService.getDistanceMeters(pLat, pLng, aLat, aLng);

    const dAP = navigationService.getDistanceMeters(aLat, aLng, pLat, pLng);
    const dBP = navigationService.getDistanceMeters(bLat, bLng, pLat, pLng);

    // If point proj is past A or B, return distance to endpoints
    if (dAP * dAP > dBP * dBP + dAB * dAB) return dBP;
    if (dBP * dBP > dAP * dAP + dAB * dAB) return dAP;

    // Standard perpendicular approximation
    const s = (dAP + dBP + dAB) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - dAP) * (s - dBP) * (s - dAB)));
    return (2 * area) / dAB;
  },

  // Calculate live ETA arrival clock time (e.g. "8:42 PM")
  calculateEtaTime: (remainingMins: number): string => {
    const now = new Date();
    const eta = new Date(now.getTime() + Math.max(0, remainingMins) * 60 * 1000);
    return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // Format meters / km string (e.g. "350 m" or "4.2 km")
  formatDistanceString: (distanceKm: number): string => {
    if (distanceKm < 1.0) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }
};
