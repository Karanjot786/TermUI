import { caps } from "@termuijs/core";
import { app, row, gauge, progressBar, text, status } from "@termuijs/quick";

// Usage: bun run dev -- --lat=<latitude> --lon=<longitude> --city=<name>
// Example: bun run dev -- --lat=21.25 --lon=81.63 --city=Raipur
// Default: Purnea (lat=25.6, lon=87.5)

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const value = args
    .find((a: string) => a.startsWith(`--${name}=`))
    ?.split("=")[1]
    ?.trim();

  return value || undefined;
};

const lat = getArg("lat") ?? "25.6";
const lon = getArg("lon") ?? "87.5";
const city = getArg("city") ?? "Purnea";
const API =
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;

let weather: any = null;
let lastFetch = 0;
let lastLatency = 0;

function severityFor(temp: number) {
  if (temp <= 25) return { label: "Normal", emoji: "🟢", color: { type: "named", name: "green" } as const };
  if (temp <= 35) return { label: "Hot", emoji: "🟡", color: { type: "named", name: "yellow" } as const };
  return { label: "Extreme", emoji: "🔴", color: { type: "named", name: "red" } as const };
}

function weatherIcon(code: number) {
  if (code >= 95) return "🌧️";
  if (code >= 80) return "🌦️";
  if (code >= 60) return "🌧️";
  if (code >= 40) return "⛅";
  if (code >= 20) return "☁️";
  return "☀️";
}

function compass(direction: number) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(direction / 45) % 8;
  return points[index];
}

function timeAgo(now: number) {
  const diff = Math.max(0, Math.floor((now - lastFetch) / 1000));
  return diff < 60 ? `${diff}s ago` : `${Math.floor(diff / 60)}m ago`;
}

async function fetchWeather() {
  const now = Date.now();
  if (weather && now - lastFetch < 5000) return;

  const started = performance.now();
  try {
    const res = await fetch(API);
    lastLatency = Math.round(performance.now() - started);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    weather = await res.json();
    lastFetch = now;
  } catch (_error) {
    lastLatency = Math.round(performance.now() - started);
    weather = null;
    lastFetch = now;
  }
}

setInterval(fetchWeather, 5000);
fetchWeather();

app(caps.unicode ? `🌤 Weather Dashboard • ${city}, India` : `* Weather Dashboard • ${city}, India`)
  .rows(
    row(
      text(() => {
        const icon = weather ? weatherIcon(weather.current?.weather_code ?? 0) : "⏳";
        return `${icon} Weather Dashboard • ${city}, India`;
      }, { bold: true, color: { type: "named", name: "cyan" } })
    ),

    row(
      gauge("Temp", () => {
        const t = weather?.current?.temperature_2m ?? 0;
        return Math.min(Math.max((t + 20) / 60, 0), 1);
      }, { color: severityFor(weather?.current?.temperature_2m ?? 0).color }),

      gauge("Wind", () => {
        const w = weather?.current?.wind_speed_10m ?? 0;
        return Math.min(w / 120, 1);
      }, { color: { type: "named", name: "blue" } })
    ),

    row(
      progressBar(() => {
        const t = weather?.current?.temperature_2m ?? 0;
        return Math.min(Math.max(t / 50, 0), 1);
      }, { color: severityFor(weather?.current?.temperature_2m ?? 0).color, showLabel: true }),
      progressBar(() => {
        const w = weather?.current?.wind_speed_10m ?? 0;
        return Math.min(w / 100, 1);
      }, { color: { type: "named", name: "cyan" }, showLabel: true })
    ),

    row(
      text(() => {
        if (!weather) return "Loading latest weather data...";
        const t = weather.current?.temperature_2m ?? 0;
        const feels = weather.current?.apparent_temperature ?? t;
        const severity = severityFor(t);
        return `${severity.emoji} ${severity.label} • ${t.toFixed(1)}°C • Feels like ${feels.toFixed(1)}°C`;
      }, { bold: true }),
      text(() => weather ? `Humidity ${weather.current?.relative_humidity_2m ?? 0}%` : "Humidity --%")
    ),

    row(
      text(() => {
        if (!weather) return "Wind direction: --";
        const dir = weather.current?.wind_direction_10m ?? 0;
        return `Wind ${compass(dir)} • ${weather.current?.wind_speed_10m ?? 0} km/h`;
      }),
      text(() => `Last updated: ${weather ? timeAgo(Date.now()) : "just now"}`)
    ),

    row(
      status("API", () => weather !== null, {
        upColor: { type: "named", name: "green" },
        downColor: { type: "named", name: "red" },
      }),
      text(() => `Latency: ${lastLatency || 0} ms`),
      text(() => `Sync: ${weather ? timeAgo(Date.now()) : "waiting"}`)
    )
  )
  .keys({ q: "quit", r: "refresh" })
  .refresh("5s")
  .run();