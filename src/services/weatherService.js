const axios = require("axios");
const NodeCache = require("node-cache");

const minutes = parseInt(process.env.OPENWEATHER_CACHE_MINUTES || "15", 10);
const cache = new NodeCache({ stdTTL: minutes * 60 });

async function getOneCall(lat, lon) {
  const key = `onecall:${lat}:${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (!process.env.OPENWEATHER_KEY) {
    throw new Error("OPENWEATHER_KEY not set in env");
  }
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_KEY}`;
  const resp = await axios.get(url);
  cache.set(key, resp.data);
  return resp.data;
}

module.exports = { getOneCall, cache };
