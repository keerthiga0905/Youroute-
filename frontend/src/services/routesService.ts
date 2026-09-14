// Google Routes & Directions API Service Module

export interface RouteGeometryStep {
  step_index: number;
  instruction: string;
  distance_m: number;
  duration_s: number;
  street_name: string;
  maneuver: 'depart' | 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'roundabout' | 'arrive';
}

export interface CalculatedRouteResult {
  id: string;
  name: string;
  summary: string;
  distance_km: number;
  duration_minutes: number;
  coordinates: { lat: number; lng: number }[];
  steps: RouteGeometryStep[];
}

export const routesService = {
  // Real driving route calculation via Google Directions API / OSRM routing engine
  calculateDrivingRoutes: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode = 'DRIVING'
  ): Promise<CalculatedRouteResult[]> => {
    try {
      // 1. Google Directions Service (if Google Maps API is loaded)
      if (
        typeof window !== 'undefined' &&
        window.google &&
        window.google.maps &&
        window.google.maps.DirectionsService
      ) {
        const directionsService = new window.google.maps.DirectionsService();
        const mode = travelMode === 'walking'
          ? window.google.maps.TravelMode.WALKING
          : (travelMode === 'bicycling' ? window.google.maps.TravelMode.BICYCLING : window.google.maps.TravelMode.DRIVING);

        const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin: { lat: origin.lat, lng: origin.lng },
              destination: { lat: destination.lat, lng: destination.lng },
              travelMode: mode,
              provideRouteAlternatives: true
            },
            (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                reject(new Error(`Directions API status: ${status}`));
              }
            }
          );
        });

        if (response && response.routes && response.routes.length > 0) {
          return response.routes.map((gRoute, rIdx) => {
            const leg = gRoute.legs[0];
            const distKm = Math.round((leg.distance?.value || 1000) / 100) / 10;
            const durMins = Math.round((leg.duration?.value || 600) / 60);

            // Extract detailed polyline path coordinates
            const coordinates: { lat: number; lng: number }[] = (gRoute.overview_path || []).map(p => ({
              lat: p.lat(),
              lng: p.lng()
            }));

            // Extract turn-by-turn steps
            const steps: RouteGeometryStep[] = (leg.steps || []).map((step, sIdx) => {
              const cleanInstruction = (step.instructions || '')
                .replace(/<[^>]*>?/gm, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              let maneuver: RouteGeometryStep['maneuver'] = 'straight';
              const lowInst = cleanInstruction.toLowerCase();
              if (sIdx === 0) maneuver = 'depart';
              else if (sIdx === leg.steps.length - 1) maneuver = 'arrive';
              else if (lowInst.includes('left')) maneuver = 'turn-left';
              else if (lowInst.includes('right')) maneuver = 'turn-right';
              else if (lowInst.includes('roundabout')) maneuver = 'roundabout';

              return {
                step_index: sIdx + 1,
                instruction: cleanInstruction || `Head toward destination step ${sIdx + 1}`,
                distance_m: step.distance?.value || 400,
                duration_s: step.duration?.value || 60,
                street_name: cleanInstruction.split('onto ')[1] || cleanInstruction.split('on ')[1] || 'Corridor',
                maneuver
              };
            });

            return {
              id: `route_${rIdx + 1}`,
              name: `Route ${rIdx + 1} (${gRoute.summary || 'Corridor'})`,
              summary: gRoute.summary ? `Via ${gRoute.summary}` : `Direct Route ${rIdx + 1}`,
              distance_km: distKm,
              duration_minutes: durMins,
              coordinates,
              steps
            };
          });
        }
      }

      // 2. OSRM Public Routing Fallback Engine
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data && data.routes && data.routes.length > 0) {
        return data.routes.map((oRoute: any, rIdx: number) => {
          const distKm = Math.round((oRoute.distance || 1000) / 100) / 10;
          const durMins = Math.round((oRoute.duration || 600) / 60);

          const coordinates = (oRoute.geometry?.coordinates || []).map((pt: [number, number]) => ({
            lat: pt[1],
            lng: pt[0]
          }));

          const steps: RouteGeometryStep[] = (oRoute.legs?.[0]?.steps || []).map((st: any, sIdx: number) => {
            const streetName = st.name || 'Corridor';
            let maneuver: RouteGeometryStep['maneuver'] = 'straight';
            const mType = st.maneuver?.type || '';
            const modifier = st.maneuver?.modifier || '';

            if (sIdx === 0) maneuver = 'depart';
            else if (mType.includes('arrive')) maneuver = 'arrive';
            else if (modifier.includes('left')) maneuver = 'turn-left';
            else if (modifier.includes('right')) maneuver = 'turn-right';

            const instruction = st.maneuver?.instruction ||
              (maneuver === 'turn-left' ? `Turn left onto ${streetName}` : (maneuver === 'turn-right' ? `Turn right onto ${streetName}` : `Continue on ${streetName}`));

            return {
              step_index: sIdx + 1,
              instruction,
              distance_m: Math.round(st.distance || 300),
              duration_s: Math.round(st.duration || 45),
              street_name: streetName,
              maneuver
            };
          });

          return {
            id: `route_${rIdx + 1}`,
            name: `Route ${rIdx + 1} (${oRoute.legs?.[0]?.summary || 'Corridor'})`,
            summary: `Via ${oRoute.legs?.[0]?.summary || 'Corridor'}`,
            distance_km: distKm,
            duration_minutes: durMins,
            coordinates,
            steps
          };
        });
      }
    } catch (e: any) {
      console.warn("Routes service notice:", e);
      throw new Error(e.message || "No route could be calculated between these locations.");
    }

    throw new Error("No route could be calculated between these locations.");
  }
};
