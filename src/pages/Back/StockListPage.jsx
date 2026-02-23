// src/pages/StockListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getStockQuote, searchStocks } from '../services/api/stockAPI';

// ============================================================
// 🎨 Styles
// ============================================================
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
    fontFamily: "'Sarabun', 'Segoe UI', sans-serif",
    color: '#e8e8f0',
    paddingBottom: '60px',
  },
  header: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '20px 16px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.8)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  refreshBtn: {
    background: 'rgba(96,165,250,0.15)',
    border: '1px solid rgba(96,165,250,0.3)',
    borderRadius: '10px',
    color: '#60a5fa',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    fontWeight: '600',
  },
  searchWrap: { position: 'relative', marginBottom: '16px' },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '14px',
    color: '#e8e8f0',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0.5,
    fontSize: '18px',
    pointerEvents: 'none',
  },
  tabBar: { display: 'flex', gap: '4px' },
  tab: (active) => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
    background: active ? 'rgba(96,165,250,0.1)' : 'transparent',
    color: active ? '#60a5fa' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: 'inherit',
    borderRadius: '10px 10px 0 0',
    transition: 'all 0.2s',
  }),
  body: { padding: '20px 16px' },
  summaryBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '10px 16px',
    whiteSpace: 'nowrap',
    minWidth: 'fit-content',
  },
  sortBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  sortBtn: (active) => ({
    padding: '6px 14px',
    borderRadius: '20px',
    border: active ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
    color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    fontWeight: active ? '700' : '400',
    transition: 'all 0.2s',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
    gap: '12px',
  },
  card: (isUp) => ({
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${isUp ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
    borderRadius: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.25s',
    position: 'relative',
    overflow: 'hidden',
  }),
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(96,165,250,0.2)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#fca5a5',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.3)',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// ============================================================
// 📊 ข้อมูลหุ้น
// ============================================================
const US_STOCKS  = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'];
const THAI_STOCKS = ['PTT', 'AOT', 'CPALL', 'KBANK', 'SCB', 'ADVANC', 'SCC', 'BBL'];

const NAMES = {
  AAPL: 'Apple',      MSFT: 'Microsoft',  GOOGL: 'Alphabet',  AMZN: 'Amazon',
  TSLA: 'Tesla',      META: 'Meta',        NVDA: 'NVIDIA',     JPM: 'JPMorgan',
  PTT: 'ปตท.',        AOT: 'ท่าอากาศยาน', CPALL: 'ซีพี ออลล์', KBANK: 'กสิกรไทย',
  SCB: 'ไทยพาณิชย์', ADVANC: 'AIS',       SCC: 'ปูนซิเมนต์',  BBL: 'กรุงเทพ',
};

const UP   = '#34d399';
const DOWN = '#f87171';

// ============================================================
// 🃏 Card Component
// ============================================================
const StockCard = ({ stock, onClick }) => {
  const isUp = parseFloat(stock.change) >= 0;
  const color = isUp ? UP : DOWN;
  const curr = stock.currency === 'THB' ? '฿' : '$';

  return (
    <div
      style={S.card(isUp)}
      onClick={() => onClick(stock.symbol)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}25`;
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
    >
      {/* Glow Corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '50px', height: '50px',
        background: `radial-gradient(circle, ${color}25, transparent 70%)`,
        borderRadius: '0 16px 0 0', pointerEvents: 'none',
      }} />

      {/* Symbol */}
      <div style={{ fontSize: '15px', fontWeight: '800', color, letterSpacing: '0.5px' }}>
        {stock.symbol}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {stock.name}
      </div>

      {/* Price */}
      <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
        {curr}{typeof stock.price === 'number' ? stock.price.toFixed(2) : '-'}
      </div>

      {/* Change */}
      <div style={{ fontSize: '12px', fontWeight: '600', color, display: 'flex', gap: '4px' }}>
        <span>{isUp ? '▲' : '▼'}</span>
        <span>{typeof stock.change === 'number' ? Math.abs(stock.change).toFixed(2) : '-'}</span>
        <span>({stock.changePercent})</span>
      </div>

      {/* H / L */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[['สูง', stock.high, UP], ['ต่ำ', stock.low, DOWN], ['ปิด', stock.previousClose, 'rgba(255,255,255,0.6)']].map(([label, val, c]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: c }}>
              {typeof val === 'number' ? val.toFixed(1) : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 📋 List Row Component
// ============================================================
const StockRow = ({ stock, onClick }) => {
  const isUp = parseFloat(stock.change) >= 0;
  const color = isUp ? UP : DOWN;
  const curr = stock.currency === 'THB' ? '฿' : '$';

  return (
    <div
      style={S.listRow}
      onClick={() => onClick(stock.symbol)}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = `${color}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {/* Symbol + Name */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color }}>{stock.symbol}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{stock.name}</div>
      </div>

      {/* High / Low */}
      <div style={{ display: 'flex', gap: '20px', padding: '0 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>สูง</div>
          <div style={{ fontSize: '12px', color: UP }}>{typeof stock.high === 'number' ? stock.high.toFixed(2) : '-'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>ต่ำ</div>
          <div style={{ fontSize: '12px', color: DOWN }}>{typeof stock.low === 'number' ? stock.low.toFixed(2) : '-'}</div>
        </div>
      </div>

      {/* Price + Change */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '700', fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
          {curr}{typeof stock.price === 'number' ? stock.price.toFixed(2) : '-'}
        </div>
        <div style={{ fontSize: '12px', color, fontWeight: '600', marginTop: '2px' }}>
          {isUp ? '▲' : '▼'} {stock.changePercent}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 🏠 Main Component
// ============================================================
const StockListPage = () => {
  const [tab, setTab]               = useState('US');
  const [view, setView]             = useState('grid');
  const [sortBy, setSortBy]         = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks]         = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [searching, setSearching]   = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!searchQuery) {
      loadStocks();
    }
  }, [tab]);

  // โหลดหุ้นยอดนิยม
  const loadStocks = async () => {
    setLoading(true);
    setError(null);
    setSearchResult(null);

    const symbols = tab === 'US' ? US_STOCKS : THAI_STOCKS;

    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const q = await getStockQuote(sym);
          return { ...q, name: NAMES[sym] || sym, currency: tab === 'TH' ? 'THB' : 'USD' };
        } catch { return null; }
      })
    );

    const valid = results.filter(Boolean);
    if (valid.length === 0) setError('โหลดข้อมูลไม่ได้ กรุณาตรวจสอบ Finnhub API Key');
    setStocks(valid);
    setLoading(false);
  };

  // ค้นหาหุ้น
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query) { setSearchResult(null); return; }

    setSearching(true);
    try {
      const q = await getStockQuote(query.toUpperCase().trim());
      setSearchResult({ ...q, name: NAMES[q.symbol] || q.symbol, currency: 'USD' });
    } catch {
      setSearchResult(null);
    }
    setSearching(false);
  }, []);

  // เรียงลำดับ
  const getDisplayStocks = () => {
    if (searchQuery) return searchResult ? [searchResult] : [];

    return [...stocks].sort((a, b) => {
      if (sortBy === 'price')  return b.price - a.price;
      if (sortBy === 'change') return parseFloat(b.changePercent) - parseFloat(a.changePercent);
      if (sortBy === 'name')   return a.symbol.localeCompare(b.symbol);
      return 0;
    });
  };

  const handleClick = (symbol) => {
    window.location.href = `/stock/${symbol}`;
  };

  // Market stats
  const upCount   = stocks.filter(s => parseFloat(s.change) >= 0).length;
  const downCount = stocks.filter(s => parseFloat(s.change) < 0).length;
  const avgChange = stocks.length
    ? (stocks.reduce((sum, s) => sum + parseFloat(s.changePercent || 0), 0) / stocks.length).toFixed(2)
    : '0';

  const displayStocks = getDisplayStocks();

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        input::placeholder { color: rgba(255,255,255,0.3); }
        input:focus { border-color: rgba(96,165,250,0.5) !important; box-shadow: 0 0 0 3px rgba(96,165,250,0.1); }
        ::-webkit-scrollbar { height: 3px; width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <h1 style={S.title}>📈 Stock Market</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} style={S.iconBtn}>
              {view === 'grid' ? '☰' : '⊞'}
            </button>
            <button onClick={loadStocks} style={S.refreshBtn} disabled={loading}>
              {loading ? '⏳' : '↻'} รีเฟรช
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.searchInput}
            placeholder="ค้นหาหุ้น: AAPL, PTT, MSFT..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          {searching && (
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>⏳</span>
          )}
        </div>

        {/* Tabs */}
        <div style={S.tabBar}>
          {[{ k: 'US', l: '🇺🇸 หุ้นสหรัฐ' }, { k: 'TH', l: '🇹🇭 หุ้นไทย' }].map(t => (
            <button key={t.k} style={S.tab(tab === t.k)} onClick={() => { setTab(t.k); setSearchQuery(''); setSearchResult(null); }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div style={S.body}>

        {/* Market Summary */}
        {!searchQuery && stocks.length > 0 && (
          <div style={S.summaryBar}>
            {[
              { label: '▲ ขึ้น', value: upCount, color: UP },
              { label: '▼ ลง', value: downCount, color: DOWN },
              { label: 'เฉลี่ย', value: `${parseFloat(avgChange) >= 0 ? '+' : ''}${avgChange}%`, color: parseFloat(avgChange) >= 0 ? UP : DOWN },
              { label: 'ตลาด', value: tab === 'US' ? 'NASDAQ' : 'SET', color: '#60a5fa' },
            ].map(item => (
              <div key={item.label} style={S.summaryCard}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sort */}
        {!searchQuery && (
          <div style={S.sortBar}>
            {[
              { k: 'default', l: '⭐ ยอดนิยม' },
              { k: 'change',  l: '📊 เปลี่ยนแปลง' },
              { k: 'price',   l: '💰 ราคา' },
              { k: 'name',    l: '🔤 A-Z' },
            ].map(s => (
              <button key={s.k} style={S.sortBtn(sortBy === s.k)} onClick={() => setSortBy(s.k)}>
                {s.l}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={S.error}>
            <span>⚠️ {error}</span>
            <button
              onClick={loadStocks}
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#fca5a5', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Search: not found */}
        {searchQuery && !searching && !searchResult && (
          <div style={S.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div>ไม่พบหุ้น "{searchQuery}"</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>ลอง: AAPL, MSFT, GOOGL, PTT, KBANK</div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>กำลังโหลดข้อมูล...</div>
          </div>
        ) : displayStocks.length === 0 && !searchQuery ? (
          <div style={S.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div>ไม่มีข้อมูลหุ้น</div>
          </div>
        ) : view === 'grid' ? (
          <div style={S.grid}>
            {displayStocks.map(s => <StockCard key={s.symbol} stock={s} onClick={handleClick} />)}
          </div>
        ) : (
          <div>
            {displayStocks.map(s => <StockRow key={s.symbol} stock={s} onClick={handleClick} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockListPage;
