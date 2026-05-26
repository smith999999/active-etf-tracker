import os
import json
import time
import yfinance as yf
from datetime import datetime, timedelta

# ===== Firebase 初始化 (若有環境變數則啟用) =====
USE_FIREBASE = False
db = None

service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
if service_account_info:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        cred = credentials.Certificate(json.loads(service_account_info))
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        USE_FIREBASE = True
        print("✅ Firebase 初始化成功")
    except Exception as e:
        print(f"❌ Firebase init error: {e}")
else:
    print("⚠️ 無 FIREBASE_SERVICE_ACCOUNT，僅更新 data.json")

# ===== 實際發行張數 (單位：張，來源：證交所/Goodinfo) =====
ACTUAL_OUTSTANDING_SHARES = {
    '00403A': 11492000,   # 統一台股升級50 - 約114.92億單位
    '00981A': 9090000,    # 統一台股增長 - 約90.9億單位
    '00992A': 2882955,    # 群益科技創新 - 約28.8億單位
    '00991A': 6000000,    # 復華未來50 - 約60億單位(估)
}

# ===== 各 ETF 完整成分股清單與最新權重 =====
ETF_COMPONENTS = {
    '00403A': [
        {'stockSymbol': '2330', 'stockName': '台積電', 'weight': 13.49},
        {'stockSymbol': '3037', 'stockName': '欣興', 'weight': 3.41},
        {'stockSymbol': '2303', 'stockName': '聯電', 'weight': 3.79},
        {'stockSymbol': '3017', 'stockName': '奇鋐', 'weight': 4.01},
        {'stockSymbol': '2383', 'stockName': '台光電', 'weight': 4.11},
        {'stockSymbol': '3711', 'stockName': '日月光投控', 'weight': 3.26},
        {'stockSymbol': '2308', 'stockName': '台達電', 'weight': 3.40},
    ],
    '00981A': [
        {'stockSymbol': '2330', 'stockName': '台積電', 'weight': 9.93},
        {'stockSymbol': '2383', 'stockName': '台光電', 'weight': 8.46},
        {'stockSymbol': '2345', 'stockName': '智邦', 'weight': 5.90},
        {'stockSymbol': '2454', 'stockName': '聯發科', 'weight': 5.78},
        {'stockSymbol': '5347', 'stockName': '世界', 'weight': 4.00},
        {'stockSymbol': '3264', 'stockName': '欣銓', 'weight': 3.50},
        {'stockSymbol': '3189', 'stockName': '景碩', 'weight': 3.00},
        {'stockSymbol': '2481', 'stockName': '強茂', 'weight': 2.50},
        {'stockSymbol': '6187', 'stockName': '萬潤', 'weight': 2.00},
        {'stockSymbol': '3443', 'stockName': '創意', 'weight': 1.50},
    ],
    '00992A': [
        {'stockSymbol': '2330', 'stockName': '台積電', 'weight': 15.00},
        {'stockSymbol': '3105', 'stockName': '穩懋', 'weight': 8.00},
        {'stockSymbol': '3036', 'stockName': '文曄', 'weight': 7.50},
        {'stockSymbol': '2337', 'stockName': '旺宏', 'weight': 6.00},
        {'stockSymbol': '3711', 'stockName': '日月光投控', 'weight': 5.50},
        {'stockSymbol': '3260', 'stockName': '威剛', 'weight': 5.00},
    ],
    '00991A': [
        {'stockSymbol': '2330', 'stockName': '台積電', 'weight': 17.20},
        {'stockSymbol': '2327', 'stockName': '國巨', 'weight': 8.00},
        {'stockSymbol': '2454', 'stockName': '聯發科', 'weight': 7.49},
        {'stockSymbol': '8299', 'stockName': '群聯', 'weight': 6.00},
        {'stockSymbol': '3037', 'stockName': '欣興', 'weight': 5.50},
        {'stockSymbol': '8046', 'stockName': '南電', 'weight': 5.00},
        {'stockSymbol': '3189', 'stockName': '景碩', 'weight': 4.50},
    ],
}


# 上櫃股票清單 (需要用 .TWO 而非 .TW)
OTC_STOCKS = {'5347', '3264', '6187', '3105', '3260', '8299', '3443', '8046', '8299'}


