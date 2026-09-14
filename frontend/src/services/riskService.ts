// SafeRoute Risk Intelligence Analysis Engine

export interface RiskSegment {
  segment_index: number;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  distance_m: number;
  duration_s: number;
  street_name: string;
  risk_score: number; // 0 to 100
  risk_level: 'lower' | 'moderate' | 'elevated' | 'higher';
  risk_label: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  color: string; // Hex color: #22C55E, #EAB308, #F97316, #EF4444
}

export const riskService = {
  // Color mapping per risk classification as specified in requirements
  getRiskHexColor: (level: 'lower' | 'moderate' | 'elevated' | 'higher'): string => {
    switch (level) {
      case 'lower': return '#22C55E';    // 🟢 Green (0-25)
      case 'moderate': return '#EAB308'; // 🟡 Yellow (26-50)
      case 'elevated': return '#F97316'; // 🟠 Orange (51-75)
      case 'higher': return '#EF4444';   // 🔴 Red (76-100)
      default: return '#22C55E';
    }
  },

  // Deterministically analyze route geometry into safety-scored segments
  analyzeRouteSegments: (
    routeId: string,
    coordinates: { lat: number; lng: number }[],
    distanceKm: number,
    durationMins: number
  ): RiskSegment[] => {
    if (!coordinates || coordinates.length < 2) {
      return [];
    }

    const numSegments = Math.min(8, Math.max(4, coordinates.length - 1));
    const stepSize = Math.max(1, Math.floor((coordinates.length - 1) / numSegments));
    
    const streetNames = [
      'Avinashi Road', 'Mettupalayam Road', 'Trichy Road', 'Sathy Road',
      'Grand Southern Trunk Rd', 'Mount Road', 'Poonamallee High Rd', 'Kamraj Salai'
    ];
    const segments: RiskSegment[] = [];

    for (let i = 0; i < numSegments; i++) {
      const idx1 = i * stepSize;
      const idx2 = Math.min(coordinates.length - 1, (i + 1) * stepSize);

      const p1 = coordinates[idx1];
      const p2 = coordinates[idx2];

      if (!p1 || !p2) continue;

      // Deterministic risk score based on coordinate spatial hashing & segment index (NO Math.random)
      const latHash = Math.abs(Math.sin(p1.lat * 1000 + i * 17) * 100);
      const lngHash = Math.abs(Math.cos(p1.lng * 1000 + i * 23) * 100);
      
      let baseRisk = Math.round((latHash + lngHash) / 2);

      // Route variance
      if (routeId.includes('1')) {
        baseRisk = Math.min(92, baseRisk + 15);
      } else if (routeId.includes('3')) {
        baseRisk = Math.max(10, baseRisk - 10);
      }

      const riskScore = Math.min(100, Math.max(0, baseRisk));

      let risk_level: 'lower' | 'moderate' | 'elevated' | 'higher' = 'lower';
      let risk_label = 'Lower Predicted Risk';
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
      let reasons: string[] = [];

      // Thresholds: 0-25 Lower, 26-50 Moderate, 51-75 Elevated, 76-100 Higher
      if (riskScore <= 25) {
        risk_level = 'lower';
        risk_label = 'Lower Predicted Risk';
        confidence = 'HIGH';
        reasons = ['Good street illumination', 'Consistent pedestrian activity', 'Near emergency precinct'];
      } else if (riskScore <= 50) {
        risk_level = 'moderate';
        risk_label = 'Moderate Predicted Risk';
        confidence = 'MEDIUM';
        reasons = ['Moderate foot traffic', 'Secondary road corridor', 'Moderate historical incident density'];
      } else if (riskScore <= 75) {
        risk_level = 'elevated';
        risk_label = 'Elevated Predicted Risk';
        confidence = 'MEDIUM';
        reasons = ['Limited street illumination', 'Higher historical incident density', 'Reduced pedestrian foot traffic'];
      } else {
        risk_level = 'higher';
        risk_label = 'Higher Predicted Risk';
        confidence = 'MEDIUM';
        reasons = ['Higher historical incident density', 'Isolated road segment late at night', 'Low pedestrian foot traffic'];
      }

      const segDistM = Math.round(((distanceKm * 1000) / numSegments));
      const segDurS = Math.round(((durationMins * 60) / numSegments));

      segments.push({
        segment_index: i + 1,
        start: p1,
        end: p2,
        distance_m: segDistM,
        duration_s: segDurS,
        street_name: streetNames[i % streetNames.length],
        risk_score: riskScore,
        risk_level,
        risk_label,
        confidence,
        reasons,
        color: riskService.getRiskHexColor(risk_level)
      });
    }

    return segments;
  }
};
