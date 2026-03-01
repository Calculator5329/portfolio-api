import './App.css';
import { usePortfolioData } from './hooks/usePortfolioData';
import type { PortfolioPerformance } from './hooks/usePortfolioData';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDollarChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

interface PortfolioCardProps {
  portfolio: PortfolioPerformance;
}

function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const isPositive = portfolio.percentChange >= 0;
  const changeClass = isPositive ? 'positive' : 'negative';

  return (
    <div className="portfolio-card">
      <div className="portfolio-header">
        <div>
          <h2 className="portfolio-name">{portfolio.name}</h2>
          <p className="portfolio-value">{formatCurrency(portfolio.totalValue)}</p>
        </div>
        <div className={`portfolio-change ${changeClass}`}>
          <div className="change-percent">{formatPercent(portfolio.percentChange)}</div>
          <div className="change-dollar">{formatDollarChange(portfolio.dollarChange)}</div>
        </div>
      </div>

      <div className="holdings-list">
        <div className="holdings-header">
          <span>Symbol</span>
          <span style={{ textAlign: 'center' }}>Value</span>
          <span style={{ textAlign: 'right' }}>Change</span>
        </div>
        {portfolio.holdings.map((holding) => {
          const holdingPositive = holding.percentChange >= 0;
          return (
            <div key={holding.symbol} className="holding-row">
              <div>
                <div className="holding-symbol">{holding.symbol}</div>
                <div className="holding-name">{holding.name}</div>
              </div>
              <div className="holding-value">{formatCurrency(holding.value)}</div>
              <div className={`holding-change ${holdingPositive ? 'positive' : 'negative'}`}>
                <div className="holding-change-percent">{formatPercent(holding.percentChange)}</div>
                <div className="holding-change-dollar">{formatDollarChange(holding.dollarChange)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const { vtiPerformance, personalPerformance, isLoading, error, lastUpdated, refresh } = usePortfolioData();

  const totalValue = (vtiPerformance?.totalValue ?? 0) + (personalPerformance?.totalValue ?? 0);
  const totalDollarChange = (vtiPerformance?.dollarChange ?? 0) + (personalPerformance?.dollarChange ?? 0);
  const totalPercentChange = totalValue > 0 ? (totalDollarChange / totalValue) * 100 : 0;

  return (
    <div className="app">
      <header className="header">
        <h1>Portfolio Tracker</h1>
        <p>Real-time daily performance of your investments</p>
        
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        <button 
          className={`refresh-btn ${isLoading ? 'spinning' : ''}`} 
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshIcon />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="error">
          <div className="error-title">Error Loading Data</div>
          <p>{error}</p>
        </div>
      )}

      {isLoading && !vtiPerformance && !personalPerformance && (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Fetching portfolio data...</p>
        </div>
      )}

      {!isLoading && vtiPerformance && personalPerformance && (
        <>
          <div className="total-summary">
            <div className="summary-item">
              <div className="summary-label">Total Portfolio Value</div>
              <div className="summary-value">{formatCurrency(totalValue)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Today's Change</div>
              <div className={`summary-value ${totalPercentChange >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(totalPercentChange)}
              </div>
              <div className={`summary-subvalue ${totalPercentChange >= 0 ? 'positive' : 'negative'}`}>
                {formatDollarChange(totalDollarChange)}
              </div>
            </div>
          </div>

          <div className="portfolios">
            <PortfolioCard portfolio={vtiPerformance} />
            <PortfolioCard portfolio={personalPerformance} />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
