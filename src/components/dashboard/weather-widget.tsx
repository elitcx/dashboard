"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  MapPin,
  CloudDrizzle,
  CloudFog,
  RefreshCw,
} from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

type WeatherData = {
  temp: number;
  feelsLike: number;
  code: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  city: string;
};

type CacheEntry = {
  data: WeatherData;
  lat: number;
  lon: number;
  expires: number;
};

const CACHE_KEY = "dashboard:weather:v2";
const CACHE_TTL = 30 * 60 * 1000;

function getWeatherInfo(code: number): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code <= 2) return { label: "Partly Cloudy", Icon: Cloud };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code <= 49) return { label: "Foggy", Icon: CloudFog };
  if (code <= 55) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code <= 99) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Unknown", Icon: Cloud };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return "";
    const json = await res.json();
    return (
      json.address?.city ||
      json.address?.town ||
      json.address?.village ||
      json.address?.county ||
      ""
    );
  } catch {
    return "";
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const [weatherRes, city] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,precipitation&temperature_unit=celsius&wind_speed_unit=kmh`,
    ),
    reverseGeocode(lat, lon),
  ]);
  if (!weatherRes.ok) throw new Error("Weather fetch failed");
  const json = await weatherRes.json();
  return {
    temp: Math.round(json.current.temperature_2m),
    feelsLike: Math.round(json.current.apparent_temperature),
    code: json.current.weather_code,
    windSpeed: Math.round(json.current.wind_speed_10m),
    humidity: json.current.relative_humidity_2m,
    precipitation: json.current.precipitation ?? 0,
    city,
  };
}

export function WeatherWidget({ delay = 0 }: { delay?: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "denied" | "error" | "ok">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const loadWeather = useCallback(async (lat: number, lon: number, bust = false) => {
    if (!bust) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const entry: CacheEntry = JSON.parse(raw);
          if (Date.now() < entry.expires) {
            setWeather(entry.data);
            setStatus("ok");
            return;
          }
        }
      } catch {}
    }
    try {
      const data = await fetchWeather(lat, lon);
      const entry: CacheEntry = { data, lat, lon, expires: Date.now() + CACHE_TTL };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      setWeather(data);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        loadWeather(lat, lon);
      },
      () => setStatus("denied"),
      { timeout: 8000 },
    );
  }, [loadWeather]);

  const handleRefresh = async () => {
    if (!coords || refreshing) return;
    setRefreshing(true);
    await loadWeather(coords.lat, coords.lon, true);
    setRefreshing(false);
  };

  const { label, Icon } = weather ? getWeatherInfo(weather.code) : { label: "", Icon: Sun };

  return (
    <GlassCard delay={delay} className="flex flex-col">
      <div className="flex items-center justify-between">
        <CardLabel>Weather</CardLabel>
        {status === "ok" && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-40"
            aria-label="Refresh weather"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={1.75}
            />
          </button>
        )}
      </div>

      {status === "loading" && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      )}

      {status === "denied" && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Location unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Allow location access to see weather.</p>
        </div>
      )}

      {status === "error" && (
        <p className="mt-4 text-sm text-muted-foreground">Could not load weather.</p>
      )}

      {status === "ok" && weather && (
        <div className="mt-3">
          {weather.city && (
            <p className="text-xs text-muted-foreground/70 mb-3 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              {weather.city}
            </p>
          )}
          <div className="flex items-end gap-3">
            <Icon className="h-9 w-9 text-amber-400" strokeWidth={1.5} />
            <span className="text-4xl font-medium text-white leading-none">{weather.temp}°C</span>
          </div>
          <p className="mt-2 text-sm text-white/80">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">Feels like {weather.feelsLike}°C</p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/5 pt-4">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={1.75} />
              <span className="text-xs text-muted-foreground">{weather.humidity}% humidity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
              <span className="text-xs text-muted-foreground">{weather.windSpeed} km/h</span>
            </div>
            {weather.precipitation > 0 && (
              <div className="flex items-center gap-1.5 col-span-2">
                <CloudRain className="h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={1.75} />
                <span className="text-xs text-muted-foreground">{weather.precipitation} mm precip.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
