// backend/src/routes/recommendation.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// ✅ CHANGE: Expanded rule set with soil + season + weather conditions
router.post("/", async (req, res) => {
  const { soilType, season, lat, lon, humidity } = req.body;

  if (!soilType || !season || !lat || !lon || humidity === undefined) {
    return res.status(400).json({ success: false, error: "All inputs required" });
  }

  try {
    // 🔹 Fetch weather from OpenWeather
    const weatherRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_KEY}`
    );
    const weather = weatherRes.data;

    const temp = weather.main.temp;
    const rainfall = weather.rain ? weather.rain["1h"] || 0 : 0;

    // 🔹 Simple rule-based logic (later ML can replace this)
    let recommended = [];

    // 🌾 Clay Soil
    if (soilType === "clay") {
      if (season === "kharif") {
        if (humidity > 60 && rainfall > 20) {
          recommended = ["Rice", "Sugarcane", "Jute"];
        } else {
          recommended = ["Maize", "Pulses", "Cotton"];
        }
      } else if (season === "rabi") {
        if (temp < 25 && humidity < 60) {
          recommended = ["Wheat", "Barley", "Gram"];
        } else {
          recommended = ["Mustard", "Lentils"];
        }
      } else if (season === "summer") {
        if (temp > 30) {
          recommended = ["Millets", "Groundnut", "Sunflower"];
        } else {
          recommended = ["Vegetables", "Watermelon"];
        }
      }
    }

    // 🏜️ Sandy Soil
    else if (soilType === "sandy") {
      if (season === "kharif") {
        if (rainfall < 30) {
          recommended = ["Bajra (Pearl Millet)", "Groundnut", "Castor"];
        } else {
          recommended = ["Maize", "Pulses"];
        }
      } else if (season === "rabi") {
        if (temp < 25 && humidity < 50) {
          recommended = ["Wheat", "Barley", "Mustard"];
        } else {
          recommended = ["Chickpea", "Cumin"];
        }
      } else if (season === "summer") {
        if (temp > 32) {
          recommended = ["Watermelon", "Muskmelon", "Vegetables"];
        } else {
          recommended = ["Groundnut", "Sunflower"];
        }
      }
    }

    // 🌍 Loamy Soil (most fertile → multiple options)
    else if (soilType === "loamy") {
      if (season === "kharif") {
        recommended = ["Rice", "Maize", "Soybean", "Cotton"];
      } else if (season === "rabi") {
        recommended = ["Wheat", "Barley", "Mustard", "Gram"];
      } else if (season === "summer") {
        recommended = ["Groundnut", "Vegetables", "Sugarcane", "Sunflower"];
      }
    }

    res.json({
      success: true,
      recommendation: recommended,
      weather: { temp, rainfall, humidity }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Recommendation fetch failed" });
  }
});

module.exports = router;