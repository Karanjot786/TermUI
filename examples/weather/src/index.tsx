import { caps } from "@termuijs/core";
import { app, row, gauge, text, status } from "@termuijs/quick";

const API =
  "https://api.open-meteo.com/v1/forecast?latitude=25.6&longitude=87.5&current_weather=true";

// cached state (SYNC ACCESS ONLY)
let weather: any = null;
let lastFetch = 0;

async function fetchWeather() {
  const now = Date.now();

  if (weather && now - lastFetch < 5000) return;

  const res = await fetch(API);
  weather = await res.json();
  lastFetch = now;
}

// background updater (IMPORTANT)
setInterval(fetchWeather, 5000);
fetchWeather();

app(caps.unicode ? "🌤 Weather Dashboard" : "* Weather Dashboard")
  .rows(
    row(text(() => "Purnea Weather Monitor", { bold: true })),

    // TEMP GAUGE (SYNC)
    row(
      gauge("Temperature", () => {
        const t = weather?.current_weather?.temperature ?? 0;
        return (t + 20) / 60;
      }),

      gauge("Wind", () => {
        const w = weather?.current_weather?.windspeed ?? 0;
        return w / 100;
      })
    ),

    // STATUS (SYNC ONLY)
    row(
      status("API", () => {
        return weather !== null;
      })
    ),

    // INFO TEXT
    row(
      text(() => {
        if (!weather) return "Loading weather...";

        const w = weather.current_weather;
        return `Temp: ${w.temperature}°C | Wind: ${w.windspeed} km/h`;
      })
    )
  )
  .keys({
    q: "quit",
    r: "refresh",
  })
  .refresh("5s")
  .run();