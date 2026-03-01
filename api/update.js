// This endpoint updates the chart data - call every 5 minutes via cron
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
  return { symbol, dp: data.dp || 0 };
}

function getTodayKey() {
  const now = new Date();
  return `chart:${now.toISOString().split('T')[0]}`;
}

function isMarketHours() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // Market hours: Mon-Fri, 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM
  
  return day >= 1 && day <= 5 && timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Verify cron secret (optional security)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow requests without auth for testing, but log warning
    console.log('Warning: Request without CRON_SECRET');
  }

  try {
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Get all symbols including SPY for S&P 500
    const allSymbols = new Set(['SPY']);
    vtiPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));
    personalPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));

    const quotes = await Promise.all(Array.from(allSymbols).map(getQuote));
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q.dp]));

    // S&P 500 (SPY) performance
    const spyPct = quoteMap.get('SPY') || 0;

    // Calculate total portfolio performance
    let totalWeightedPct = 0;
    const totalValue = vtiPortfolio.totalValue + personalPortfolio.totalValue;

    // VTI contribution
    for (const h of vtiPortfolio.holdings) {
      const pct = quoteMap.get(h.symbol) || 0;
      const weight = (vtiPortfolio.totalValue * h.allocation) / totalValue;
      totalWeightedPct += pct * weight;
    }

    // Personal contribution
    for (const h of personalPortfolio.holdings) {
      const pct = quoteMap.get(h.symbol) || 0;
      const weight = (personalPortfolio.totalValue * h.allocation) / totalValue;
      totalWeightedPct += pct * weight;
    }

    // Get existing chart data
    const todayKey = getTodayKey();
    let chartData = await redis.get(todayKey) || { portfolio: [], sp500: [] };

    // Add new data point
    const timeLabel = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York'
    });

    chartData.portfolio.push({
      time: timeLabel,
      value: Math.round(totalWeightedPct * 100) / 100,
      timestamp: timestamp,
    });

    chartData.sp500.push({
      time: timeLabel,
      value: Math.round(spyPct * 100) / 100,
      timestamp: timestamp,
    });

    // Keep only last 78 points (6.5 hours of market * 12 points/hour = 78 points)
    if (chartData.portfolio.length > 78) {
      chartData.portfolio = chartData.portfolio.slice(-78);
    }
    if (chartData.sp500.length > 78) {
      chartData.sp500 = chartData.sp500.slice(-78);
    }

    // Save to Redis with 24 hour expiry
    await redis.set(todayKey, chartData, { ex: 86400 });

    return res.status(200).json({
      success: true,
      timestamp: timestamp,
      marketOpen: isMarketHours(),
      dataPoints: {
        portfolio: chartData.portfolio.length,
        sp500: chartData.sp500.length,
      },
      latestValues: {
        portfolio: Math.round(totalWeightedPct * 100) / 100,
        sp500: Math.round(spyPct * 100) / 100,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


