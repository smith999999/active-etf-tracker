import json
import math
import yfinance as yf

# 真實發行張數 (單位：千股/張)
ACTUAL_OUTSTANDING_SHARES = {
    '00403A': 11492000,
    '00981A': 9090000,
    '00992A': 2882955,
    '00991A': 6000000  # 約略推估
}

def recalc():
    with open('public/data.json', 'r') as f:
        data = json.load(f)
        
    print("Fetching ETF historical prices...")
    etf_history = {}
    for etf in ACTUAL_OUTSTANDING_SHARES.keys():
        ticker = yf.Ticker(f"{etf}.TW")
        # Fetch last 30 days
        hist = ticker.history(period="1mo")
        # Format dates as YYYY-MM-DD
        etf_history[etf] = {str(d.date()): row['Close'] for d, row in hist.iterrows()}
        
    print("Recalculating shares...")
    new_holdings = []
    for h in data['holdings']:
        date_str = h['date']
        etf_symbol = h['etfSymbol']
        stock_price = h['stockPrice']
        weight = h['weight'] / 100.0  # weight is likely in percentage like 16.83
        
        # Try to get ETF NAV/Price for that day. Fallback to 15.0 if not found
        etf_price = etf_history.get(etf_symbol, {}).get(date_str, 15.0)
        
        actual_etf_shares = ACTUAL_OUTSTANDING_SHARES.get(etf_symbol, 5000000)
        
        # Formula: Component 張數 = (ETF總發行張數 * ETF淨值 * 權重) / 個股價格
        if stock_price > 0:
            new_shares = int((actual_etf_shares * etf_price * weight) / stock_price)
        else:
            new_shares = 0
            
        h['shares'] = new_shares
        new_holdings.append(h)
        
    data['holdings'] = new_holdings
    
    with open('public/data.json', 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("Done! Data.json has been updated with actual outstanding shares multipliers.")

if __name__ == "__main__":
    recalc()
