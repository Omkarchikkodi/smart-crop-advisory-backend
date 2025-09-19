// backend/src/routes/marketPrices.js
const express = require("express");
const router = express.Router();
const mandiData = require("../../data/mandi_prices.json");

// GET /api/market/:crop
router.get("/:crop", (req, res) => {
  const { crop } = req.params;
  if (!crop) {
    return res.status(400).json({ success: false, error: "Crop is required" });
  }

  try {
    // Access records array inside the dataset
    const records = mandiData.records || [];

    // Filter by crop/commodity
    const filtered = records.filter(
      (item) =>
        item.commodity &&
        item.commodity.toLowerCase() === crop.toLowerCase()
    );

    if (filtered.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: `No data found for crop: ${crop}` });
    }

    // Build clean price array
    const prices = filtered.map((item) => ({
      mandi: item.market || "Unknown Market",
      state: item.state || "Unknown State",
      district: item.district || "Unknown District",
      variety: item.variety || "N/A",
      grade: item.grade || "N/A",
      arrival_date: item.arrival_date || "N/A",
      price_modal: item.modal_price || "N/A",
      price_min: item.min_price || "N/A",
      price_max: item.max_price || "N/A",
    }));

    // ✅ Sort by modal price (highest first) & limit to top 10
    const topPrices = prices
      .sort((a, b) => Number(b.price_modal) - Number(a.price_modal))
      .slice(0, 10);

    return res.json({
      success: true,
      crop,
      count: topPrices.length,
      prices: topPrices
    });
  } catch (err) {
    console.error("Market prices fetch error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Could not fetch market prices" });
  }
});

module.exports = router;
