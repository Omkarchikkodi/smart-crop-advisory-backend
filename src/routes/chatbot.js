const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Load FAQ data from JSON file
const faqPath = path.join(__dirname, "../../data/faqData.json");
let faqData = [];

// Load on startup
try {
  faqData = JSON.parse(fs.readFileSync(faqPath, "utf-8"));
  console.log("✅ FAQ data loaded:", faqData.length, "entries");
} catch (err) {
  console.error("❌ Failed to load FAQ data:", err);
}

// 🔍 Utility function: find best match
function findAnswer(query) {
  const q = query.toLowerCase().trim(); // normalize
  console.log("🔍 Searching answer for:", q);

  for (let item of faqData) {
    for (let kw of item.keywords) {
      const keyword = kw.toLowerCase().trim();
      if (q.includes(keyword)) {
        console.log("✅ Matched keyword:", keyword);
        return item.answer;
      }
    }
  }
  return "Sorry, I don’t have information about that yet. Please try asking differently.";
}

// POST /api/chatbot
router.post("/", (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ answer: "Query missing in request." });
  }

  const answer = findAnswer(query);
  res.json({ answer });
});

module.exports = router;
