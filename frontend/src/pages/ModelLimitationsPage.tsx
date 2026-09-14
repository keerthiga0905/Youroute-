import React from 'react';
import { AlertCircle, ShieldAlert, BookOpen, Scale, FileText } from 'lucide-react';

export const ModelLimitationsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <span>Model Methodology, Bias & Limitations</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Transparent documentation on historical data bias, model boundaries, and responsible safety practices.
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-gray-300 leading-relaxed">
        
        <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-3">
          <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            1. Reported Crime vs. Actual Crime Bias
          </h2>
          <p className="text-gray-300">
            Historical crime datasets rely heavily on official law enforcement incident logs. However, reported crime is not identical to actual crime. Certain neighborhoods may experience higher reporting density due to increased police presence, commercial activity, or civic reporting habits, whereas other areas might be under-reported.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-3">
          <h2 className="text-base font-bold text-blue-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            2. Cold-Start & Missing Data Handling
          </h2>
          <p className="text-gray-300">
            In areas where specific environmental sensors (such as municipal street light databases or live camera feeds) are unavailable, SafeRoute AI does NOT assume the area is automatically safe. Instead, the model flags the feature as <code>unknown</code>, applies neutral median imputations, and explicitly reduces the <strong>Prediction Confidence</strong> rating (e.g. down to 60-75%).
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-3">
          <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            3. Non-Discriminatory Machine Learning Policy
          </h2>
          <p className="text-gray-300">
            SafeRoute AI models strictly exclude protected personal characteristics (such as race, ethnicity, income, or demographic identity). Feature vectors consist exclusively of objective spatial, temporal, physical infrastructure, and environmental factors.
          </p>
        </div>

        <div className="p-6 bg-gray-900 rounded-3xl border border-gray-800 text-xs text-gray-400 space-y-2">
          <p className="font-bold text-white uppercase tracking-wider">Responsible AI Principles</p>
          <p>
            This application provides statistical risk predictions derived from contextual data. It cannot predict individual spontaneous human behavior or guarantee personal safety. Always exercise situational awareness.
          </p>
        </div>

      </div>

    </div>
  );
};
