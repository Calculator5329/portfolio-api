import { useState, useEffect, useCallback } from 'react';
import { getMultipleQuotes } from '../services/finnhub';
import type { QuoteData } from '../services/finnhub';
import { vtiPortfolio, personalPortfolio, getHoldingValue } from '../config/portfolio';
import type { Portfolio } from '../config/portfolio';

export interface PortfolioPerformance {
  name: string;
  totalValue: number;
  percentChange: number;
  dollarChange: number;
  holdings: HoldingPerformance[];
}

export interface HoldingPerformance {
  symbol: string;
  name: string;
  value: number;
  percentChange: number;
  dollarChange: number;
}

interface UsePortfolioDataResult {
  vtiPerformance: PortfolioPerformance | null;
  personalPerformance: PortfolioPerformance | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

function calculatePortfolioPerformance(
  portfolio: Portfolio,
  quotes: Map<string, QuoteData>
): PortfolioPerformance {
  let weightedPercentChange = 0;
  let totalDollarChange = 0;
  const holdings: HoldingPerformance[] = [];

  for (const holding of portfolio.holdings) {
    const quote = quotes.get(holding.symbol);
    if (!quote) continue;

    const holdingValue = getHoldingValue(portfolio, holding);
    const holdingDollarChange = (quote.percentChange / 100) * holdingValue;

    weightedPercentChange += quote.percentChange * holding.allocation;
    totalDollarChange += holdingDollarChange;

    holdings.push({
      symbol: holding.symbol,
      name: holding.name,
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

export function usePortfolioData(): UsePortfolioDataResult {
  const [vtiPerformance, setVtiPerformance] = useState<PortfolioPerformance | null>(null);
  const [personalPerformance, setPersonalPerformance] = useState<PortfolioPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all unique symbols
      const allSymbols = new Set<string>();
      vtiPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));
      personalPortfolio.holdings.forEach((h) => allSymbols.add(h.symbol));

      // Fetch all quotes
      const quotes = await getMultipleQuotes(Array.from(allSymbols));

      // Create a map for easy lookup
      const quoteMap = new Map<string, QuoteData>();
      quotes.forEach((q) => quoteMap.set(q.symbol, q));

      // Calculate performance for each portfolio
      setVtiPerformance(calculatePortfolioPerformance(vtiPortfolio, quoteMap));
      setPersonalPerformance(calculatePortfolioPerformance(personalPortfolio, quoteMap));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    vtiPerformance,
    personalPerformance,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}

