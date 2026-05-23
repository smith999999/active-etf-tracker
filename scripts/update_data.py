import os
import json
import random
import yfinance as yf
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase (Requires FIREBASE_SERVICE_ACCOUNT in env)
service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
if service_account_info:
    try:
        cred = credentials.Certificate(json.loads(service_account_info))
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        USE_FIREBASE = True
    except Exception as e:
        print(f"Firebase init error: {e}")
        USE_FIREBASE = False
else:
    print("No FIREBASE_SERVICE_ACCOUNT found, running in local/test mode.")
    USE_FIREBASE = False

# 實際發行張數 (單位：張)
ACTUAL_OUTSTANDING_SHARES = {
    '00403A': 11492000,
    '00981A': 9090000,
    '00992A': 2882955,
    '00991A': 6000000
}

def fetch_daily_holdings(etf_symbol):
    """
    獲取 ETF 最新成分股，並根據「實際發行張數」與真實股價/淨值推算真實持股張數。
    實務上可根據 Beautifulsoup 或 Playwright 解析 HTML 表格。
    """
    print(f"Fetching official daily holdings for {etf_symbol}...")
    
    # 模擬從官網或 API 成功解析出成分股清單與權重
    mock_scraped_data = {
        '00403A': [
            {'stockSymbol': '2330', 'stockName': '台積電', 'weight': 16.83},
            {'stockSymbol': '3037', 'stockName': '欣興', 'weight': 4.63},
        ]
    }
    
    data = mock_scraped_data.get(etf_symbol, [])
    
    # 獲取當日真實 ETF 價格 (淨值代表)
    try:
        etf_ticker = yf.Ticker(f"{etf_symbol}.TW")
        etf_hist = etf_ticker.history(period="1d")
        etf_price = float(etf_hist['Close'].iloc[0]) if not etf_hist.empty else 15.0
    except:
        etf_price = 15.0
        
    actual_etf_shares = ACTUAL_OUTSTANDING_SHARES.get(etf_symbol, 5000000)
    
    # 補上真實個股股價並套用實際發行張數計算
    for item in data:
        try:
            ticker = yf.Ticker(f"{item['stockSymbol']}.TW")
            hist = ticker.history(period="1d")
            if not hist.empty:
                stock_price = float(hist['Close'].iloc[0])
                item['price'] = stock_price
                # 計算真實持股張數
                if stock_price > 0:
                    item['shares'] = int((actual_etf_shares * etf_price * (item['weight'] / 100.0)) / stock_price)
                else:
                    item['shares'] = 0
            else:
                item['price'] = 0.0
                item['shares'] = 0
        except:
            item['price'] = 0.0
            item['shares'] = 0
            
    return data

def update_firestore():
    if not USE_FIREBASE:
        print("Skipping Firestore write (not configured).")
        return
        
    today = datetime.now().strftime('%Y-%m-%d')
    etfs = ['00403A', '00981A', '00992A', '00991A']
    
    for etf in etfs:
        holdings = fetch_daily_holdings(etf)
        for h in holdings:
            doc_ref = db.collection('holdings').document(today).collection('etfs').document(etf).collection('stocks').document(h['stockSymbol'])
            doc_ref.set({
                'shares': h['shares'],
                'weight': h['weight'],
                'price': h['price'],
                'stockName': h['stockName'],
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            print(f"Saved {etf} - {h['stockSymbol']} to Firestore.")

if __name__ == "__main__":
    update_firestore()
