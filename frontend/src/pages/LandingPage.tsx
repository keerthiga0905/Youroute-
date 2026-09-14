import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Navigation, Clock, Eye, Activity, MapPin, ArrowRight, CheckCircle2, ChevronRight, BarChart, SunMedium } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-500/10 animate-bounce">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Geospatial Safety Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Don't Just Find a Route. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              Find a Safer One.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-gray-300 leading-relaxed font-normal">
            SafeRoute AI analyzes time, environmental lighting, foot traffic, emergency proximity, and historical incident patterns to calculate a <strong>Safety Risk Score</strong> for navigation routes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/plan"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-2xl transition duration-300 flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:scale-105 text-base"
            >
              <Navigation className="w-5 h-5 fill-current" />
              <span>Plan a Safer Route</span>
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-4 glass-panel hover:bg-gray-800 text-white font-bold rounded-2xl transition border border-gray-700 flex items-center justify-center gap-3 text-base"
            >
              <BarChart className="w-5 h-5 text-emerald-400" />
              <span>Explore Data Science</span>
            </Link>
          </div>

          {/* Key Value Metric Badges */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-card p-4 rounded-2xl border border-gray-800">
              <p className="text-2xl font-black text-emerald-400 font-mono">0–100</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Normalized Risk Score</p>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-gray-800">
              <p className="text-2xl font-black text-teal-300 font-mono">20+</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Real-World Safety Features</p>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-gray-800">
              <p className="text-2xl font-black text-amber-400 font-mono">Segment</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Micro-Geospatial Analysis</p>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-gray-800">
              <p className="text-2xl font-black text-blue-400 font-mono">SHAP</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Explainable AI Predictions</p>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">How SafeRoute AI Works</h2>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Traditional navigation optimizes strictly for time and distance. SafeRoute AI adds a multi-dimensional risk layer.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="glass-card p-8 rounded-3xl space-y-4 border border-gray-800/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Segment Risk Heatmap</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Routes are divided into micro-segments. Each segment is evaluated for crime density, road isolation, lighting, and pedestrian activity.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-4 border border-gray-800/80">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Explainable AI</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Transparent predictions. Clear feature importance breakdowns explain exactly why a route was rated low or high risk.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-4 border border-gray-800/80">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Custom Preference Slider</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Choose between <strong>Fastest</strong>, <strong>Balanced</strong>, and <strong>Safest</strong> travel preferences depending on your schedule and needs.
            </p>
          </div>

        </div>
      </section>

      {/* Demonstration Comparison Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-gray-800 space-y-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>The SafeRoute AI Difference</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Choose safety trade-offs with confidence.
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                Save 4 minutes on a dark isolated direct route, or choose a well-lit boulevard with 72% higher safety score and close emergency access?
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span><strong>Route A (Fastest):</strong> 18 min · High Incident Density</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span><strong>Route B (Safest ⭐):</strong> 22 min · Illuminated Boulevard & Low Risk</span>
                </div>
              </div>

              <Link
                to="/plan"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
              >
                <span>Try Route Planner</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Visual Route Preview Card */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-300">Route Analysis Preview</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px]">Route B Recommended</span>
              </div>

              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800/80 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>Route B (Main Boulevard)</span>
                  <span className="text-emerald-400 font-mono">78/100 Safety</span>
                </div>
                <p className="text-xs text-gray-400">22 min · 6.8 km · 🟢 Low Risk</p>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[78%]"></div>
                </div>
              </div>

              <div className="p-4 bg-gray-950/50 rounded-xl border border-gray-800/40 space-y-2 opacity-60">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>Route A (Direct Alley)</span>
                  <span className="text-rose-400 font-mono">24/100 Safety</span>
                </div>
                <p className="text-xs text-gray-400">18 min · 6.2 km · 🔴 High Risk</p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
