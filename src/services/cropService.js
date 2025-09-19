const fs = require("fs");
const csv = require("csv-parser");
const weatherService = require("./weatherService");

const cropRules = [];

function loadCropRules() {
  return new Promise((resolve, reject) => {
    fs.createReadStream("data/crop_rules.csv")
      .pipe(csv())
      .on("data", (row) => {
        // Normalize types
        cropRules.push({
          crop: row.crop,
          min_temp: parseFloat(row.min_temp),
          max_temp: parseFloat(row.max_temp),
          min_rain: parseFloat(row.min_rain),
          max_rain: parseFloat(row.max_rain),
          soil_types: row.soil_types ? row.soil_types.split(";").map(s => s.trim().toLowerCase()) : [],
          season: row.season || "",
          sowing_start: row.sowing_start || "",
          sowing_end: row.sowing_end || ""
        });
      })
      .on("end", () => {
        console.log("Loaded crop rules:", cropRules.length);
        resolve();
      })
      .on("error", (err) => reject(err));
  });
}

// Simple scoring function
function scoreCrop(rule, temp, rainfall, soilType, cropHistory = []) {
  let score = 0;
  // temperature fit
  if (temp >= rule.min_temp && temp <= rule.max_temp) score += 30;
  else {
    // partial score for near fit
    const mid = (rule.min_temp + rule.max_temp) / 2;
    const diff = Math.abs(mid - temp);
    score += Math.max(0, 20 - diff); // degrade by diff
  }

  // rainfall fit
  if (rainfall >= rule.min_rain && rainfall <= rule.max_rain) score += 30;
  else {
    const midRain = (rule.min_rain + rule.max_rain) / 2;
    const diff = Math.abs(midRain - rainfall);
    score += Math.max(0, 15 - diff / 50); // degrade
  }

  // soil match
  const soilMatch = rule.soil_types.includes(soilType.toLowerCase());
  score += soilMatch ? 30 : 5;

  // crop history penalty (if same crop grown last season)
  const recentPenalty = cropHistory.includes(rule.crop) ? -20 : 0;
  score += recentPenalty;

  return Math.round(score * 100) / 100;
}

async function getRecommendation({ lat, lon, soil_type, crop_history = [], land_area }) {
  if (cropRules.length === 0) await loadCropRules();

  // get weather - use current temp and a near-term rainfall estimate
  let weather;
  try {
    weather = await weatherService.getOneCall(lat, lon);
  } catch (err) {
    throw new Error("Failed to fetch weather: " + err.message);
  }

  const temp = (weather && weather.current && weather.current.temp) ? weather.current.temp : 25;
  // approximate rainfall: take sum of next 7 days rain (if present) else fallback
  let rainfall = 0;
  if (weather && weather.daily) {
    rainfall = weather.daily.slice(0, 7).reduce((s, d) => s + (d.rain || 0), 0); // mm in next 7 days
  } else {
    rainfall = 100; // fallback
  }

  const scored = cropRules.map(rule => {
    const score = scoreCrop(rule, temp, rainfall, soil_type, crop_history || []);
    return {
      crop: rule.crop,
      score,
      soil_types: rule.soil_types,
      season: rule.season,
      sowing_start: rule.sowing_start,
      sowing_end: rule.sowing_end
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 2);

  const justification = top.map(t => {
    const parts = [];
    parts.push(`${t.crop} (score ${t.score})`);
    parts.push(`Suitable soils: ${t.soil_types.join(", ")}`);
    if (t.sowing_start && t.sowing_end) parts.push(`Sowing window: ${t.sowing_start} → ${t.sowing_end}`);
    return parts.join(" | ");
  });

  return {
    recommended: top.map(t => ({ crop: t.crop, score: t.score, season: t.season, sowing_start: t.sowing_start, sowing_end: t.sowing_end })),
    justification,
    meta: {
      current_temp_c: temp,
      next_7day_rain_mm: rainfall,
      land_area,
      soil_type
    }
  };
}

module.exports = { getRecommendation, loadCropRules };
