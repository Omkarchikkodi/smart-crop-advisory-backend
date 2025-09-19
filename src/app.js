require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const recommendationRoutes = require("./routes/recommendation");
const weatherRoutes = require("./routes/weather");
const priceRoutes = require("./routes/marketPrices");
const pestRoutes = require("./routes/pest");
const npkRecommendation = require("./routes/npkRecommendation");
const marketPricesRoutes = require("./routes/marketPrices");
const chatbotRoutes = require("./routes/chatbot");


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/recommendation", recommendationRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/market", marketPricesRoutes);
app.use("/api/pest", pestRoutes);
app.use("/api/npk-recommendation", npkRecommendation);
app.use("/api/chatbot", chatbotRoutes); // ✅ chatbot route

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Smart Crop Advisory API is running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
