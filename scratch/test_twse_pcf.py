import requests

def fetch_twse_pcf():
    # TWSE API for ETF Portfolio Composition File (PCF) might have current outstanding shares
    url = "https://openapi.twse.com.tw/v1/exchangeReport/ETF_PCF"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        print(f"Fetched {len(data)} ETF PCF records.")
        for item in data:
            if item.get('SecuritiesCompanyCode') in ['00403A', '00981A', '00992A', '00991A']:
                print(item)
    else:
        print("Failed to fetch")

fetch_twse_pcf()
