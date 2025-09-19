const express = require("express");
const router = express.Router();

// Dummy rule-based recommendations
const cropRules = [
  {
    condition: (weather, soil) => weather.temp > 30 && soil === "black",
    crops: ["Cotton", "Millets"],
  },
  {
    condition: (weather, soil) => weather.humidity > 80 && soil === "clay",
    crops: ["Rice", "Sugarcane"],
  },
  {
    condition: (weather, soil) => weather.rainfall < 50,
    crops: ["Bajra", "Jowar", "Groundnut"],
  },
  {
    condition: (weather, soil) => weather.temp >= 20 && weather.temp <= 28,
    crops: ["Wheat", "Maize"],
  },
];

router.post("/", (req, res) => {
  const { weather, soil } = req.body;

  if (!weather || !soil) {
    return res.status(400).json({ success: false, error: "Weather and soil data required" });
  }

  let recommendations = [];

  cropRules.forEach(rule => {
    if (rule.condition(weather, soil)) {
      recommendations = recommendations.concat(rule.crops);
    }
  });

  if (recommendations.length === 0) {
    recommendations = ["No strong match found. Try general crops like Maize, Pulses."];
  }

  res.json({ success: true, crops: recommendations });
});

module.exports = router;
