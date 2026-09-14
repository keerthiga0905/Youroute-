import { RouteOptionConsumer } from '../types';

export type UserPreference = 'fastest' | 'balanced' | 'lower_risk' | 'safer';

export const routeRankingService = {
  // Deterministic route ranking & reordering based on preference
  rankRoutes: (
    routes: RouteOptionConsumer[],
    preference: UserPreference = 'balanced'
  ): RouteOptionConsumer[] => {
    if (!routes || routes.length === 0) return [];
    if (routes.length === 1) return routes;

    // Extract min/max metrics for normalization
    const times = routes.map(r => r.duration_minutes);
    const distances = routes.map(r => r.distance_km);
    const safetyScores = routes.map(r => r.safety_indicator ?? (100 - (r.risk_score || 50)));

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times) || minTime + 1;

    const minDist = Math.min(...distances);
    const maxDist = Math.max(...distances) || minDist + 1;

    const minSafety = Math.min(...safetyScores);
    const maxSafety = Math.max(...safetyScores) || minSafety + 1;

    const scoredRoutes = routes.map((route) => {
      const time = route.duration_minutes;
      const dist = route.distance_km;
      const safety = route.safety_indicator ?? (100 - (route.risk_score || 50));

      // Normalized metrics (0 to 1, higher is better)
      const normTime = maxTime === minTime ? 1.0 : (maxTime - time) / (maxTime - minTime);
      const normDist = maxDist === minDist ? 1.0 : (maxDist - dist) / (maxDist - minDist);
      const normSafety = maxSafety === minSafety ? 1.0 : (safety - minSafety) / (maxSafety - minSafety);

      let compositeScore = 0;

      if (preference === 'fastest') {
        // Prioritize travel time (80% time, 20% safety)
        compositeScore = 0.80 * normTime + 0.15 * normDist + 0.05 * normSafety;
      } else if (preference === 'safer' || preference === 'lower_risk') {
        // Prioritize safety (75% safety, 20% time, 5% distance)
        compositeScore = 0.75 * normSafety + 0.20 * normTime + 0.05 * normDist;
      } else {
        // Balanced score: 55% safety, 30% time, 15% distance
        compositeScore = 0.55 * normSafety + 0.30 * normTime + 0.15 * normDist;
      }

      return {
        route,
        compositeScore
      };
    });

    // Sort descending by compositeScore
    scoredRoutes.sort((a, b) => b.compositeScore - a.compositeScore);

    // Flag the top route as recommended
    return scoredRoutes.map((item, idx) => ({
      ...item.route,
      recommended: idx === 0
    }));
  }
};
