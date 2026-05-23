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

def fetch_daily_holdings(etf_symbol):
    """
    爬取各投信官網當日的真實持股張數。
    由於各官網防爬蟲機制嚴格且常改版，此處為示範爬蟲結構。
    實務上可根據 Beautifulsoup 或 Playwright 解析 HTML 表格。
    """
    print(f"Fetching official daily holdings for {etf_symbol}...")
    
    # 這裡示範撈取真實個股收盤價來結合真實資料庫架構
    # 實作上，這裡會是 requests.get("投信網址").text 解析
    today = datetime.now().strftime('%Y-%m-%d')
    
    # 模擬從官網成功解析出的當日真實持股數據
    mock_scraped_data = {
        '00403A': [
            {'stockSymbol': '2330', 'stockName': '台積電', 'shares': random.randint(300, 350), 'weight': 16.83},
            {'stockSymbol': '3037', 'stockName': '欣興', 'shares': random.randint(120, 150), 'weight': 4.63},
        ]
    }
    
    data = mock_scraped_data.get(etf_symbol, [])
    
    # 補上真實股價
    for item in data:
        try:
            ticker = yf.Ticker(f"{item['stockSymbol']}.TW")
            hist = ticker.history(period="1d")
            if not hist.empty:
                item['price'] = float(hist['Close'].iloc[0])
            else:
                item['price'] = 0.0
        except:
            item['price'] = 0.0
            
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
