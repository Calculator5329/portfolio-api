import { Redis } from '@upstash/redis';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Portfolio configuration
const vtiPortfolio = {
  name: 'Market ETF Holdings',
  totalValue: 320000,
  holdings: [
    { symbol: 'VTI', allocation: 1.0, name: 'Vanguard Total Stock Market ETF' },
  ],
};

const personalPortfolio = {
  name: 'Personal Portfolio',
  totalValue: 195000,
  holdings: [
    { symbol: 'GOOGL', allocation: 0.1961, name: 'Alphabet' },
    { symbol: 'META', allocation: 0.1468, name: 'Meta Platforms' },
    { symbol: 'AMZN', allocation: 0.1402, name: 'Amazon' },
    { symbol: 'PYPL', allocation: 0.1075, name: 'PayPal' },
    { symbol: 'FSKAX', allocation: 0.0590, name: 'Fidelity Total Market Index' },
    { symbol: 'AMD', allocation: 0.0575, name: 'AMD' },
    { symbol: 'ADBE', allocation: 0.0441, name: 'Adobe' },
    { symbol: 'DUOL', allocation: 0.0427, name: 'Duolingo' },
    { symbol: 'SPSM', allocation: 0.0392, name: 'SPDR Portfolio S&P 600 Small Cap' },
    { symbol: 'MELI', allocation: 0.0364, name: 'MercadoLibre' },
    { symbol: 'TXRH', allocation: 0.0351, name: 'Texas Roadhouse' },
    { symbol: 'NKE', allocation: 0.0340, name: 'Nike' },
    { symbol: 'CRM', allocation: 0.0311, name: 'Salesforce' },
    { symbol: 'ASML', allocation: 0.0304, name: 'ASML Holding' },
  ],
};

async function getQuote(symbol) {
  const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    symbol,
    currentPrice: data.c,
    previousClose: data.pc,
    percentChange: data.dp || 0,
    dollarChange: data.d || 0,
  };
}

function calculatePortfolio(portfolio, quotes) {
  let weightedPercentChange = 0;
  let totalDollarChange = 0;
  const holdings = [];

  for (const holding of portfolio.holdings) {
    const quote = quotes.get(holding.symbol);
    if (!quote) continue;

    const holdingValue = portfolio.totalValue * holding.allocation;
    const holdingDollarChange = (quote.percentChange / 100) * holdingValue;

    weightedPercentChange += quote.percentChange * holding.allocation;
    totalDollarChange += holdingDollarChange;

    holdings.push({
      symbol: holding.symbol,
      name: holding.name,
      allocation: `${(holding.allocation * 100).toFixed(2)}%`,
      value: holdingValue,
      percentChange: quote.percentChange,
      dollarChange: holdingDollarChange,
    });
  }

  return {
    name: portfolio.name,
    totalValue: portfolio.totalValue,
    percentChange: weightedPercentChange,
    dollarChange: totalDollarChange,
    holdings,
  };
}

function getTodayKey() {
  const now = new Date();
  return `chart:${now.toISOString().split('T')[0]}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get all symbols including SPY
    const allSymbols = new Set(['SPY']);
    vtiPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));
    personalPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));

    // Fetch all quotes in parallel
    const quotes = await Promise.all(
      Array.from(allSymbols).map((symbol) => getQuote(symbol))
    );

    // Create quote map
    const quoteMap = new Map();
    quotes.forEach((q) => quoteMap.set(q.symbol, q));

    // S&P 500 performance
    const spyQuote = quoteMap.get('SPY');

    // Calculate performance
    const vti = calculatePortfolio(vtiPortfolio, quoteMap);
    const personal = calculatePortfolio(personalPortfolio, quoteMap);

    // Calculate totals
    const totalValue = vti.totalValue + personal.totalValue;
    const totalDollarChange = vti.dollarChange + personal.dollarChange;
    const totalPercentChange = (totalDollarChange / totalValue) * 100;

    // Get chart history from Redis
    const todayKey = getTodayKey();
    let chartData = await redis.get(todayKey) || { portfolio: [], sp500: [] };

    const response = {
      timestamp: new Date().toISOString(),
      total: {
        value: totalValue,
        percentChange: Math.round(totalPercentChange * 100) / 100,
        dollarChange: Math.round(totalDollarChange),
      },
      sp500: {
        percentChange: spyQuote?.percentChange || 0,
        price: spyQuote?.currentPrice || 0,
      },
      vtiPortfolio: vti,
      personalPortfolio: personal,
      chart: {
        portfolio: chartData.portfolio || [],
        sp500: chartData.sp500 || [],
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
