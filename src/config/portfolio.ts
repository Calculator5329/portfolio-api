export interface Holding {
  symbol: string;
  allocation: number; // Percentage as decimal (e.g., 0.2414 for 24.14%)
  name: string;
}

export interface Portfolio {
  name: string;
  totalValue: number;
  holdings: Holding[];
}

export const vtiPortfolio: Portfolio = {
  name: 'Market ETF Holdings',
  totalValue: 320000,
  holdings: [
    { symbol: 'VTI', allocation: 1.0, name: 'Vanguard Total Stock Market ETF' },
  ],
};

export const personalPortfolio: Portfolio = {
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

// Helper to get dollar value of a holding
export function getHoldingValue(portfolio: Portfolio, holding: Holding): number {
  return portfolio.totalValue * holding.allocation;
}

// Get all unique symbols from all portfolios
export function getAllSymbols(): string[] {
  const symbols = new Set<string>();
  
  vtiPortfolio.holdings.forEach((h) => symbols.add(h.symbol));
  personalPortfolio.holdings.forEach((h) => symbols.add(h.symbol));
  
  return Array.from(symbols);
}

