import yfinance as yf

for ticker in ['00403A.TW', '0050.TW']:
    t = yf.Ticker(ticker)
    info = t.info
    print(f"{ticker} sharesOutstanding:", info.get('sharesOutstanding'))
    print(f"{ticker} impl:", info.get('impliedSharesOutstanding'))

