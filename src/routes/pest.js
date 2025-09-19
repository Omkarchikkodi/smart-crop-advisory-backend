const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// For MVP we don't run ML here. This is a safe placeholder.
// Returns: label (if high confidence), confidence (0-1), recommended_action (text)
router.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "image file required under form field 'image'" });

  // Placeholder logic:
  // - Return "needs further review" if image size small, else return "possible pest/disease: leaf-spot" with conservative advice.
  const sizeKb = Math.round(req.file.size / 1024);
  if (sizeKb < 20) {
    return res.json({
      success: true,
      prediction: "unknown",
      confidence: 0.2,
      message: "Image too small / low quality. Please upload a clearer photo showing the affected area.",
      recommended_action: "Retake photo (close-up) and upload. If still unsure, collect sample and contact local extension officer."
    });
  }

  // Very conservative placeholder "smart guess"
  const labels = [
    { label: "leaf_spot", advice: "Apply recommended organic copper fungicide or consult extension." },
    { label: "blight", advice: "Isolate affected plants, remove badly affected leaves, consult expert." },
    { label: "aphids", advice: "Spray neem oil or soap solution; encourage predators like ladybugs." }
  ];
  // pick pseudo-random deterministic label by file size
  const idx = req.file.size % labels.length;
  const pick = labels[idx];

  return res.json({
    success: true,
    prediction: pick.label,
    confidence: 0.6,
    message: "This is a placeholder prediction for MVP. Model to be replaced with trained ML later.",
    recommended_action: pick.advice
  });
});

module.exports = router;
