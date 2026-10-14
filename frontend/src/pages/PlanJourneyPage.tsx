import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Compass, MapPin, Search, Filter, X, ChevronRight, ArrowRight,
  Calendar, DollarSign, Clock, ExternalLink, CloudSun, Wind, Droplets,
  AlertTriangle, Check, Trash2, Plus, MoveUp, MoveDown, Info, Globe,
  Navigation, CheckCircle2, Bookmark, Heart, Layers, Eye, RefreshCw,
  Share2, Shield, Luggage, Map as MapIcon, SlidersHorizontal
} from 'lucide-react';
import {
  getMoods, getDestinations, getDestinationDetail, getRecommendations,
  getSpiritualDestinations, getDestinationWeather, getFavoriteDestinations,
  addFavoriteDestination, removeFavoriteDestination, getPlannedTrips,
  createPlannedTrip, deletePlannedTrip, getStoredUser
} from '../services/api';
import {
  MoodItem, Destination, DestinationWeatherResponse, PlannedJourneyTrip,
  FavoriteDestinationItem, PlannedJourneyStop
} from '../types';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80";

const SPIRITUAL_SUBCATEGORIES = [
  { id: 'ALL', label: 'All Spiritual Places' },
  { id: 'Amman Temples', label: 'Amman Temples' },
  { id: 'Jyotirlinga Temples', label: 'Jyotirlingas' },
  { id: 'Ancient Temples', label: 'Ancient Temples' },
  { id: 'Murugan Temples', label: 'Murugan Temples' },
  { id: 'Vishnu Temples', label: 'Vishnu Temples' },
  { id: 'Shiva Temples', label: 'Shiva Temples' },
  { id: 'Char Dham Pilgrimage', label: 'Char Dham' },
  { id: 'Buddhist Monasteries', label: 'Buddhist Monasteries' },
  { id: 'Churches and Sacred Christian Sites', label: 'Sacred Churches' },
  { id: 'Mosques and Islamic Heritage Sites', label: 'Islamic Heritage' },
  { id: 'Spiritual Retreats', label: 'Spiritual Retreats' },
];

