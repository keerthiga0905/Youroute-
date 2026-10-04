import React, { useState, useEffect, useRef } from 'react';

export type WeatherCondition = 'Clear' | 'Sunny' | 'Cloudy' | 'Rain' | 'Heavy Rain' | 'Thunderstorm' | 'Fog' | 'Mist';

interface WeatherBackgroundProps {
  condition?: string;
  defaultImage?: string;
  children?: React.ReactNode;
}

const WEATHER_MEDIA_MAP: Record<string, { video: string; fallbackImage: string; overlayGradient: string }> = {
  Clear: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-sunset-41547-large.mp4',
    fallbackImage: '/assets/dark_emerald_road_hero.jpg',
    overlayGradient: 'from-[#071C14]/90 via-[#071C14]/85 to-[#0B2A1E]/95'
  },
  Sunny: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-sunset-41547-large.mp4',
    fallbackImage: '/assets/dark_emerald_road_hero.jpg',
    overlayGradient: 'from-[#071C14]/85 via-[#071C14]/80 to-[#0B2A1E]/90'
  },
  Cloudy: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-highway-traffic-in-a-cloudy-day-41548-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/90 via-[#0B2A1E]/85 to-[#071C14]/95'
  },
  Rain: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-the-windshield-of-a-car-41549-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/95 via-[#064E3B]/80 to-[#071C14]/95'
  },
  'Heavy Rain': {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-falling-on-a-window-41550-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/95 via-[#064E3B]/90 to-[#071C14]/95'
  },
  Thunderstorm: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-and-lightning-over-a-city-41551-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/95 via-[#0A1F17]/95 to-[#071C14]/98'
  },
  Fog: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-foggy-road-41552-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1485236715568-ddc5ce684574?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/90 via-[#0B2A1E]/85 to-[#071C14]/95'
  },
  Mist: {
    video: 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-foggy-road-41552-large.mp4',
    fallbackImage: 'https://images.unsplash.com/photo-1485236715568-ddc5ce684574?auto=format&fit=crop&w=2000&q=80',
    overlayGradient: 'from-[#071C14]/90 via-[#0B2A1E]/85 to-[#071C14]/95'
  }
};

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({
  condition = 'Clear',
  defaultImage,
  children
}) => {
  const [videoError, setVideoError] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(WEATHER_MEDIA_MAP['Clear']);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Normalize condition string
  useEffect(() => {
    let normalized = 'Clear';
    const condLower = (condition || '').toLowerCase();
    if (condLower.includes('rain') && (condLower.includes('heavy') || condLower.includes('torrential'))) {
      normalized = 'Heavy Rain';
    } else if (condLower.includes('rain') || condLower.includes('drizzle')) {
      normalized = 'Rain';
    } else if (condLower.includes('thunder') || condLower.includes('storm')) {
      normalized = 'Thunderstorm';
    } else if (condLower.includes('cloud') || condLower.includes('overcast')) {
      normalized = 'Cloudy';
    } else if (condLower.includes('fog') || condLower.includes('mist') || condLower.includes('haze')) {
      normalized = 'Fog';
    } else if (condLower.includes('sun') || condLower.includes('clear')) {
      normalized = 'Clear';
    }

    const nextMedia = WEATHER_MEDIA_MAP[normalized] || WEATHER_MEDIA_MAP['Clear'];
    if (nextMedia.video !== currentMedia.video) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setCurrentMedia(nextMedia);
        setVideoError(false);
        setIsFading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [condition]);

  const activeImage = defaultImage || currentMedia.fallbackImage;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#071C14] text-slate-100">
      {/* Background Layer: Video or Image Fallback */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-700 pointer-events-none ${isFading ? 'opacity-30' : 'opacity-100'}`}>
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] contrast-[1.1]"
          >
            <source src={currentMedia.video} type="video/mp4" />
          </video>
        ) : null}

        {/* Fallback Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 filter brightness-[0.9] contrast-[1.15] opacity-90"
          style={{ backgroundImage: `url("${activeImage}")` }}
        />

        {/* Layer 1: Dark Emerald & Forest Green Overlay (Lightened for image clarity) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071C14]/40 via-[#071C14]/30 to-[#0B2A1E]/50 transition-colors duration-1000" />

        {/* Layer 2: Subtle Gold Radial Glow & Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,78,59,0.2),transparent_70%)]" />

        {/* Subtle Luxury Marble & Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
