import React from 'react';
import { HelpCircle, ShieldCheck, AlertTriangle, Lock, BookOpen } from 'lucide-react';

export const HelpAboutPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-red-600" />
          <span>Help & About SafeRoute Tamil Nadu</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Understanding how SafeRoute calculates route risk estimates and protects your privacy.
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        
        {/* Section 1: How SafeRoute Works */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            How SafeRoute Works
          </h2>
          <p>
            SafeRoute evaluates candidate road navigation paths between your origin and destination across Tamil Nadu. Rather than treating an entire route as one point, SafeRoute divides the path into road segments and analyzes contextual factors such as:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2 font-medium">
            <li>Historical incident density along Tamil Nadu road corridors</li>
            <li>Street illumination and municipal lighting node density</li>
            <li>Verified accident blackspots from MoRTH census</li>
            <li>District crime safety indices from TN State Crime Records Bureau</li>
            <li>Flood risks and active road construction detours</li>
          </ul>
        </div>

        {/* Section 2: Data Quality Ratings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            Data Quality Ratings (High vs. Medium)
          </h2>
          <p>
            In locations where specific municipal lighting or incident datasets are unavailable, SafeRoute does <strong>NOT</strong> assume the area is automatically safe. Instead, the segment data confidence is lowered to <em>Medium</em> or <em>Low</em>.
          </p>
        </div>

        {/* Section 3: Responsible Safety Notice */}
        <div className="p-6 bg-red-50/60 rounded-3xl border border-red-100 space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-extrabold text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Responsible Safety Notice</span>
          </div>
          <p>
            SafeRoute provides statistical route-risk estimates derived from historical and contextual information. It cannot predict individual spontaneous incidents or guarantee personal safety. Always exercise personal situational awareness.
          </p>
        </div>

        {/* Section 4: Privacy */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2 text-xs text-slate-700">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-600" />
            Privacy & Data Controls
          </h2>
          <p>
            Your location data is processed securely to analyze routes. You can clear your trip history or delete your account at any time from the Profile page.
          </p>
        </div>

      </div>

    </div>
  );
};
