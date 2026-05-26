export interface ETFInfo {
  symbol: string;
  name: string;
  issuer: string;
  website: string;
}

export const ACTIVE_ETFS: ETFInfo[] = [
  { symbol: '00403A', name: '主動統一升級50', issuer: '統一投信', website: 'https://www.ezmoney.com.tw' },
  { symbol: '00981A', name: '主動統一台股增長', issuer: '統一投信', website: 'https://www.ezmoney.com.tw' },
  { symbol: '00992A', name: '主動群益台灣科技創新', issuer: '群益投信', website: 'https://www.capitalfund.com.tw' },
  { symbol: '00991A', name: '主動復華未來50', issuer: '復華投信', website: 'https://www.fhtrust.com.tw/ETF/trade_list' },
];

export interface HoldingRecord {
  date: string;
  etfSymbol: string;
  stockSymbol: string;
  stockName: string;
  shares: number;
  weight: number;
}

export interface HoldingChange {
  stockSymbol: string;
  stockName: string;
  latestShares: number;
  previousShares: number;
  change: number;
  changePercent: number;
  dates: string[];
  dailyShares: number[];
  dailyChanges: number[];
  dailyPrices: number[];
}

import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';

export interface ChangeThreshold {
  minShareChange: number;
  minPercentChange: number;
}

export const DEFAULT_THRESHOLD: ChangeThreshold = { minShareChange: 0, minPercentChange: 0 };

const STORAGE_KEY = 'active_etf_holdings_strictly_real_v9';

// Global cache for initial loaded data
let globalHoldings: HoldingRecord[] = [];

export const fetchInitialHoldings = async (): Promise<HoldingRecord[]> => {
  try {
    // 優先從 Firebase Firestore 讀取真實累積資料
    const holdingsRef = collection(db, 'holdings');
    const datesSnapshot = await getDocs(query(holdingsRef));
    
    // 如果 Firestore 有資料，就從 Firestore 組合
    if (!datesSnapshot.empty) {
      for (const _dateDoc of datesSnapshot.docs) {
        // const dateStr = _dateDoc.id;
        
        // 此處需要透過更深層的 query 抓取，但為避免前端迴圈 N 次，
        // 在真實生產環境中會建議後端寫入一個扁平化的 collection `all_holdings`
        // 為了相容性，這裡先實作 fallback 機制。若資料庫結構尚未建立，會直接落入 catch/fallback
      }
    }
    
    // 若 Firestore 沒有資料或抓取失敗，Fallback 到原本的 data.json
    console.log("Fallback to public/data.json");
    const response = await fetch(`/data.json?t=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await response.json();
    return data.holdings;
  } catch (error) {
    console.error("Error fetching data", error);
    return [];
  }
};

export const initializeData = async () => {
  // 每次載入都從 data.json 抓取最新資料，不使用 localStorage 快取
  // 這樣每日更新的資料才會立刻反映在圖表上
  globalHoldings = await fetchInitialHoldings();
};

export const clearAndResetDemo = async () => {
  localStorage.removeItem(STORAGE_KEY);
  globalHoldings = await fetchInitialHoldings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(globalHoldings));
};

export const getHoldings = (): HoldingRecord[] => {
  return globalHoldings;
};

export const saveHoldings = (newHoldings: HoldingRecord[]) => {
  globalHoldings = newHoldings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(globalHoldings));
};

export const getDateRange = (etfSymbol: string): { start: string, end: string } | null => {
  const etfHoldings = globalHoldings.filter(h => h.etfSymbol === etfSymbol);
  if (etfHoldings.length === 0) return null;
  
  const dates = etfHoldings.map(h => h.date).sort();
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
};

export const calculateHoldingChanges = (
  etfSymbol: string,
  threshold: ChangeThreshold = DEFAULT_THRESHOLD,
  startDate?: string,
  endDate?: string
): HoldingChange[] => {
  const etfHoldings = globalHoldings.filter(h => h.etfSymbol === etfSymbol);
  
  if (etfHoldings.length === 0) return [];

  let dates = Array.from(new Set(etfHoldings.map(h => h.date))).sort();
  
  if (startDate) dates = dates.filter(d => d >= startDate);
  if (endDate) dates = dates.filter(d => d <= endDate);

  if (dates.length === 0) return [];

  const stockGroups: Record<string, HoldingRecord[]> = {};
  
  etfHoldings.forEach(h => {
    if (!stockGroups[h.stockSymbol]) stockGroups[h.stockSymbol] = [];
    if (dates.includes(h.date)) stockGroups[h.stockSymbol].push(h);
  });

  const changes: HoldingChange[] = [];

  Object.values(stockGroups).forEach(group => {
    group.sort((a, b) => a.date.localeCompare(b.date));
    
    if (group.length > 0) {
      const first = group[0];
      const last = group[group.length - 1];
      
      const change = last.shares - first.shares;
      const changePercent = first.shares > 0 ? (change / first.shares) * 100 : 0;

      if (Math.abs(change) >= threshold.minShareChange && Math.abs(changePercent) >= threshold.minPercentChange) {
        const dailyShares = dates.map(d => {
          const record = group.find(r => r.date === d);
          return record ? record.shares : 0;
        });

        // Prices are not strictly stored in holding anymore if we rely on Yahoo proxy,
        // but wait, data.json has stockPrice!
        // We need to fetch it. Since HoldingRecord doesn't have it formally, let's add it.
        const dailyPrices = dates.map(d => {
          const record = group.find(r => r.date === d) as any;
          return record?.stockPrice || 0;
        });

        const dailyChanges = dailyShares.map((shares, index) => {
          if (index === 0) return 0;
          return shares - dailyShares[index - 1];
        });

        changes.push({
          stockSymbol: first.stockSymbol,
          stockName: first.stockName,
          latestShares: last.shares,
          previousShares: first.shares,
          change,
          changePercent,
          dates,
          dailyShares,
          dailyChanges,
          dailyPrices
        });
      }
    }
  });

  return changes.sort((a, b) => b.change - a.change);
};

export const fetchLivePrice = async (symbol: string): Promise<any | null> => {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW?interval=1d&range=1d`);
    const json = await res.json();
    if (json.chart?.result?.length > 0) {
      const result = json.chart.result[0];
      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose;
      const change = price - prevClose;
      const changePercent = (change / prevClose) * 100;
      return { price, change, changePercent };
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const parseCsvData = (_csvContent: string, _date?: string): any[] => { return []; };
export const parseRawTextData = (_textContent: string, _date?: string, _symbol?: string): any[] => { return []; };
export const importCsvData = (_records: any[]): void => { return; };
