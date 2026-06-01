import { useState, useEffect } from "react";

const API = "https://indian-stock-price-prediction-r58y.onrender.com";

export default function App() {
  const [stocks,    setStocks]    = useState([]);
  const [selected,  setSelected]  = useState("");
  const [result,    setResult]    = useState(null);
  const [backtest,  setBacktest]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [btLoading, setBtLoading] = useState(false);
  const [history,   setHistory]   = useState([]);
  const [showHist,  setShowHist]  = useState(false);
  const [histLoad,  setHistLoad]  = useState(false);


 useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await fetch(`${API}/stocks`,
          { signal: AbortSignal.timeout(60000) });
        const d = await res.json();
        setStocks(d.stocks);
        setSelected(d.stocks[0]);
      } catch {
        setTimeout(fetchStocks, 5000);
      }
    };
    fetchStocks();
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    setBacktest(null);
    const res  = await fetch(`${API}/predict/${selected}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const handleBacktest = async () => {
    setBtLoading(true);
    setBacktest(null);
    const res  = await fetch(`${API}/backtest/${selected}`);
    const data = await res.json();
    setBacktest(data);
    setBtLoading(false);
  };
const handleHistory = async () => {
  if (showHist) {
    setShowHist(false);
    return;
  }
  setHistLoad(true);
  const res  = await fetch(`${API}/history`);
  const data = await res.json();
  setHistory(data.history);
  setHistLoad(false);
  setShowHist(true);
};
  return (
    <div style={styles.page}>

      {/* ── Header ───────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.badge}>NSE • ML Powered</div>
        <h1 style={styles.title}>Indian Stock Predictor</h1>
        <p style={styles.subtitle}>
          Real time predictions for top Indian stocks
        </p>
      </div>

      {/* ── Main Card ────────────────────────────────── */}
      <div style={styles.card}>

        {/* Stock Selector */}
        <p style={styles.label}>Select stock</p>
        <select
          value={selected}
          onChange={e => {
            setSelected(e.target.value);
            setResult(null);
            setBacktest(null);
          }}
          style={styles.select}>
          {stocks.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button
            onClick={handlePredict}
            disabled={loading}
            style={styles.predictBtn}>
            {loading ? "Fetching..." : "Predict Price"}
          </button>
          <button
            onClick={handleBacktest}
            disabled={btLoading}
            style={styles.backtestBtn}>
            {btLoading ? "Running..." : "Run Backtest"}
          </button>
        </div>


{/* History Button */}
<button
  onClick={handleHistory}
  disabled={histLoad}
  style={styles.historyBtn}>
  {histLoad
    ? "Loading..."
    : showHist
    ? "Hide History"
    : "Show History"}
</button>

      </div>

      {/* ── Prediction Result ─────────────────────────── */}
      {result && (
        <div style={styles.card}>
          <div style={styles.stockHeader}>
            <span style={styles.stockName}>{result.stock}</span>
            <span style={styles.ticker}>{result.ticker}</span>
          </div>

          <div style={styles.priceRow}>
            <div style={styles.priceBlock}>
              <p style={styles.priceLabel}>Current price</p>
              <p style={styles.priceVal}>
                ₹{Number(result.current_price).toFixed(2)}
              </p>
            </div>

            <div style={styles.arrowBlock}>
              <p style={styles.arrow}>→</p>
            </div>

            <div style={styles.priceBlock}>
              <p style={styles.priceLabel}>Predicted price</p>
              <p style={styles.priceVal}>
                ₹{Number(result.predicted_price).toFixed(2)}
              </p>
            </div>
          </div>

          <div style={styles.directionRow}>
            <span style={
              result.direction.includes("UP")
              ? styles.badgeUp
              : styles.badgeDown
            }>
              {result.direction.includes("UP") ? "↑ UP" : "↓ DOWN"}
            </span>
          </div>

          <p style={styles.timestamp}>
            Predicted at {result.predicted_at}
          </p>
        </div>
      )}

      {/* ── Backtest Result ───────────────────────────── */}
      {backtest && (
        <div style={styles.card}>
          <p style={styles.sectionTitle}>
            Backtest — {backtest.stock}
          </p>

          <div style={styles.metricsGrid}>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Initial capital</p>
              <p style={styles.mVal}>₹1,00,000</p>
            </div>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Final value</p>
              <p style={styles.mVal}>
                ₹{Number(backtest.final_value).toLocaleString("en-IN")}
              </p>
            </div>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Total return</p>
              <p style={{
                ...styles.mVal,
                color: backtest.total_return > 0
                       ? "#0F6E56" : "#993C1D"
              }}>
                {backtest.total_return > 0 ? "+" : ""}
                {Number(backtest.total_return).toFixed(2)}%
              </p>
            </div>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Sharpe ratio</p>
              <p style={styles.mVal}>
                {Number(backtest.sharpe_ratio).toFixed(2)}
              </p>
            </div>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Max drawdown</p>
              <p style={{...styles.mVal, color: "#993C1D"}}>
                {Number(backtest.max_drawdown).toFixed(2)}%
              </p>
            </div>
            <div style={styles.metric}>
              <p style={styles.mLabel}>Alpha vs B&H</p>
              <p style={{
                ...styles.mVal,
                color: backtest.alpha > 0
                       ? "#0F6E56" : "#993C1D"
              }}>
                {backtest.alpha > 0 ? "+" : ""}
                {Number(backtest.alpha).toFixed(2)}%
              </p>
            </div>
          </div>

          <div style={styles.sharpeTag(backtest.sharpe_ratio)}>
            Sharpe {Number(backtest.sharpe_ratio).toFixed(2)}
            {backtest.sharpe_ratio >= 2
              ? " — excellent strategy"
              : backtest.sharpe_ratio >= 1
              ? " — good strategy"
              : " — needs improvement"}
          </div>
        </div>
      )}
{/* ── History ──────────────────────────────────── */}
{showHist && (
  <div style={styles.card}>
    <p style={styles.sectionTitle}>
      Recent Predictions
    </p>

    {history.length === 0 ? (
      <p style={{
        textAlign: "center",
        color:     "#9CA3AF",
        fontSize:  14
      }}>
        No predictions yet!
      </p>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Stock</th>
            <th style={styles.th}>Current</th>
            <th style={styles.th}>Predicted</th>
            <th style={styles.th}>Direction</th>
            <th style={styles.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} style={
              i % 2 === 0
              ? styles.trEven
              : styles.trOdd
            }>
              <td style={styles.td}>{h.stock}</td>
              <td style={styles.td}>
                ₹{Number(h.current_price).toFixed(2)}
              </td>
              <td style={styles.td}>
                ₹{Number(h.predicted_price).toFixed(2)}
              </td>
              <td style={{
                ...styles.td,
                color:      h.direction.includes("UP")
                            ? "#0F6E56" : "#993C1D",
                fontWeight: 600
              }}>
                {h.direction}
              </td>
              <td style={{
                ...styles.td,
                color:    "#9CA3AF",
                fontSize: 12
              }}>
                {h.predicted_at}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
    </div>
  );
}

const styles = {

historyBtn: {
  width:           "100%",
  padding:         "10px",
  fontSize:        14,
  fontWeight:      600,
  backgroundColor: "#F3F4F6",
  color:           "#374151",
  border:          "1px solid #E5E7EB",
  borderRadius:    10,
  cursor:          "pointer",
  marginTop:       10
},
table: {
  width:          "100%",
  borderCollapse: "collapse",
  fontSize:       13
},
th: {
  padding:         "8px 10px",
  textAlign:       "left",
  fontSize:        11,
  fontWeight:      600,
  color:           "#6B7280",
  textTransform:   "uppercase",
  letterSpacing:   0.5,
  borderBottom:    "1px solid #E5E7EB"
},
td: {
  padding:      "10px",
  color:        "#0D1117",
  borderBottom: "1px solid #F3F4F6"
},
trEven: {
  backgroundColor: "#F9FAFB"
},
trOdd: {
  backgroundColor: "#FFFFFF"
},

  page: {
    maxWidth:        600,
    margin:          "0 auto",
    padding:         "24px 16px",
    fontFamily:      "Inter, Arial, sans-serif",
    backgroundColor: "#F8F9FB",
    minHeight:       "100vh"
  },
  header: {
    textAlign:    "center",
    marginBottom: 24
  },
  badge: {
    display:         "inline-block",
    fontSize:        11,
    fontWeight:      600,
    letterSpacing:   1,
    textTransform:   "uppercase",
    color:           "#185FA5",
    backgroundColor: "#E6F1FB",
    padding:         "4px 12px",
    borderRadius:    20,
    marginBottom:    10
  },
  title: {
    fontSize:   26,
    fontWeight: 700,
    color:      "#0D1117",
    margin:     "0 0 6px"
  },
  subtitle: {
    fontSize: 14,
    color:    "#6B7280",
    margin:   0
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius:    16,
    padding:         "20px 20px",
    marginBottom:    16,
    border:          "1px solid #E5E7EB"
  },
  label: {
    fontSize:     12,
    fontWeight:   600,
    color:        "#6B7280",
    textTransform:"uppercase",
    letterSpacing:0.5,
    marginBottom: 6,
    marginTop:    0
  },
  select: {
    width:           "100%",
    padding:         "10px 14px",
    fontSize:        15,
    borderRadius:    10,
    border:          "1px solid #E5E7EB",
    backgroundColor: "#F9FAFB",
    color:           "#0D1117",
    marginBottom:    14,
    outline:         "none"
  },
  btnRow: {
    display: "flex",
    gap:     10
  },
  predictBtn: {
    flex:            1,
    padding:         "12px",
    fontSize:        14,
    fontWeight:      600,
    backgroundColor: "#185FA5",
    color:           "#FFFFFF",
    border:          "none",
    borderRadius:    10,
    cursor:          "pointer"
  },
  backtestBtn: {
    flex:            1,
    padding:         "12px",
    fontSize:        14,
    fontWeight:      600,
    backgroundColor: "#0F6E56",
    color:           "#FFFFFF",
    border:          "none",
    borderRadius:    10,
    cursor:          "pointer"
  },
  stockHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   16
  },
  stockName: {
    fontSize:   18,
    fontWeight: 700,
    color:      "#0D1117"
  },
  ticker: {
    fontSize:        12,
    color:           "#185FA5",
    backgroundColor: "#E6F1FB",
    padding:         "3px 10px",
    borderRadius:    20
  },
  priceRow: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   16
  },
  priceBlock: {
    flex:      1,
    textAlign: "center"
  },
  priceLabel: {
    fontSize:    12,
    color:       "#6B7280",
    margin:      "0 0 4px",
    fontWeight:  500
  },
  priceVal: {
    fontSize:   22,
    fontWeight: 700,
    color:      "#0D1117",
    margin:     0
  },
  arrowBlock: {
    padding: "0 10px"
  },
  arrow: {
    fontSize: 20,
    color:    "#9CA3AF",
    margin:   0
  },
  directionRow: {
    textAlign:    "center",
    marginBottom: 10
  },
  badgeUp: {
    display:         "inline-block",
    fontSize:        15,
    fontWeight:      700,
    color:           "#0F6E56",
    backgroundColor: "#E1F5EE",
    padding:         "6px 20px",
    borderRadius:    20
  },
  badgeDown: {
    display:         "inline-block",
    fontSize:        15,
    fontWeight:      700,
    color:           "#993C1D",
    backgroundColor: "#FAECE7",
    padding:         "6px 20px",
    borderRadius:    20
  },
  timestamp: {
    textAlign:  "center",
    fontSize:   12,
    color:      "#9CA3AF",
    margin:     0
  },
  sectionTitle: {
    fontSize:     15,
    fontWeight:   700,
    color:        "#0D1117",
    marginBottom: 16,
    marginTop:    0
  },
  metricsGrid: {
    display:             "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap:                 10,
    marginBottom:        14
  },
  metric: {
    backgroundColor: "#F9FAFB",
    borderRadius:    10,
    padding:         "12px 10px",
    textAlign:       "center",
    border:          "1px solid #F3F4F6"
  },
  mLabel: {
    fontSize:  11,
    color:     "#6B7280",
    margin:    "0 0 4px",
    fontWeight:500
  },
  mVal: {
    fontSize:   16,
    fontWeight: 700,
    color:      "#0D1117",
    margin:     0
  },
  sharpeTag: (sharpe) => ({
    textAlign:       "center",
    fontSize:        13,
    fontWeight:      500,
    padding:         "8px 16px",
    borderRadius:    10,
    backgroundColor: sharpe >= 2
                     ? "#E1F5EE"
                     : sharpe >= 1
                     ? "#FAEEDA"
                     : "#FAECE7",
    color:           sharpe >= 2
                     ? "#0F6E56"
                     : sharpe >= 1
                     ? "#854F0B"
                     : "#993C1D"
  })
};
