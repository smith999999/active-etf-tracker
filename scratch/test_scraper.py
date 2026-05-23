import requests
from bs4 import BeautifulSoup

def scrape_ezmoney(etf_symbol):
    url = f"https://www.ezmoney.com.tw/ETF/Detailed/{etf_symbol}"
    print(f"Scraping {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    res = requests.get(url, headers=headers)
    
    with open('scratch/ezmoney.html', 'w') as f:
        f.write(res.text)
    print("Saved to scratch/ezmoney.html")

scrape_ezmoney('00403A')