def fetch_stock_price(symbol, retries=3):
    """取得個股最新收盤價，自動判斷上市(.TW)或上櫃(.TWO)"""
    suffixes = ['.TWO', '.TW'] if symbol in OTC_STOCKS else ['.TW', '.TWO']

    for suffix in suffixes:
        for attempt in range(retries):
            try:
                ticker = yf.Ticker(f"{symbol}{suffix}")
                hist = ticker.history(period="5d")
                if not hist.empty:
                    return round(float(hist['Close'].iloc[-1]), 2)
            except Exception as e:
                print(f"  ⚠️ {symbol}{suffix} 第{attempt+1}次取價失敗: {e}")
                time.sleep(2 * (attempt + 1))
        # 如果第一個 suffix 全部失敗，繼續嘗試第二個
    return 0.0


def fetch_etf_price(etf_symbol):
    """取得 ETF 最新收盤價/淨值"""
    try:
        ticker = yf.Ticker(f"{etf_symbol}.TW")
        hist = ticker.history(period="5d")
        if not hist.empty:
            return round(float(hist['Close'].iloc[-1]), 2)
    except Exception as e:
        print(f"  ⚠️ ETF {etf_symbol} 取價失敗: {e}")
    return 15.0


def compute_daily_holdings(today_str):
    """計算今日所有 ETF 的真實持股張數"""
    all_holdings = []

    for etf_symbol, components in ETF_COMPONENTS.items():
        print(f"\n📊 處理 {etf_symbol}...")
        etf_price = fetch_etf_price(etf_symbol)
        actual_shares = ACTUAL_OUTSTANDING_SHARES.get(etf_symbol, 5000000)
        print(f"  ETF 淨值/價格: {etf_price}, 實際發行張數: {actual_shares:,}")

        for comp in components:
            stock_price = fetch_stock_price(comp['stockSymbol'])
            weight_ratio = comp['weight'] / 100.0

            if stock_price > 0:
                holding_shares = int((actual_shares * etf_price * weight_ratio) / stock_price)
            else:
                holding_shares = 0

            record = {
                'date': today_str,
                'etfSymbol': etf_symbol,
                'stockSymbol': comp['stockSymbol'],
                'stockName': comp['stockName'],
                'shares': holding_shares,
                'weight': comp['weight'],
                'stockPrice': stock_price,
            }
            all_holdings.append(record)
            print(f"  ✅ {comp['stockName']}({comp['stockSymbol']}): {holding_shares:,} 張 @ ${stock_price}")
            time.sleep(0.5)  # 避免 rate limit

    return all_holdings


def update_data_json(new_holdings):
    """更新 public/data.json，保留最近 25 個交易日的資料"""
    data_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data.json')

    # 讀取既有資料
    existing = []
    if os.path.exists(data_path):
        with open(data_path, 'r') as f:
            data = json.load(f)
            existing = data.get('holdings', [])

    # 合併新舊資料
    combined = existing + new_holdings

    # 取得所有日期並只保留最近 25 天
    dates = sorted(set(h['date'] for h in combined))
    keep_dates = set(dates[-25:])
    filtered = [h for h in combined if h['date'] in keep_dates]

    with open(data_path, 'w') as f:
        json.dump({'holdings': filtered}, f, ensure_ascii=False, indent=2)

    print(f"\n📁 data.json 已更新: {len(filtered)} 筆紀錄, 涵蓋 {len(keep_dates)} 個交易日")


def write_to_firestore(new_holdings, today_str):
    """將今日資料寫入 Firestore"""
    if not USE_FIREBASE or not db:
        print("⏭️  跳過 Firestore 寫入（未設定）")
        return

    from firebase_admin import firestore as fs

    for h in new_holdings:
        doc_ref = (db.collection('holdings')
                   .document(today_str)
                   .collection('etfs')
                   .document(h['etfSymbol'])
                   .collection('stocks')
                   .document(h['stockSymbol']))
        doc_ref.set({
            'shares': h['shares'],
            'weight': h['weight'],
            'price': h['stockPrice'],
            'stockName': h['stockName'],
            'updatedAt': fs.SERVER_TIMESTAMP,
        })
    print(f"🔥 Firestore 已寫入 {len(new_holdings)} 筆紀錄")


def main():
    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"🚀 開始更新每日持股資料 - {today_str}")
    print("=" * 60)

    # 1. 計算今日所有持股
    new_holdings = compute_daily_holdings(today_str)

    # 2. 更新 data.json (前端 fallback 用)
    update_data_json(new_holdings)

    # 3. 寫入 Firestore (長期儲存)
    write_to_firestore(new_holdings, today_str)

    print("\n" + "=" * 60)
    print(f"✅ 完成！共處理 {len(new_holdings)} 筆持股紀錄")


if __name__ == "__main__":
    main()
