import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Layers, BarChart2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import type { HoldingChange } from '../data/api';

interface LivePriceData {
  price: number;
  change: number;
  changePercent: number;
}

interface DailyChangeChartProps {
  selectedStockData: HoldingChange | null;
  livePrice?: LivePriceData | null;
}

const DailyChangeChart: React.FC<DailyChangeChartProps> = ({ selectedStockData, livePrice }) => {
  if (!selectedStockData) {
    return (
      <div className="glass-panel chart-panel">
        <div className="empty-state">
          <Layers className="empty-state-icon" size={48} />
          <h3>未選擇個股</h3>
          <p>請點擊左側列表中的個股，以查看其詳細的日持股與真實股價變化走勢</p>
        </div>
      </div>
    );
  }

  // 轉換成 Recharts 格式 (結合持股與真實歷史股價)
  const chartData = selectedStockData.dates.map((date, idx) => ({
    date: date.substring(5), // 簡化日期，只顯示 MM-DD
    shares: selectedStockData.dailyShares[idx],
    change: selectedStockData.dailyChanges[idx],
    price: selectedStockData.dailyPrices[idx] || 0,
  }));

  const isOverallUp = selectedStockData.change >= 0;

  // ==========================================
  // 💡 核心新增：主動操作勝率與行為金融學評對分析 (Rethinking Investing Reality Check)
  // ==========================================
  const tradeAnalysis = useMemo(() => {
    if (!selectedStockData || selectedStockData.dailyPrices.length < 2) return null;
    
    const prices = selectedStockData.dailyPrices;
    const shares = selectedStockData.dailyShares;
    
    const priceStart = prices[0];
    const priceEnd = prices[prices.length - 1];
    const sharesStart = shares[0];
    const sharesEnd = shares[shares.length - 1];
    
    const priceChangePct = ((priceEnd - priceStart) / priceStart) * 100;
    const sharesChangePct = sharesStart > 0 ? ((sharesEnd - sharesStart) / sharesStart) * 100 : 100;
    
    let rating = '部位穩健觀察';
    let ratingColor = '#94a3b8'; // gray
    let icon = <HelpCircle size={18} />;
    let desc = '';
    
    if (priceChangePct > 4) {
      if (sharesChangePct > 8) {
        rating = '高檔順勢追增';
        ratingColor = '#ef4444'; // 台灣上漲色 (紅)
        icon = <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
        desc = '經理人在股價大漲波段期間大舉加倉。雖然跟上了上漲，但也大幅拉高了持股的平均摩擦成本，面臨高檔拉回的追高風險。';
      } else if (sharesChangePct < -8) {
        rating = '逢高提早下車';
        ratingColor = '#10b981'; // 台灣減碼色 (綠)
        icon = <AlertTriangle size={18} style={{ color: '#10b981' }} />;
        desc = '在股票大漲的主升段期間，經理人選擇逢高減碼。這雖然提前鎖定了部分利潤，但也錯失了隨後更巨大的飆升波段（行為金融學中的損失規避/急於實現獲利偏差）。';
      } else {
        rating = '股價強勢觀望';
        desc = '股價呈現上漲趨勢，但經理人選擇按兵不動，未盲目追增或拋售，操作極具紀律性。';
      }
    } else if (priceChangePct < -4) {
      if (sharesChangePct > 8) {
        rating = '逆勢逢低攤平';
        ratingColor = '#ef4444';
        icon = <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
        desc = '在股票步入空頭修正時，經理人選擇逆勢大舉加碼攤平。這屬於典型的損失規避心理（拒絕認賠），試圖透過拉低成本來挽回，但也讓基金暴露於更高的持股集中度風險。';
      } else if (sharesChangePct < -8) {
        rating = '高檔精準避險';
        ratingColor = '#10b981';
        icon = <CheckCircle2 size={18} style={{ color: '#10b981' }} />;
        desc = '在股價步入跌勢前，經理人便提前拋售、大幅減持張數。這項主動操作成功避開了隨後的跌幅，為基金創造了實質的超額報酬 (Alpha)！';
      } else {
        rating = '套牢死撐觀望';
        desc = '股價呈現下跌走勢，但經理人未作任何減碼停損防禦，部位處於套牢觀望狀態。';
      }
    } else {
      if (Math.abs(sharesChangePct) > 15) {
        rating = '箱型隨機瞎忙';
        ratingColor = '#a78bfa'; // purple
        icon = <AlertTriangle size={18} style={{ color: '#a78bfa' }} />;
        desc = '個股價格在此期間僅在箱型震盪，經理人卻在此時頻繁地主動買進賣出。這類操作非但無法創造超額報酬，反倒產生了高昂的管理、交易印花稅等隱性交易摩擦成本，侵蝕複利資產。';
      } else {
        rating = '部位穩健紀律良好';
        icon = <CheckCircle2 size={18} style={{ color: '#3b82f6' }} />;
        desc = '股價與持股均維持在合理區間，無頻繁進出的無謂交易，符合資產配置的主動紀律要求。';
      }
    }
    
    return { rating, ratingColor, icon, desc, priceChangePct: priceChangePct.toFixed(1), sharesChangePct: sharesChangePct.toFixed(1) };
  }, [selectedStockData]);

  return (
    <div className="glass-panel chart-panel">
      {/* 標題與即時報價 */}
      <div className="chart-header">
        <div className="chart-title">
          <h2 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{selectedStockData.stockName} ({selectedStockData.stockSymbol})</span>
            {livePrice && (
              <span 
                style={{ 
                  fontSize: '0.95rem', 
                  color: livePrice.change >= 0 ? 'var(--up-color)' : 'var(--down-color)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  marginLeft: '4px'
                }}
              >
                即時交易價：${livePrice.price.toFixed(1)} ({livePrice.change >= 0 ? '+' : ''}{livePrice.changePercent.toFixed(2)}%)
              </span>
            )}
          </h2>
          <p className="subtitle">近 20 日真實持股變化軌跡與每日異動量</p>
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">當前持股</span>
            <span className="stat-value">{selectedStockData.latestShares.toLocaleString()} 張</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">累積變動</span>
            <span className={`stat-value ${isOverallUp ? 'text-up' : 'text-down'}`}>
              {isOverallUp ? <TrendingUp size={16} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={16} style={{ display: 'inline', marginRight: '4px' }} />}
              {isOverallUp ? '+' : ''}{selectedStockData.change.toLocaleString()} 張 ({isOverallUp ? '+' : ''}{selectedStockData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 雙 Y 軸對位圖表 */}
      <div>
        <div className="chart-section-title">
          <Layers size={14} /> 持有張數 vs. 個股收盤股價 (雙 Y 軸同框對照)
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              
              {/* Y軸左: 持有張數 */}
              <YAxis
                yAxisId="left"
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={val => `${val}張`}
              />
              
              {/* Y軸右: 真實個股收盤價 */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#a78bfa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={val => `$${val}`}
              />

              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  boxShadow: 'var(--glass-shadow)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
                formatter={(value: any, name: any) => {
                  if (name === '持有張數') return [`${Number(value).toLocaleString()} 張`, '持有張數'];
                  return [`$${Number(value).toFixed(1)} 元`, '真實收盤價'];
                }}
                labelFormatter={label => `日期: ${label}`}
              />
              
              <Legend verticalAlign="top" height={36} fontSize={11} />
              
              {/* 藍線: 持有張數走勢 */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="shares"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#0f172a' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }}
                name="持有張數"
              />

              {/* 紫線: 真實個股價格走勢 */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke="#a78bfa"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, stroke: '#a78bfa', strokeWidth: 1, fill: '#0f172a' }}
                name="收盤股價 (元)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 💡 主動操作勝率與行為金融學評對面板 (Rethinking Investing Reality Check) */}
      {tradeAnalysis && (
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tradeAnalysis.icon}
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                操作對位評測：
                <span style={{ color: tradeAnalysis.ratingColor }}>{tradeAnalysis.rating}</span>
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              股價變化: <strong style={{ color: Number(tradeAnalysis.priceChangePct) >= 0 ? 'var(--up-color)' : 'var(--down-color)' }}>{Number(tradeAnalysis.priceChangePct) >= 0 ? '+' : ''}{tradeAnalysis.priceChangePct}%</strong> | 
              張數變化: <strong style={{ color: Number(tradeAnalysis.sharesChangePct) >= 0 ? 'var(--up-color)' : 'var(--down-color)' }}>{Number(tradeAnalysis.sharesChangePct) >= 0 ? '+' : ''}{tradeAnalysis.sharesChangePct}%</strong>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {tradeAnalysis.desc}
          </p>
        </div>
      )}

      {/* 每日買賣變動量柱狀圖 */}
      <div style={{ marginTop: '12px' }}>
        <div className="chart-section-title">
          <BarChart2 size={14} /> 每日買賣變動量 (張)
        </div>
        <div className="cumulative-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={val => `${val > 0 ? '+' : ''}${val.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  boxShadow: 'var(--glass-shadow)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
                formatter={(value: any) => {
                  const num = Number(value);
                  const isAdd = num >= 0;
                  return [
                    <span className={isAdd ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                      {isAdd ? '+' : ''}{num.toLocaleString()} 張
                    </span>,
                    '每日異動量',
                  ];
                }}
                labelFormatter={label => `日期: ${label}`}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
              <Bar
                dataKey="change"
                name="每日異動"
                radius={[4, 4, 0, 0]}
                fill="#8884d8"
              >
                {chartData.map((entry, index) => {
                  const color = entry.change >= 0 ? 'var(--up-color)' : 'var(--down-color)';
                  return <rect key={`rect-${index}`} fill={color} opacity={0.85} />;
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DailyChangeChart;
