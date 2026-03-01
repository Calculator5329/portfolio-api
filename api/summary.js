import { Redis } from '@upstash/redis';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const vtiPortfolio = {
  totalValue: 320000,
  holdings: [{ symbol: 'VTI', allocation: 1.0 }],
};

const personalPortfolio = {
  totalValue: 195000,
  holdings: [
    { symbol: 'GOOGL', allocation: 0.1961 },
    { symbol: 'META', allocation: 0.1468 },
    { symbol: 'AMZN', allocation: 0.1402 },
    { symbol: 'PYPL', allocation: 0.1075 },
    { symbol: 'FSKAX', allocation: 0.0590 },
    { symbol: 'AMD', allocation: 0.0575 },
    { symbol: 'ADBE', allocation: 0.0441 },
    { symbol: 'DUOL', allocation: 0.0427 },
    { symbol: 'SPSM', allocation: 0.0392 },
    { symbol: 'MELI', allocation: 0.0364 },
    { symbol: 'TXRH', allocation: 0.0351 },
    { symbol: 'NKE', allocation: 0.0340 },
    { symbol: 'CRM', allocation: 0.0311 },
    { symbol: 'ASML', allocation: 0.0304 },
  ],
};

async function getQuote(symbol) {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
  const data = await res.json();
  return { symbol, dp: data.dp || 0, c: data.c || 0 };
}

function getTodayKey() {
  const now = new Date();
  return `chart:${now.toISOString().split('T')[0]}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Get all symbols including SPY for S&P 500
    const allSymbols = new Set(['SPY']);
    vtiPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));
    personalPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));

    const quotes = await Promise.all(Array.from(allSymbols).map(getQuote));
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // S&P 500 (SPY) performance
    const spyQuote = quoteMap.get('SPY');
    const spyPct = spyQuote?.dp || 0;

    // VTI calculation
    let vtiPct = 0, vtiDollar = 0;
    for (const h of vtiPortfolio.holdings) {
      const quote = quoteMap.get(h.symbol);
      const pct = quote?.dp || 0;
      vtiPct += pct * h.allocation;
      vtiDollar += (pct / 100) * vtiPortfolio.totalValue * h.allocation;
    }

    // Personal calculation
    let persPct = 0, persDollar = 0;
    for (const h of personalPortfolio.holdings) {
      const quote = quoteMap.get(h.symbol);
      const pct = quote?.dp || 0;
      persPct += pct * h.allocation;
      persDollar += (pct / 100) * personalPortfolio.totalValue * h.allocation;
    }

    const totalVal = vtiPortfolio.totalValue + personalPortfolio.totalValue;
    const totalDollar = vtiDollar + persDollar;
    const totalPct = (totalDollar / totalVal) * 100;

    // Get chart history from Redis
    const todayKey = getTodayKey();
    let chartData = await redis.get(todayKey) || { portfolio: [], sp500: [] };

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      total: { 
        value: totalVal,
        percentChange: Math.round(totalPct * 100) / 100, 
        dollarChange: Math.round(totalDollar) 
      },
      vti: { 
        value: vtiPortfolio.totalValue,
        percentChange: Math.round(vtiPct * 100) / 100, 
        dollarChange: Math.round(vtiDollar) 
      },
      personal: { 
        value: personalPortfolio.totalValue,
        percentChange: Math.round(persPct * 100) / 100, 
        dollarChange: Math.round(persDollar) 
      },
      sp500: {
        percentChange: Math.round(spyPct * 100) / 100,
      },
      chart: {
        portfolio: chartData.portfolio || [],
        sp500: chartData.sp500 || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
