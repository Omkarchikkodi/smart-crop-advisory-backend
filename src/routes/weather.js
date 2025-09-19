const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  let { lat, lon } = req.query;

  // ✅ If no GPS passed → fallback to Belgaum coords
  if (!lat || !lon) {
    lat = 15.8497; // Belgaum approx
    lon = 74.4977;
    console.log("⚠️ No lat/lon provided, falling back to Belgaum");
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_KEY}`;
    console.log("Requesting OpenWeather:", url);

    const response = await axios.get(url);

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    if (err.response) {
      console.error("OpenWeather API error:", err.response.status, err.response.data);
      return res
        .status(err.response.status)
        .json({ success: false, error: err.response.data });
    } else if (err.request) {
      console.error("No response from OpenWeather:", err.request);
      return res.status(500).json({ success: false, error: "No response from OpenWeather" });
    } else {
      console.error("Error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
