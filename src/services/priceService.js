const fs = require("fs");
const csv = require("csv-parser");
const NodeCache = require("node-cache");

const cacheSeconds = parseInt(process.env.MANDI_CACHE_SECONDS || "3600", 10);
const cache = new NodeCache({ stdTTL: cacheSeconds });

function loadPrices() {
  return new Promise((resolve, reject) => {
    const list = [];
    fs.createReadStream("data/mandi_prices.csv")
      .pipe(csv())
      .on("data", (row) => {
        list.push({
          commodity: row.commodity.toLowerCase(),
          market: row.market.toLowerCase(),
          state: row.state,
          price: parseFloat(row.price),
          date: row.date
        });
      })
      .on("end", () => {
        cache.set("mandi_list", list);
        resolve(list);
      })
      .on("error", (err) => reject(err));
  });
}

async function getPrice(commodity, market) {
  let list = cache.get("mandi_list");
  if (!list) {
    list = await loadPrices();
  }

  commodity = (commodity || "").toLowerCase();
  market = (market || "").toLowerCase();

  // exact match market + commodity
  let found = list.filter(row => row.commodity === commodity && row.market === market);
  if (found.length > 0) return found.sort((a,b) => new Date(b.date) - new Date(a.date))[0];

  // fallback: any market for commodity
  found = list.filter(row => row.commodity === commodity);
  if (found.length > 0) return found.sort((a,b) => new Date(b.date) - new Date(a.date))[0];

  return null;
}

module.exports = { getPrice, loadPrices, cache };
