import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpDown } from 'lucide-react';
import type { HoldingChange, ChangeThreshold } from '../data/api';

interface StockPriceData {
  price: number;
  change: number;
  changePercent: number;
}

interface HoldingChangesProps {
  changes: HoldingChange[];
  selectedStock: string | null;
  onSelectStock: (symbol: string) => void;
  threshold: ChangeThreshold;
  onThresholdChange: (t: ChangeThreshold) => void;
  stockPrices?: Record<string, StockPriceData>;
}

type FilterMode = 'all' | 'up' | 'down';

const HoldingChanges: React.FC<HoldingChangesProps> = ({
  changes,
  selectedStock,
  onSelectStock,
  threshold,
  onThresholdChange,
  stockPrices = {},
}) => {
  const [filter, setFilter] = React.useState<FilterMode>('all');

  const filtered = React.useMemo(() => {
    if (filter === 'up') return changes.filter(c => c.change > 0);
    if (filter === 'down') return changes.filter(c => c.change < 0);
    return changes;
  }, [changes, filter]);

  const formatShares = (n: number) => {
    if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="glass-panel changes-panel">
      <div className="changes-header">
        <h2>
          <ArrowUpDown size={18} />
          大幅持股變化
        </h2>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-tab ${filter === 'up' ? 'active' : ''}`}
            onClick={() => setFilter('up')}
          >
            增持
          </button>
          <button
            className={`filter-tab ${filter === 'down' ? 'active' : ''}`}
            onClick={() => setFilter('down')}
          >
            減持
          </button>
        </div>
      </div>

      <div className="threshold-controls">
          <div className="filter-group">
            <label>最低變化張數</label>
            <input 
              type="number" 
              value={threshold.minShareChange || ''} 
              onChange={(e) => onThresholdChange({ 
                ...threshold, 
                minShareChange: Number(e.target.value) 
              })}
              placeholder="0"
            />
          </div>
          <div className="filter-group">
            <label>最低變化 %</label>
            <input 
              type="number" 
              value={threshold.minPercentChange || ''} 
              onChange={(e) => onThresholdChange({ 
                ...threshold, 
                minPercentChange: Number(e.target.value) 
              })}
              placeholder="0"
            />
          </div>
      </div>

      <div className="changes-list">
        {filtered.length === 0 ? (
          <div className="no-data-msg">
            <Minus size={20} />
            <span>目前無符合閾值的持股變化</span>
          </div>
        ) : (
          filtered.map(item => {
            const isUp = item.change > 0;
            const isSelected = selectedStock === item.stockSymbol;
            const livePrice = stockPrices[item.stockSymbol];

            return (
              <div
                key={item.stockSymbol}
                className={`change-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectStock(item.stockSymbol)}
              >
                <div className="change-item-left">
                  <div className={`change-direction ${isUp ? 'up' : item.change < 0 ? 'down' : 'neutral'}`}>
                    {isUp ? <TrendingUp size={18} /> : item.change < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
                  </div>
                  <div className="change-stock-info">
                    <span className="change-stock-symbol">
                      {item.stockSymbol}
                      {livePrice && (
                        <span 
                          style={{ 
                            fontSize: '0.8rem', 
                            color: livePrice.change >= 0 ? 'var(--up-color)' : 'var(--down-color)', 
                            marginLeft: '8px', 
                            fontWeight: 700 
                          }}
                        >
                          ${livePrice.price.toFixed(1)} ({livePrice.change >= 0 ? '+' : ''}{livePrice.changePercent.toFixed(2)}%)
                        </span>
                      )}
                    </span>
                    <span className="change-stock-name">{item.stockName}</span>
                  </div>
                </div>
                <div className="change-item-right">
                  <span className={`change-shares ${isUp ? 'text-up' : 'text-down'}`}>
                    {isUp ? '+' : ''}{formatShares(item.change)} 張
                  </span>
                  <span className={`change-percent ${isUp ? 'text-up' : 'text-down'}`}>
                    {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </span>
                  <span className="change-latest">
                    持有 {formatShares(item.latestShares)} 張
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HoldingChanges;
