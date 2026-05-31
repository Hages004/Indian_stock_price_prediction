# ── Imports ───────────────────────────────────────────────
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import yfinance as yf
import sqlite3
from datetime import datetime
import pandas as pd

# ── Load Model ────────────────────────────────────────────
model = joblib.load("indian_stock_model.pkl")

# ── Create App ────────────────────────────────────────────
app = FastAPI()

# ── Allow React to Connect ────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Indian Stocks ─────────────────────────────────────────
NSE_STOCKS = {
    "Reliance":   "RELIANCE.NS",
    "TCS":        "TCS.NS",
    "Infosys":    "INFY.NS",
    "HDFC Bank":  "HDFCBANK.NS",
    "Wipro":      "WIPRO.NS",
    "ICICI Bank": "ICICIBANK.NS",
    "SBI":        "SBIN.NS",
    "HCL Tech":   "HCLTECH.NS"
}

# ── Database Setup ────────────────────────────────────────
def init_db():
    conn   = sqlite3.connect("predictions.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_name      TEXT,
            ticker          TEXT,
            current_price   REAL,
            predicted_price REAL,
            direction       TEXT,
            predicted_at    TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Get Live Features ─────────────────────────────────────
def get_features(ticker):
    data = yf.download(ticker,
                       period="100d",
                       progress=False)
    data.columns = [col[0] for col in data.columns]

    data['Daily_Return'] = data['Close'].pct_change()
    data['SMA_10']       = data['Close'].rolling(10).mean()
    data['SMA_20']       = data['Close'].rolling(20).mean()
    data['SMA_50']       = data['Close'].rolling(50).mean()
    data['Volatility']   = data['Daily_Return'].rolling(10).std()
    data['EMA_10']       = data['Close'].ewm(span=10).mean()
    data['Momentum']     = data['Close'] - data['Close'].shift(10)

    delta    = data['Close'].diff()
    gain     = delta.where(delta > 0, 0)
    loss     = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs       = avg_gain / avg_loss
    data['RSI'] = 100 - (100 / (1 + rs))

    data    = data.dropna()
    latest  = data.iloc[-1]

    features = np.array([[
        float(latest['SMA_10']),
        float(latest['SMA_20']),
        float(latest['SMA_50']),
        float(latest['Daily_Return']),
        float(latest['Volatility']),
        float(latest['EMA_10']),
        float(latest['Momentum']),
        float(latest['RSI']),
        float(latest['Volume'])
    ]])

    return features, float(latest['Close'])

# ══════════════════════════════════════════════════════════
#                    API ENDPOINTS
# ══════════════════════════════════════════════════════════

# ── Home ──────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "Indian Stock Prediction API 🇮🇳"}

# ── Get All Stocks ────────────────────────────────────────
@app.get("/stocks")
def get_stocks():
    return {"stocks": list(NSE_STOCKS.keys())}

# ── Predict ───────────────────────────────────────────────
@app.get("/predict/{stock_name}")
def predict(stock_name: str):
    if stock_name not in NSE_STOCKS:
        return {"error": f"{stock_name} not found"}

    ticker = NSE_STOCKS[stock_name]
    features, current_price = get_features(ticker)
    predicted_price = float(model.predict(features)[0])
    direction = "UP ↑" if predicted_price > current_price \
                       else "DOWN ↓"

    # Save to database
    conn   = sqlite3.connect("predictions.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO predictions
        (stock_name, ticker, current_price,
         predicted_price, direction, predicted_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (stock_name, ticker,
          current_price, predicted_price,
          direction,
          datetime.now().strftime("%Y-%m-%d %H:%M")))
    conn.commit()
    conn.close()

    return {
        "stock":           stock_name,
        "ticker":          ticker,
        "current_price":   round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "direction":       direction,
        "predicted_at":    datetime.now().strftime(
                           "%Y-%m-%d %H:%M")
    }

# ── Backtest ──────────────────────────────────────────────
@app.get("/backtest/{stock_name}")
def backtest(stock_name: str):
    if stock_name not in NSE_STOCKS:
        return {"error": f"{stock_name} not found"}

    ticker = NSE_STOCKS[stock_name]

    data = yf.download(ticker,
                       start="2020-01-01",
                       end="2024-01-01",
                       progress=False)
    data.columns = [col[0] for col in data.columns]
    data = data.reset_index()

    data['Daily_Return'] = data['Close'].pct_change()
    data['SMA_10']       = data['Close'].rolling(10).mean()
    data['SMA_20']       = data['Close'].rolling(20).mean()
    data['SMA_50']       = data['Close'].rolling(50).mean()
    data['Volatility']   = data['Daily_Return'].rolling(10).std()
    data['EMA_10']       = data['Close'].ewm(span=10).mean()
    data['Momentum']     = data['Close'] - data['Close'].shift(10)

    delta    = data['Close'].diff()
    gain     = delta.where(delta > 0, 0)
    loss     = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs       = avg_gain / avg_loss
    data['RSI'] = 100 - (100 / (1 + rs))
    data['Target'] = data['Close'].shift(-1)
    data = data.dropna().reset_index(drop=True)

    features  = ['SMA_10', 'SMA_20', 'SMA_50',
                 'Daily_Return', 'Volatility',
                 'EMA_10', 'Momentum', 'RSI', 'Volume']
    split     = int(len(data) * 0.8)
    X_test    = data[split:][features]
    test_data = data[split:].copy().reset_index(drop=True)

    predictions            = model.predict(X_test)
    test_data['Predicted'] = predictions
    test_data['Signal']    = (
        test_data['Predicted'] > test_data['Close']
    ).astype(int)

    cash        = 100000
    shares_held = 0
    portfolio   = []

    for i in range(len(test_data)):
        price  = float(test_data['Close'].iloc[i])
        signal = test_data['Signal'].iloc[i]

        if signal == 1 and shares_held == 0:
            shares_held = cash // price
            cash        = cash - (shares_held * price)
        elif signal == 0 and shares_held > 0:
            cash        = cash + (shares_held * price)
            shares_held = 0

        portfolio.append(cash + shares_held * price)

    final_value       = portfolio[-1]
    total_return      = (final_value - 100000) / 100000 * 100
    n_days            = len(portfolio)
    annualized_return = ((final_value/100000)**(365/n_days)-1)*100

    port_series   = pd.Series(portfolio)
    peak          = port_series.cummax()
    drawdown      = (port_series - peak) / peak * 100
    max_drawdown  = drawdown.min()

    daily_returns = port_series.pct_change().dropna()
    sharpe_ratio  = (daily_returns.mean() /
                     daily_returns.std()) * (252**0.5)

    start_price = float(test_data['Close'].iloc[0])
    bnh_shares  = 100000 // start_price
    bnh_final   = bnh_shares * float(test_data['Close'].iloc[-1])
    bnh_return  = (bnh_final - 100000) / 100000 * 100
    alpha       = total_return - bnh_return

    portfolio_history = [
        {
            "date":  str(test_data['Date'].iloc[i].date()),
            "value": round(portfolio[i], 2)
        }
        for i in range(0, len(portfolio), 5)
    ]

    return {
        "stock":             stock_name,
        "initial_capital":   100000,
        "final_value":       round(final_value, 2),
        "total_return":      round(total_return, 2),
        "annualized_return": round(annualized_return, 2),
        "max_drawdown":      round(float(max_drawdown), 2),
        "sharpe_ratio":      round(float(sharpe_ratio), 2),
        "bnh_return":        round(float(bnh_return), 2),
        "alpha":             round(float(alpha), 2),
        "portfolio_history": portfolio_history
    }

# ── History ───────────────────────────────────────────────
@app.get("/history")
def get_history():
    conn   = sqlite3.connect("predictions.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT stock_name, current_price,
               predicted_price, direction,
               predicted_at
        FROM   predictions
        ORDER  BY id DESC
        LIMIT  10
    """)
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append({
            "stock":           row[0],
            "current_price":   row[1],
            "predicted_price": row[2],
            "direction":       row[3],
            "predicted_at":    row[4]
        })
    return {"history": history}