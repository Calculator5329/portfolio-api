import axios from 'axios';

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface QuoteData {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  percentChange: number;
  dollarChange: number;
}

interface FinnhubQuoteResponse {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export async function getQuote(symbol: string): Promise<QuoteData> {
  const response = await axios.get<FinnhubQuoteResponse>(`${BASE_URL}/quote`, {
    params: {
      symbol,
      token: API_KEY,
    },
  });

  const { c, pc, dp, d } = response.data;

  return {
    symbol,
    currentPrice: c,
    previousClose: pc,
    percentChange: dp,
    dollarChange: d,
  };
}

export async function getMultipleQuotes(symbols: string[]): Promise<QuoteData[]> {
  const promises = symbols.map((symbol) => getQuote(symbol));
  return Promise.all(promises);
}

