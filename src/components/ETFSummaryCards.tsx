import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ACTIVE_ETFS } from '../data/api';

interface ETFPriceData {
  price: number;
  change: number;
  changePercent: number;
}

interface ETFSummaryCardsProps {
  activeETF: string;
  onSelectETF: (symbol: string) => void;
  prices: Record<string, ETFPriceData>;
}

const ETFSummaryCards: React.FC<ETFSummaryCardsProps> = ({ activeETF, onSelectETF, prices }) => {
  return (
    <div className="etf-list-bar">
      {ACTIVE_ETFS.map(etf => {
        const priceData = prices[etf.symbol];
        const isActive = activeETF === etf.symbol;

        return (
          <div
            key={etf.symbol}
            className={`etf-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectETF(etf.symbol)}
          >
            <div className="etf-card-header">
              <span className="etf-card-symbol">{etf.symbol}</span>
              <span className="etf-card-name">{etf.name}</span>
            </div>
            {priceData ? (
              <div className="etf-card-body">
                <span className="etf-card-price">{priceData.price.toFixed(2)}</span>
                <span className={`etf-card-change ${priceData.change >= 0 ? 'text-up' : 'text-down'}`}>
                  {priceData.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {' '}{priceData.change > 0 ? '+' : ''}{priceData.changePercent}%
                </span>
              </div>
            ) : (
              <div className="etf-card-body">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Minus size={14} /> 載入中...
                </span>
              </div>
            )}
            <span className="etf-card-issuer">{etf.issuer}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ETFSummaryCards;
