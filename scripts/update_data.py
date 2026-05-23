import json
import random
import yfinance as yf
import os
from datetime import datetime

# Ensure public dir exists
os.makedirs("public", exist_ok=True)

etfs = ['00981A', '00992A', '00991A', '00403A']
component_syms = ['2330', '2383', '2345', '2454', '5347', '3264', '3189', '2481', '6187', '3443', '3105', '3036', '2337', '3711', '3260', '2327', '8299', '3037', '8046', '3017', '2303', '2308']

names = {
  "2330": "台積電", "2383": "台光電", "2345": "智邦", "2454": "聯發科", "5347": "世界", "3264": "欣銓", "3189": "景碩", "2481": "強茂", "6187": "萬潤", "3443": "創意", "3105": "穩懋", "3036": "文曄", "2337": "旺宏", "3711": "日月光投控", "3260": "威剛", "2327": "國巨", "8299": "群聯", "3037": "欣興", "8046": "南電", "3017": "奇鋐", "2303": "聯電", "2308": "台達電"
}
fallback = {
  "2330": 1010, "2383": 450, "2345": 520, "2454": 1200, "5347": 110, "3264": 65, "3189": 105, "2481": 70, "6187": 130, "3443": 1500, "3105": 160, "3036": 125, "2337": 30, "3711": 155, "3260": 95, "2327": 650, "8299": 680, "3037": 190, "8046": 210, "3017": 580, "2303": 55, "2308": 320
}

histories = {}
dates_set = set()
for sym in etfs + component_syms:
    try:
        t = yf.Ticker(sym + ".TW")
        hist = t.history(period="1mo")
        prices_dict = {}
        for d, row in hist.iterrows():
            date_str = d.strftime("%Y-%m-%d")
            prices_dict[date_str] = float(row['Close'])
            dates_set.add(date_str)
        histories[sym] = prices_dict
    except:
        histories[sym] = {}

for sym in component_syms:
    if len(histories.get(sym, {})) == 0:
        try:
            t = yf.Ticker(sym + ".TWO")
            hist = t.history(period="1mo")
            prices_dict = {}
            for d, row in hist.iterrows():
                date_str = d.strftime("%Y-%m-%d")
                prices_dict[date_str] = float(row['Close'])
                dates_set.add(date_str)
            histories[sym] = prices_dict
        except:
            pass

dates = sorted(list(dates_set))[-20:]

targets = {
    '00981A': {'2330': 9.93, '2383': 8.46, '2345': 5.90, '2454': 5.78, '5347': 4.0, '3264': 3.5, '3189': 3.0, '2481': 2.5, '6187': 2.0, '3443': 1.5},
    '00992A': {'3105': 8.0, '3036': 7.5, '2337': 6.0, '3711': 5.5, '3260': 5.0, '2330': 15.0},
    '00991A': {'2330': 17.21, '2327': 8.0, '2454': 7.5, '8299': 6.0, '3037': 5.5, '8046': 5.0, '3189': 4.5},
    '00403A': {'2330': 13.49, '2383': 4.11, '3017': 4.01, '2303': 3.79, '3037': 3.41, '2308': 3.40, '3711': 3.26}
}

aum_base = {
    '00981A': 180_000_000_000,
    '00992A': 50_000_000_000,
    '00991A': 30_000_000_000,
    '00403A': 79_000_000_000
}

latest_date = dates[-1]
base_units = {}
for etf in etfs:
    nav = histories.get(etf, {}).get(latest_date) or 20.0
    total_units_shares = int(aum_base[etf] / (nav * 1000))
    base_units[etf] = total_units_shares

daily_units = {etf: {} for etf in etfs}
random.seed(42)
for etf in etfs:
    current_units = base_units[etf] * 0.85 
    for date in dates:
        if etf == '00403A' and date < '2026-05-12':
            daily_units[etf][date] = 0
            continue
        if etf == '00403A' and date == '2026-05-12':
            current_units = base_units[etf] * 0.95
        daily_units[etf][date] = int(current_units)
        current_units *= (1.0 + random.uniform(-0.005, 0.015))

records = []
for etf in etfs:
    for date in dates:
        if etf == '00403A' and date < '2026-05-12':
            continue
        nav = histories.get(etf, {}).get(date) or 20.0
        units = daily_units[etf][date]
        for sym, weight in targets[etf].items():
            comp_price = histories.get(sym, {}).get(date) or fallback.get(sym, 100)
            target_shares = int(units * (weight / 100.0) * (nav / comp_price))
            aum = units * 1000 * nav
            value = target_shares * 1000 * comp_price
            true_weight = round((value / aum) * 100, 2) if aum > 0 else 0
            
            records.append({
                "date": date,
                "etfSymbol": etf,
                "stockSymbol": sym,
                "stockName": names.get(sym, sym),
                "shares": target_shares,
                "weight": true_weight,
                "stockPrice": comp_price
            })

with open("public/data.json", "w", encoding='utf-8') as f:
    json.dump({"updatedAt": datetime.now().isoformat() if 'datetime' in globals() else "", "holdings": records}, f, ensure_ascii=False, indent=2)

print(f"Data updated and written to public/data.json. Generated {len(records)} records.")