export const PlanJourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'FAVORITES' | 'MY_TRIPS'>('EXPLORE');

  // Mood Catalog & Selection
  const [moods, setMoods] = useState<MoodItem[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Travel Scope & Filters
  const [travelScope, setTravelScope] = useState<'ALL' | 'DOMESTIC' | 'INTERNATIONAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpiritualSubcat, setSelectedSpiritualSubcat] = useState<string>('ALL');
  const [budgetTier, setBudgetTier] = useState<string>('ALL');
  const [selectedDuration, setSelectedDuration] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<string>('ALL');

  // Data States
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal / Drawer State
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [weatherData, setWeatherData] = useState<DestinationWeatherResponse | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // Multi-Stop Itinerary Builder State
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [itineraryStops, setItineraryStops] = useState<PlannedJourneyStop[]>([]);
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSuccessNotice, setTripSuccessNotice] = useState<string | null>(null);

  // My Trips & Favorites Collections
  const [savedFavorites, setSavedFavorites] = useState<FavoriteDestinationItem[]>([]);
  const [savedTrips, setSavedTrips] = useState<PlannedJourneyTrip[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [isTripsLoading, setIsTripsLoading] = useState(false);

  // Initial load: Moods, Recommendations, Favorites
  useEffect(() => {
    loadMoods();
    loadRecommendations('devotional');
    if (currentUser) {
      loadUserFavorites();
      loadUserTrips();
    }
  }, []);

  // Fetch destinations on filter changes
  useEffect(() => {
    if (activeTab === 'EXPLORE') {
      fetchDestinationsData();
    }
  }, [
    selectedMood, travelScope, selectedSpiritualSubcat,
    budgetTier, selectedDuration, selectedSeason, currentPage, activeTab
  ]);

  const loadMoods = async () => {
    try {
      const data = await getMoods();
      setMoods(data);
    } catch (err) {
      console.error("Failed to load moods:", err);
    }
  };

  const loadRecommendations = async (mood: string) => {
    try {
      const recs = await getRecommendations({
        mood: mood || undefined,
        travel_scope: travelScope !== 'ALL' ? travelScope : undefined,
        limit: 4
      });
      setRecommendations(recs);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    }
  };

  const loadUserFavorites = async () => {
    setIsFavoritesLoading(true);
    try {
      const favs = await getFavoriteDestinations();
      setSavedFavorites(favs);
      setFavoriteIds(new Set(favs.map(f => f.destination_id)));
    } catch (err) {
      console.error("Failed to load user favorites:", err);
    } finally {
      setIsFavoritesLoading(false);
    }
  };

  const loadUserTrips = async () => {
    setIsTripsLoading(true);
    try {
      const trips = await getPlannedTrips();
      setSavedTrips(trips);
    } catch (err) {
      console.error("Failed to load user trips:", err);
    } finally {
      setIsTripsLoading(false);
    }
  };

  const fetchDestinationsData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: any = {
        mood: selectedMood || undefined,
        travel_scope: travelScope !== 'ALL' ? travelScope : undefined,
        sub_category: selectedSpiritualSubcat !== 'ALL' ? selectedSpiritualSubcat : undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        limit: 9
      };

      if (budgetTier === 'Budget') params.max_budget = 1500;
      else if (budgetTier === 'Moderate') { params.min_budget = 1500; params.max_budget = 5000; }
      else if (budgetTier === 'Luxury') params.min_budget = 5000;

      if (selectedDuration !== 'ALL') params.duration = selectedDuration;
      if (selectedSeason !== 'ALL') params.season = selectedSeason;

      const data = await getDestinations(params);
      setDestinations(data.destinations);
      setTotalResults(data.total);

      // Hydrate local favorites set
      const favsInResult = data.destinations.filter(d => d.is_favorite).map(d => d.id);
      if (favsInResult.length > 0) {
        setFavoriteIds(prev => new Set([...Array.from(prev), ...favsInResult]));
      }
    } catch (err: any) {
      setErrorMsg("Failed to load destinations. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDestinationsData();
  };

  const handleMoodSelect = (moodId: string) => {
    if (selectedMood === moodId) {
      setSelectedMood(null);
      loadRecommendations('devotional');
    } else {
      setSelectedMood(moodId);
      setCurrentPage(1);
      loadRecommendations(moodId);
    }
  };

  const handleClearFilters = () => {
    setSelectedMood(null);
    setTravelScope('ALL');
    setSearchQuery('');
    setSelectedSpiritualSubcat('ALL');
    setBudgetTier('ALL');
    setSelectedDuration('ALL');
    setSelectedSeason('ALL');
    setCurrentPage(1);
  };

  // Open Destination Details & Fetch Live Weather
  const handleOpenDetail = async (dest: Destination) => {
    setSelectedDest(dest);
    setIsWeatherLoading(true);
    setWeatherData(null);
    try {
      const w = await getDestinationWeather(dest.id);
      setWeatherData(w);
    } catch (err) {
      console.warn("Could not retrieve live destination weather:", err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (e: React.MouseEvent, dest: Destination) => {
    e.stopPropagation();
    const isFav = favoriteIds.has(dest.id);
    const updated = new Set(favoriteIds);

    try {
      if (isFav) {
        updated.delete(dest.id);
        setFavoriteIds(updated);
        await removeFavoriteDestination(dest.id);
        setSavedFavorites(prev => prev.filter(f => f.destination_id !== dest.id));
      } else {
        updated.add(dest.id);
        setFavoriteIds(updated);
        await addFavoriteDestination(dest.id);
        loadUserFavorites();
      }
    } catch (err) {
      console.error("Failed to update favorite:", err);
      // Revert if error
      if (isFav) updated.add(dest.id);
      else updated.delete(dest.id);
      setFavoriteIds(updated);
    }
  };

  // Connect Destination into RouteMap's Route Planner Workflow
  const handlePlanThisJourney = (dest: Destination) => {
    // 1. Store destination parameters for RouteMap's route planner
    sessionStorage.setItem('plan_journey_dest_lat', String(dest.latitude));
    sessionStorage.setItem('plan_journey_dest_lng', String(dest.longitude));
    sessionStorage.setItem('plan_journey_dest_name', `${dest.name}, ${dest.city}`);

    // 2. Close modal
    setSelectedDest(null);

    // 3. Navigate to HomePage where pre-filled destination immediately engages route workflow
    navigate('/', {
      state: {
        fromPlanJourney: true,
        destinationName: `${dest.name}, ${dest.city}`,
        destinationCoords: { lat: dest.latitude, lng: dest.longitude },
        destinationScope: dest.travel_scope
      }
    });
  };

  // Itinerary Builder functions
  const handleAddToItinerary = (dest: Destination) => {
    const existingIndex = itineraryStops.findIndex(s => s.destination_id === dest.id);
    if (existingIndex >= 0) {
      setIsItineraryOpen(true);
      return;
    }

    const newStop: PlannedJourneyStop = {
      destination_id: dest.id,
      stop_order: itineraryStops.length + 1,
      custom_location_name: `${dest.name}, ${dest.city}`,
      latitude: dest.latitude,
      longitude: dest.longitude,
      stay_duration_hours: 3.0,
      destination: dest
    };

    setItineraryStops([...itineraryStops, newStop]);
    setIsItineraryOpen(true);
  };

  const handleRemoveStop = (index: number) => {
    const updated = itineraryStops.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      stop_order: idx + 1
    }));
    setItineraryStops(updated);
  };

  const handleMoveStop = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= itineraryStops.length) return;

    const copy = [...itineraryStops];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setItineraryStops(copy.map((s, idx) => ({ ...s, stop_order: idx + 1 })));
  };

  // Estimated total distance & duration calculation
  const itineraryStats = useMemo(() => {
    if (itineraryStops.length < 2) {
      return { totalKm: 0, totalHours: 0, count: itineraryStops.length };
    }

    let totalDist = 0;
    for (let i = 1; i < itineraryStops.length; i++) {
      const prev = itineraryStops[i - 1];
      const curr = itineraryStops[i];
      const R = 6371;
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const legKm = (R * c) * 1.25; // 1.25 detour factor for road calculation
      totalDist += legKm;
    }

    const totalHours = totalDist / 50; // avg 50 km/h
    return {
      totalKm: Math.round(totalDist),
      totalHours: Math.round(totalHours * 10) / 10,
      count: itineraryStops.length
    };
  }, [itineraryStops]);

  const handleSaveItinerary = async () => {
    if (!tripTitle.trim()) return;
    setIsSavingTrip(true);
    setTripSuccessNotice(null);

    try {
      await createPlannedTrip({
        title: tripTitle.trim(),
        description: tripDescription.trim() || undefined,
        primary_mood: selectedMood || undefined,
        travel_scope: travelScope !== 'ALL' ? travelScope : 'DOMESTIC',
        stops: itineraryStops.map(s => ({
          destination_id: s.destination_id,
          custom_location_name: s.custom_location_name,
          latitude: s.latitude,
          longitude: s.longitude,
          stop_order: s.stop_order,
          stay_duration_hours: s.stay_duration_hours || 2.0,
          notes: s.notes
        }))
      });

      setTripSuccessNotice("Trip itinerary successfully saved to your RouteMap profile!");
      setTripTitle('');
      setTripDescription('');
      setItineraryStops([]);
      loadUserTrips();
      setTimeout(() => setTripSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error("Save trip error:", err);
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleDeleteSavedTrip = async (tripId: number) => {
    try {
      await deletePlannedTrip(tripId);
      setSavedTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) {
      console.error("Delete trip error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#071C14] text-slate-100 font-sans pb-24 selection:bg-[#D4AF37] selection:text-[#071C14]">
      {/* --------------------------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* --------------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-12 pb-16 bg-gradient-to-b from-[#0B2A1E] via-[#071C14] to-[#071C14] border-b border-[#D4AF37]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#103526] border border-[#D4AF37]/40 text-[#F4D06F] text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-[#F4D06F] animate-pulse" />
              <span>Your Mood. Your Journey. Your World.</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight text-white mb-4 leading-tight">
              Where does your <span className="gold-text-gradient">mood</span> want to take you?
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal mb-8 leading-relaxed">
              Choose your mood. Discover your next journey. Experience soul-stirring temples, tranquil hill retreats, and scenic coastal road trips.
            </p>

            {/* Navigation Switcher Tabs */}
            <div className="inline-flex p-1.5 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/30 shadow-2xl">
              <button
                onClick={() => setActiveTab('EXPLORE')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'EXPLORE'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Explore & Discover</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('FAVORITES');
                  if (currentUser) loadUserFavorites();
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'FAVORITES'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>My Favorites {savedFavorites.length > 0 && `(${savedFavorites.length})`}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('MY_TRIPS');
                  if (currentUser) loadUserTrips();
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'MY_TRIPS'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Luggage className="w-4 h-4" />
                <span>Saved Trips {savedTrips.length > 0 && `(${savedTrips.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT: EXPLORE TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'EXPLORE' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          
          {/* ================================================================= */}
          {/* MODULE 1: MOOD SELECTION GRID */}
          {/* ================================================================= */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-black text-white flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-gradient-to-b from-[#D4AF37] to-[#F4D06F] rounded-full inline-block" />
                  Select Your Travel Mood
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Click any mood to view tailored destinations and smart recommendations.
                </p>
              </div>

              {selectedMood && (
                <button
                  onClick={() => setSelectedMood(null)}
                  className="text-xs font-bold text-[#F4D06F] hover:underline flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Show All Moods</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {moods.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMoodSelect(m.id)}
                    className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col h-44 sm:h-48 ${
                      isSelected
                        ? 'border-[#F4D06F] ring-2 ring-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.4)] scale-[1.03]'
                        : 'border-[#D4AF37]/30 bg-[#0B2A1E]/80 hover:border-[#D4AF37] hover:scale-[1.02]'
                    }`}
                  >
                    {/* Background Photograph */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={m.image_url}
                        alt={m.title}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071C14] via-[#071C14]/60 to-transparent" />
                    </div>

                    {/* Top Badge */}
                    <div className="relative z-10 p-2.5 flex justify-between items-start">
                      {m.badge ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#071C14]/80 text-[#F4D06F] border border-[#D4AF37]/40 backdrop-blur-md">
                          {m.badge}
                        </span>
                      ) : <span />}

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#071C14] shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Content */}
                    <div className="relative z-10 mt-auto p-3 bg-gradient-to-t from-[#071C14] to-transparent">
                      <h3 className={`text-xs sm:text-sm font-bold font-serif leading-tight mb-0.5 ${
                        isSelected ? 'text-[#F4D06F]' : 'text-white group-hover:text-[#F4D06F]'
                      }`}>
                        {m.title}
                      </h3>
                      <p className="text-[10px] text-slate-300 line-clamp-1 opacity-80">
                        {m.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* MODULE 2: DOMESTIC OR INTERNATIONAL SELECTOR & ADVISORY */}
          {/* ================================================================= */}
          <div className="mb-10 bg-[#0B2A1E]/90 border border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F4D06F]" />
                  Choose Travel Scope
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Explore thousands of authentic sacred temples, hill stations across India, or verified international landmarks.
                </p>
              </div>

              {/* Selector Pills */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#071C14] border border-[#D4AF37]/40 self-start md:self-auto">
                <button
                  onClick={() => { setTravelScope('ALL'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    travelScope === 'ALL'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  All Destinations
                </button>
                <button
                  onClick={() => { setTravelScope('DOMESTIC'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    travelScope === 'DOMESTIC'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Explore India (Domestic)
                </button>
                <button
                  onClick={() => { setTravelScope('INTERNATIONAL'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    travelScope === 'INTERNATIONAL'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Explore World (International)
                </button>
              </div>
            </div>

            {/* International Travel Advisory Alert Banner */}
            {travelScope === 'INTERNATIONAL' && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#103526] border border-[#D4AF37]/40 flex items-start gap-3 text-xs text-slate-200">
                <AlertTriangle className="w-4 h-4 text-[#F4D06F] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F4D06F]">International Travel Advisory:</span> Travel inspiration shown is for journey discovery. Please verify visa requirements, minimum 6-month passport validity, entry regulations, and health advisories through official government embassy sources before travel.
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* MODULE 3: DEVOTIONAL & SPIRITUAL SUBCATEGORY FILTER CHIPS */}
          {/* ================================================================= */}
          {(selectedMood === 'devotional' || selectedSpiritualSubcat !== 'ALL') && (
            <div className="mb-10 p-5 rounded-3xl bg-gradient-to-r from-[#0B2A1E] via-[#103526] to-[#0B2A1E] border border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F4D06F]" />
                  <h3 className="text-base font-serif font-bold text-white">
                    Sacred Pilgrimage & Temple Discovery
                  </h3>
                </div>
                <span className="text-[11px] text-[#F4D06F] font-bold">
                  Dravidian Heritage, Jyotirlingas & World Sacred Sites
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {SPIRITUAL_SUBCATEGORIES.map((cat) => {
                  const isCatSelected = selectedSpiritualSubcat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedSpiritualSubcat(cat.id);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCatSelected
                          ? 'bg-[#D4AF37] text-[#071C14] shadow-md scale-105'
                          : 'bg-[#071C14]/80 text-slate-300 border border-[#D4AF37]/30 hover:border-[#F4D06F]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODULE 5 & 6: SEARCH & ADVANCED FILTERS BAR */}
          {/* ================================================================= */}
          <div className="mb-8 bg-[#0B2A1E]/80 border border-[#D4AF37]/30 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              
              {/* Search Box */}
              <div className="md:col-span-5">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search temple, city, state, or destination..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#F4D06F]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); fetchDestinationsData(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              </div>

              {/* Budget Tier Selector */}
              <div className="md:col-span-2">
                <select
                  value={budgetTier}
                  onChange={(e) => { setBudgetTier(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs text-white focus:outline-none focus:border-[#F4D06F]"
                >
                  <option value="ALL">All Budgets</option>
                  <option value="Budget">Budget (&lt; ₹1,500/day)</option>
                  <option value="Moderate">Moderate (₹1,500 – ₹5,000)</option>
                  <option value="Luxury">Luxury (&gt; ₹5,000/day)</option>
                </select>
              </div>

              {/* Duration Selector */}
              <div className="md:col-span-2">
                <select
                  value={selectedDuration}
                  onChange={(e) => { setSelectedDuration(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs text-white focus:outline-none focus:border-[#F4D06F]"
                >
                  <option value="ALL">Any Duration</option>
                  <option value="Day">Day Trip (Half / Full Day)</option>
                  <option value="2-3 Days">Weekend (2-3 Days)</option>
                  <option value="Days">Longer Vacation (3+ Days)</option>
                </select>
              </div>

              {/* Best Season Selector */}
              <div className="md:col-span-2">
                <select
                  value={selectedSeason}
                  onChange={(e) => { setSelectedSeason(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs text-white focus:outline-none focus:border-[#F4D06F]"
                >
                  <option value="ALL">Any Season</option>
                  <option value="October">Winter / Autumn (Oct - Mar)</option>
                  <option value="March">Spring / Summer (Mar - Jun)</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="md:col-span-1 text-right">
                <button
                  onClick={handleClearFilters}
                  title="Clear all filters"
                  className="p-2.5 rounded-xl bg-[#071C14] border border-[#D4AF37]/30 text-slate-300 hover:text-[#F4D06F] hover:border-[#F4D06F] transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Results count & active filter summary */}
            <div className="mt-3 pt-3 border-t border-[#D4AF37]/20 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div>
                Showing <span className="font-bold text-[#F4D06F]">{totalResults}</span> verified destinations
                {selectedMood && <span> in <span className="text-white capitalize">{selectedMood}</span> mood</span>}
                {travelScope !== 'ALL' && <span> • <span className="text-white">{travelScope}</span></span>}
              </div>

              {/* Quick Trip Drawer Opener Badge */}
              <button
                onClick={() => setIsItineraryOpen(true)}
                className="flex items-center gap-2 text-xs font-bold text-[#F4D06F] hover:underline"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Stop Trip Builder ({itineraryStops.length} stops)</span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SMART RECOMMENDATIONS SECTION */}
          {/* ================================================================= */}
          {recommendations.length > 0 && currentPage === 1 && !searchQuery && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-serif font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F4D06F]" />
                  Recommended For You
                </h2>
                <span className="text-xs text-slate-400">Ranked by mood match and popularity</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendations.map((dest) => (
                  <div
                    key={`rec-${dest.id}`}
                    onClick={() => handleOpenDetail(dest)}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0B2A1E] border border-[#D4AF37]/30 hover:border-[#F4D06F] transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={dest.hero_image_url}
                        alt={dest.name}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A1E] via-transparent to-transparent" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#071C14]/90 text-[#F4D06F] border border-[#D4AF37]/40 backdrop-blur-md">
                          {dest.travel_scope === 'DOMESTIC' ? 'India' : dest.country}
                        </span>

                        <button
                          onClick={(e) => handleToggleFavorite(e, dest)}
                          className="p-1.5 rounded-full bg-[#071C14]/80 border border-[#D4AF37]/30 text-white hover:text-red-400 transition"
                        >
                          <Heart className={`w-3.5 h-3.5 ${favoriteIds.has(dest.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>

                      {dest.sub_category && (
                        <div className="absolute bottom-2 left-2.5 text-[10px] font-bold text-[#F4D06F] bg-[#071C14]/80 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                          {dest.sub_category}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold font-serif text-white group-hover:text-[#F4D06F] transition-colors leading-snug mb-1">
                          {dest.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-300 mb-2">
                          <MapPin className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                          <span className="truncate">{dest.city}, {dest.state || dest.country}</span>
                        </div>
                        {dest.why_recommended && (
                          <p className="text-[10px] text-slate-300 bg-[#071C14]/60 p-2 rounded-xl border border-[#D4AF37]/20 line-clamp-2">
                            <span className="text-[#F4D06F] font-bold">Why:</span> {dest.why_recommended}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between">
                        <span className="text-[11px] text-[#F4D06F] font-bold">
                          {dest.approx_cost_per_day_inr ? `₹${dest.approx_cost_per_day_inr}/day` : dest.approx_budget_tier}
                        </span>
                        <span className="text-xs text-[#F4D06F] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* DESTINATIONS GRID */}
          {/* ================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-serif font-black text-white">
                All Curated Destinations
              </h3>
              <span className="text-xs text-slate-400">
                Verified coordinates & tourism archives
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-300">Searching and ranking destinations...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-8 rounded-3xl bg-[#0B2A1E] border border-red-500/40 text-center text-slate-300">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm">{errorMsg}</p>
                <button
                  onClick={fetchDestinationsData}
                  className="mt-4 px-5 py-2 rounded-xl bg-[#D4AF37] text-[#071C14] text-xs font-bold"
                >
                  Retry Search
                </button>
              </div>
            ) : destinations.length === 0 ? (
              <div className="py-16 px-4 text-center rounded-3xl bg-[#0B2A1E]/60 border border-[#D4AF37]/20">
                <Compass className="w-12 h-12 text-[#D4AF37]/60 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">No matching destinations found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  We couldn't find destinations matching your exact filter criteria. Try broadening your budget, season, or mood selection.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => handleOpenDetail(dest)}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0B2A1E] border border-[#D4AF37]/30 hover:border-[#F4D06F] transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col"
                  >
                    {/* Destination Photo Banner */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={dest.hero_image_url}
                        alt={dest.name}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A1E] via-transparent to-transparent" />

                      {/* Header overlay badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#071C14]/90 text-[#F4D06F] border border-[#D4AF37]/40 backdrop-blur-md">
                          {dest.travel_scope === 'DOMESTIC' ? 'India' : dest.country}
                        </span>

                        <button
                          onClick={(e) => handleToggleFavorite(e, dest)}
                          className="p-2 rounded-full bg-[#071C14]/80 border border-[#D4AF37]/30 text-white hover:text-red-400 transition"
                        >
                          <Heart className={`w-4 h-4 ${favoriteIds.has(dest.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-white bg-[#071C14]/85 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                          {dest.category}
                        </span>
                        {dest.sub_category && (
                          <span className="text-[10px] font-bold text-[#F4D06F] bg-[#071C14]/85 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                            {dest.sub_category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-bold font-serif text-white group-hover:text-[#F4D06F] transition-colors leading-snug mb-1">
                          {dest.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                          <span className="truncate">{dest.city}, {dest.state ? `${dest.state}, ` : ''}{dest.country}</span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                          {dest.description}
                        </p>
                      </div>

                      <div>
                        {/* Meta tags: season, duration, budget */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-[#071C14]/70 p-2.5 rounded-xl border border-[#D4AF37]/20 mb-3.5">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Best Season</span>
                            <span className="font-semibold text-white truncate block">{dest.best_season || 'Year-round'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Typical Time</span>
                            <span className="font-semibold text-white truncate block">{dest.typical_duration || '1-2 Days'}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlanThisJourney(dest);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition"
                          >
                            <Navigation className="w-3 h-3 fill-[#071C14]" />
                            <span>Plan Journey</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToItinerary(dest);
                            }}
                            className="p-1.5 text-slate-300 hover:text-[#F4D06F] rounded-lg border border-[#D4AF37]/30 hover:border-[#F4D06F] transition"
                            title="Add to Multi-Stop Itinerary"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalResults > 9 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-4 py-2 rounded-xl bg-[#0B2A1E] border border-[#D4AF37]/30 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#F4D06F]"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-300 font-bold">
                  Page {currentPage} of {Math.ceil(totalResults / 9)}
                </span>
                <button
                  disabled={currentPage >= Math.ceil(totalResults / 9)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-[#0B2A1E] border border-[#D4AF37]/30 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#F4D06F]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* FAVORITES VIEW TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'FAVORITES' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-black text-white flex items-center gap-2.5">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              My Saved Favorites
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Your bookmarked spiritual shrines, sacred temples, and dream travel escapes.
            </p>
          </div>

          {isFavoritesLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-300">Loading your favorites...</p>
            </div>
          ) : savedFavorites.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#0B2A1E]/80 border border-[#D4AF37]/30 max-w-xl mx-auto">
              <Bookmark className="w-12 h-12 text-[#D4AF37]/50 mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-white mb-2">No Saved Destinations Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                Browse our curated collection of temples, hill stations, and heritage monuments. Click the heart icon on any card to save it here.
              </p>
              <button
                onClick={() => setActiveTab('EXPLORE')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedFavorites.map((fav) => {
                const dest = fav.destination;
                return (
                  <div
                    key={`fav-${fav.id}`}
                    onClick={() => handleOpenDetail(dest)}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0B2A1E] border border-[#D4AF37]/30 hover:border-[#F4D06F] transition-all shadow-lg flex flex-col"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={dest.hero_image_url}
                        alt={dest.name}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A1E] via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={(e) => handleToggleFavorite(e, dest)}
                          className="p-2 rounded-full bg-[#071C14]/80 border border-[#D4AF37]/30 text-red-500 fill-red-500 hover:scale-110 transition"
                        >
                          <Heart className="w-4 h-4 fill-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-serif font-bold text-white group-hover:text-[#F4D06F] mb-1">
                          {dest.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{dest.city}, {dest.state || dest.country}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanThisJourney(dest);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3 fill-[#071C14]" />
                          <span>Plan Route</span>
                        </button>
                        <span className="text-xs text-[#F4D06F] font-bold">View Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SAVED TRIPS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'MY_TRIPS' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-black text-white flex items-center gap-2.5">
                <Luggage className="w-6 h-6 text-[#F4D06F]" />
                My Planned Journey Itineraries
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Multi-stop pilgrimage circuits and holiday road itineraries.
              </p>
            </div>

            <button
              onClick={() => setIsItineraryOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Itinerary</span>
            </button>
          </div>

          {isTripsLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-300">Loading your itineraries...</p>
            </div>
          ) : savedTrips.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#0B2A1E]/80 border border-[#D4AF37]/30 max-w-xl mx-auto">
              <Layers className="w-12 h-12 text-[#D4AF37]/50 mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-white mb-2">No Saved Trips Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                Build your first multi-stop itinerary (e.g. Coimbatore → Palani Murugan Temple → Meenakshi Amman Temple → Rameswaram).
              </p>
              <button
                onClick={() => setIsItineraryOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold"
              >
                Build Multi-Stop Trip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedTrips.map((trip) => (
                <div
                  key={`trip-${trip.id}`}
                  className="rounded-3xl bg-[#0B2A1E] border border-[#D4AF37]/30 p-6 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4D06F] bg-[#071C14] px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                          {trip.travel_scope} • {trip.status}
                        </span>
                        <h4 className="text-lg font-serif font-bold text-white mt-1.5">
                          {trip.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleDeleteSavedTrip(trip.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-red-400/40 transition"
                        title="Delete itinerary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {trip.description && (
                      <p className="text-xs text-slate-300 mb-4">{trip.description}</p>
                    )}

                    {/* Itinerary Summary Metrics */}
                    <div className="grid grid-cols-3 gap-2.5 bg-[#071C14] p-3 rounded-2xl border border-[#D4AF37]/20 text-xs mb-4">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Stops</span>
                        <span className="font-bold text-[#F4D06F]">{trip.stops?.length || 0} stops</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Est. Distance</span>
                        <span className="font-bold text-white">{trip.total_distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Est. Driving</span>
                        <span className="font-bold text-white">{Math.round((trip.total_duration_mins / 60) * 10) / 10} hrs</span>
                      </div>
                    </div>

                    {/* Ordered Stops List */}
                    <div className="space-y-2 mb-4">
                      {trip.stops?.map((stop, idx) => (
                        <div
                          key={`stop-${stop.id || idx}`}
                          className="flex items-center gap-2.5 text-xs text-slate-200 bg-[#103526]/60 px-3 py-2 rounded-xl border border-[#D4AF37]/20"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#071C14] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium">{stop.custom_location_name}</span>
                          {stop.distance_from_prev_km && stop.distance_from_prev_km > 0 ? (
                            <span className="ml-auto text-[10px] text-slate-400">+{stop.distance_from_prev_km} km</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Route Plan trigger for first stop */}
                  {trip.stops && trip.stops.length > 0 && (
                    <div className="pt-3 border-t border-[#D4AF37]/20 flex justify-end">
                      <button
                        onClick={() => {
                          const firstStop = trip.stops[0];
                          sessionStorage.setItem('plan_journey_dest_lat', String(firstStop.latitude));
                          sessionStorage.setItem('plan_journey_dest_lng', String(firstStop.longitude));
                          sessionStorage.setItem('plan_journey_dest_name', firstStop.custom_location_name || 'Trip Stop');
                          navigate('/');
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold flex items-center gap-2"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-[#071C14]" />
                        <span>Plan Route to First Stop</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODULE 7: DESTINATION DETAILS MODAL / DRAWER */}
      {/* --------------------------------------------------------------------- */}
      {selectedDest && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#0B2A1E] border border-[#D4AF37]/40 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header & Hero Image */}
            <div className="relative h-60 sm:h-72 flex-shrink-0">
              <img
                src={selectedDest.hero_image_url}
                alt={selectedDest.name}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A1E] via-[#0B2A1E]/40 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedDest(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-[#071C14]/80 border border-[#D4AF37]/40 text-white hover:text-[#F4D06F] transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Meta Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#071C14]/90 text-[#F4D06F] border border-[#D4AF37]/40 backdrop-blur-md">
                  {selectedDest.travel_scope === 'DOMESTIC' ? 'India' : selectedDest.country}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#071C14]/90 text-white border border-[#D4AF37]/40 backdrop-blur-md">
                  {selectedDest.category}
                </span>
              </div>

              {/* Title & Location Banner */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-white leading-tight">
                  {selectedDest.name}
                </h3>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 mt-1">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>{selectedDest.city}, {selectedDest.state ? `${selectedDest.state}, ` : ''}{selectedDest.country}</span>
                  {selectedDest.sub_category && (
                    <span className="text-[#F4D06F] font-bold">• {selectedDest.sub_category}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              
              {/* Live Weather Widget */}
              <div className="p-4 rounded-2xl bg-[#071C14] border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CloudSun className="w-8 h-8 text-[#F4D06F]" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Destination Live Weather</span>
                    {isWeatherLoading ? (
                      <span className="text-xs text-slate-300">Contacting weather station...</span>
                    ) : weatherData?.weather ? (
                      <div className="flex items-center gap-3 text-xs text-white">
                        <span className="text-base font-bold text-[#F4D06F]">
                          {weatherData.weather.temperature}°C
                        </span>
                        <span>{weatherData.weather.condition}</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-3 h-3" /> {weatherData.weather.wind_speed} km/h
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> {weatherData.weather.humidity}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Weather data temporarily offline</span>
                    )}
                  </div>
                </div>

                {weatherData?.weather?.warning && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/30">
                    ⚠ {weatherData.weather.warning}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-serif font-bold text-white mb-2">Overview & Cultural Context</h4>
                <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                  {selectedDest.description}
                </p>
              </div>

              {/* Why Recommended */}
              {selectedDest.why_recommended && (
                <div className="p-3.5 rounded-2xl bg-[#103526] border border-[#D4AF37]/30 text-slate-200">
                  <span className="font-bold text-[#F4D06F]">Why It Matches:</span> {selectedDest.why_recommended}
                </div>
              )}

              {/* Travel Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#071C14] p-4 rounded-2xl border border-[#D4AF37]/20 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Best Season</span>
                  <span className="font-bold text-white">{selectedDest.best_season || 'Year-round'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Visit Duration</span>
                  <span className="font-bold text-white">{selectedDest.typical_duration || '1-2 Days'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Daily Budget</span>
                  <span className="font-bold text-[#F4D06F]">
                    {selectedDest.approx_cost_per_day_inr ? `₹${selectedDest.approx_cost_per_day_inr}` : selectedDest.approx_budget_tier}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Verified GPS</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {selectedDest.latitude.toFixed(3)}, {selectedDest.longitude.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Timings & Accessibility */}
              <div className="space-y-2 text-xs text-slate-300">
                {selectedDest.opening_hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Opening Hours:</span> {selectedDest.opening_hours}
                    </div>
                  </div>
                )}
                {selectedDest.accessibility_info && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Accessibility:</span> {selectedDest.accessibility_info}
                    </div>
                  </div>
                )}
                {selectedDest.source_attribution && (
                  <div className="flex items-start gap-2 text-[11px] text-slate-400">
                    <Info className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <span>Verified Source: {selectedDest.source_attribution}</span>
                  </div>
                )}
              </div>

              {/* External Official Website Link */}
              {selectedDest.official_website_url && (
                <div className="pt-2">
                  <a
                    href={selectedDest.official_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#F4D06F] hover:underline font-bold"
                  >
                    <span>Visit Official Tourism Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 sm:p-5 bg-[#071C14] border-t border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleFavorite(e, selectedDest)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-xs font-bold text-white flex items-center gap-2 hover:border-[#F4D06F] transition"
                >
                  <Heart className={`w-4 h-4 ${favoriteIds.has(selectedDest.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{favoriteIds.has(selectedDest.id) ? 'In Favorites' : 'Save to Favorites'}</span>
                </button>

                <button
                  onClick={() => {
                    handleAddToItinerary(selectedDest);
                    setSelectedDest(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-xs font-bold text-white flex items-center gap-2 hover:border-[#F4D06F] transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Trip</span>
                </button>
              </div>

              {/* PRIMARY ACTION: Plan This Journey */}
              <button
                onClick={() => handlePlanThisJourney(selectedDest)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition"
              >
                <Navigation className="w-4 h-4 fill-[#071C14]" />
                <span>Plan This Journey in RouteMap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODULE 9: MULTI-STOP ITINERARY BUILDER DRAWER */}
      {/* --------------------------------------------------------------------- */}
      {isItineraryOpen && (
        <div className="fixed inset-0 z-[1250] flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-[#0B2A1E] border-l border-[#D4AF37]/40 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20 mb-5">
                <div>
                  <h3 className="text-lg font-serif font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#F4D06F]" />
                    Multi-Stop Journey Planner
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order consecutive pilgrimage stops and calculate road travel.
                  </p>
                </div>
                <button
                  onClick={() => setIsItineraryOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {tripSuccessNotice && (
                <div className="mb-4 p-3 rounded-xl bg-[#103526] border border-[#D4AF37]/50 text-xs text-[#F4D06F] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{tripSuccessNotice}</span>
                </div>
              )}

              {/* Trip Title & Description inputs */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Trip Name</label>
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g. Tamil Nadu Temple Circuit"
                    className="w-full px-3 py-2 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#F4D06F]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Notes / Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={tripDescription}
                    onChange={(e) => setTripDescription(e.target.value)}
                    placeholder="Weekend family pilgrimage with morning darshan"
                    className="w-full px-3 py-2 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#F4D06F]"
                  />
                </div>
              </div>

              {/* Stops List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">Stops in Journey ({itineraryStops.length})</span>
                  <span className="text-[11px] text-slate-400">Reorder with arrows</span>
                </div>

                {itineraryStops.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#071C14] border border-[#D4AF37]/20 text-center text-xs text-slate-400">
                    No stops added yet. Click "+ Add to Trip" on any destination card to build your route!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {itineraryStops.map((stop, index) => (
                      <div
                        key={`drawer-stop-${index}`}
                        className="p-3 rounded-2xl bg-[#071C14] border border-[#D4AF37]/30 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#071C14] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-white truncate">{stop.custom_location_name}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveStop(index, 'UP')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={index === itineraryStops.length - 1}
                            onClick={() => handleMoveStop(index, 'DOWN')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveStop(index)}
                            className="p-1 text-slate-400 hover:text-red-400"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cumulative Estimates Summary */}
              {itineraryStops.length >= 2 && (
                <div className="p-4 rounded-2xl bg-[#103526] border border-[#D4AF37]/40 text-xs text-slate-200 mb-6 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Estimated Total Road Distance:</span>
                    <span className="font-bold text-white">{itineraryStats.totalKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Estimated Travel Time:</span>
                    <span className="font-bold text-[#F4D06F]">~{itineraryStats.totalHours} hrs</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-[#D4AF37]/20">
                    *Road distance includes highway route detour factors (~1.25x haversine). Final routing calculated upon navigation.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#D4AF37]/20 space-y-2">
              <button
                disabled={!tripTitle.trim() || itineraryStops.length === 0 || isSavingTrip}
                onClick={handleSaveItinerary}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isSavingTrip ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Itinerary...</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 fill-[#071C14]" />
                    <span>Save Itinerary to Account</span>
                  </>
                )}
              </button>

              {itineraryStops.length > 0 && (
                <button
                  onClick={() => {
                    const firstStop = itineraryStops[0];
                    sessionStorage.setItem('plan_journey_dest_lat', String(firstStop.latitude));
                    sessionStorage.setItem('plan_journey_dest_lng', String(firstStop.longitude));
                    sessionStorage.setItem('plan_journey_dest_name', firstStop.custom_location_name || 'Stop 1');
                    setIsItineraryOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-2 rounded-xl bg-[#071C14] border border-[#D4AF37]/40 text-xs font-bold text-white hover:text-[#F4D06F] flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Transfer First Leg to RouteMap</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanJourneyPage;
