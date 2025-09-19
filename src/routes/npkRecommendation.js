// backend/src/routes/npkRecommendation.js
// Purpose: Given pH, area (acres) and crop -> return N-P-K (kg) recommendation for the field.
// ✅ CHANGE: New route added for restricted NPK recommender.

const express = require("express");
const router = express.Router();

// Conversion helpers
const ACRES_TO_HA = 0.40468564224;

// Base recommended doses (typical) in kg/ha (these are conservative, editable)
const BASE_DOSES_KG_PER_HA = {
  rice:  { N: 120, P: 40,  K: 40 },
  wheat: { N: 120, P: 60,  K: 40 },
  maize: { N: 140, P: 60,  K: 60 },
  sugarcane: { N: 200, P: 100, K: 100 },
  groundnut: { N: 20,  P: 60,  K: 40 },
  cotton: { N: 120, P: 60,  K: 60 },
  soybean: { N: 20,  P: 40,  K: 40 },
  pulses: { N: 20, P: 40, K: 40 },
  maize_sorghum: { N: 80, P: 40, K: 40 } // fallback
};

// Helper: round to 1 decimal
function r(v){ return Math.round(v*10)/10; }

// Map user crop string (simple normalization)
function normalizeCrop(c) {
  if (!c) return null;
  const s = c.trim().toLowerCase();
  if (s.includes("rice") || s.includes("paddy")) return "rice";
  if (s.includes("wheat")) return "wheat";
  if (s.includes("maize") || s.includes("corn")) return "maize";
  if (s.includes("sugar")) return "sugarcane";
  if (s.includes("groundnut") || s.includes("peanut")) return "groundnut";
  if (s.includes("cotton")) return "cotton";
  if (s.includes("soy") || s.includes("soybean")) return "soybean";
  if (s.includes("pulse") || s.includes("gram") || s.includes("lentil")) return "pulses";
  return null;
}

// Adjustment rules based on pH (simple, conservative):
// - Low pH (<6.0): phosphorus availability reduced -> increase P by +20%
// - High pH (>8.0): micronutrient availability reduced (Zn/Fe) -> for NPK guidance we *do not* recommend higher NPK, but we add a note to use Zn/Fe foliar/chelate.
// - Very acidic (<5.5): recommend liming (note) but still compute NPK.
// These are practical heuristics for a general advisory MVP (not lab-level).
router.post("/", (req, res) => {
  try {
    const body = req.body || {};
    const pH = body.pH !== undefined ? parseFloat(body.pH) : NaN;
    const area_acres = body.area_acres !== undefined ? parseFloat(body.area_acres) : NaN;
    const cropRaw = body.crop || "";

    if (isNaN(pH) || isNaN(area_acres) || !cropRaw) {
      return res.status(400).json({ success: false, error: "Required: pH (number), area_acres (number), crop (string)" });
    }

    const crop = normalizeCrop(cropRaw) || null;
    if (!crop || !BASE_DOSES_KG_PER_HA[crop]) {
      return res.status(400).json({ success: false, error: "Crop not recognized or not supported. Use e.g. rice, wheat, maize, groundnut, cotton, soybean, sugarcane, pulses." });
    }

    // Convert area to hectares for base dose scaling
    const area_ha = area_acres * ACRES_TO_HA;

    // Base per-hectare doses
    const base = BASE_DOSES_KG_PER_HA[crop];

    // Apply pH adjustments (multiplicative)
    let factorN = 1.0, factorP = 1.0, factorK = 1.0;
    const notes = [];

    if (pH < 5.5) {
      // Very acidic: P availability poor -> increase P; recommend liming
      factorP += 0.25; // +25%
      notes.push("Soil is very acidic (pH < 5.5). Consider liming before major cropping; increased P recommended because low pH reduces P availability.");
    } else if (pH >= 5.5 && pH < 6.0) {
      factorP += 0.15; // +15%
      notes.push("Slight acidity — modest increase in P may help; monitor or consider small liming.");
    } else if (pH > 8.0) {
      // alkaline: micronutrient availability impacted — mention foliar Zn/Fe
      notes.push("Soil is alkaline (pH > 8.0). Micronutrients (Zn/Fe) may be limited; include micronutrient foliar sprays or chelated Zn/Fe when deficiency appears.");
    } else {
      // pH in approx-neutral range → no P change
    }

    // If area is very small or very large, no further factor change; scaling below
    // Now compute per-hectare adjusted doses
    const N_per_ha = base.N * factorN;
    const P_per_ha = base.P * factorP;
    const K_per_ha = base.K * factorK;

    // // Convert per-ha to per-acre
    // const per_acre_factor = ACRES_TO_HA; // 1 acre = 0.404686 ha so multiply ha-dose by 0.404686 to get kg/acre
    // const N_per_acre = N_per_ha * per_acre_factor;
    // const P_per_acre = P_per_ha * per_acre_factor;
    // const K_per_acre = K_per_ha * per_acre_factor;

    // --- Convert to per-acre (kg/acre) ---
    // 1 ha = 2.471 acres → so per-acre = per-ha / 2.471
    const HA_TO_ACRES = 2.471;
    const N_per_acre = N_per_ha / HA_TO_ACRES;
    const P_per_acre = P_per_ha / HA_TO_ACRES;
    const K_per_acre = K_per_ha / HA_TO_ACRES;

    // // Total for field (kg)
    // const N_total = N_per_ha * area_ha;
    // const P_total = P_per_ha * area_ha;
    // const K_total = K_per_ha * area_ha;
    // --- Total for field (kg) ---
    const N_total = N_per_acre * area_acres;
    const P_total = P_per_acre * area_acres;
    const K_total = K_per_acre * area_acres;

    // Split recommendation for N (common practice): 1/3 basal, 2/3 in splits (crop dependent)
    // We'll provide a conservative split: 1/3 basal, 1/3 at tillering/early growth, 1/3 at panicle/flowering (adjustable by crop).
    const N_split = {
      basal_kg: r(N_total / 3),
      mid_kg: r(N_total / 3),
      final_kg: r(N_total / 3)
    };

    // Packaging: round numbers nicely
    const payload = {
      success: true,
      crop: crop,
      area_acres: r(area_acres),
      area_ha: r(area_ha),
      pH: r(pH),
      adjustments: {
        factorN: factorN,
        factorP: r(factorP),
        factorK: factorK
      },
      per_acre: {
        N_kg_per_acre: r(N_per_acre),
        P_kg_per_acre: r(P_per_acre),
        K_kg_per_acre: r(K_per_acre),
        total_per_acre: r(N_per_acre + P_per_acre + K_per_acre)
      },
      total_for_field_kg: {
        N_total_kg: r(N_total),
        P_total_kg: r(P_total),
        K_total_kg: r(K_total),
        total_field: r(N_total + P_total + K_total)
      },
      N_split_for_field_kg: N_split,
      notes: notes.length ? notes : ["Soil pH in normal range; use balanced NPK as recommended."],
      advice: [
        "Apply N in splits (see N_split_for_field_kg).",
        "Prefer part organic sources (compost/FYM) to gradually build soil organic matter; this reduces chemical dependency.",
        "Get a lab soil test for final precision if field is high-value."
      ]
    };

    return res.json(payload);

  } catch (e) {
    console.error("NPK recommendation error:", e);
    return res.status(500).json({ success: false, error: "Internal error" });
  }
});

module.exports = router;
