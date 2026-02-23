// src/pages/StockDetailPage.jsx
// ✅ ไม่ใช้ Recharts - วาด SVG เอง ไม่มี dependency
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getStockNews,
} from '../services/api/stockAPI';

// ─────────────────────────────────
// 🎨 Design tokens
// ─────────────────────────────────
const C = {
  bg:      '#0d0d1a',
  surface: '#141424',
  card:    '#1a1a2e',
  border:  'rgba(255,255,255,0.07)',
  text:    '#e2e8f0',
  muted:   'rgba(255,255,255,0.38)',
  up:      '#34d399',
  down:    '#f87171',
  blue:    '#60a5fa',
  yellow:  '#fbbf24',
  purple:  '#a78bfa',
};

const THAI = ['PTT','AOT','CPALL','KBANK','SCB','ADVANC','SCC','BBL','TRUE','MINT','DELTA','KTC','GULF','BGRIM'];

// ─────────────────────────────────
// 📐 Technical Indicator Calculators
// ─────────────────────────────────
const calcSMA = (data, period) => {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
};

const calcRSI = (closes, period = 14) => {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

const calcMACD = (closes) => {
  if (closes.length < 26) return null;
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    return data.reduce((acc, v, i) => {
      if (i === 0) return [v];
      return [...acc, v * k + acc[i-1] * (1-k)];
    }, []);
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.slice(-ema26.length).map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  const last = macdLine[macdLine.length - 1];
  const sig  = signal[signal.length - 1];
  return { macd: last, signal: sig, histogram: last - sig };
};

const calcBollinger = (closes, period = 20) => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean  = slice.reduce((s, v) => s + v, 0) / period;
  const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
};

// ─────────────────────────────────
// 📊 SVG Chart Component (ไม่ต้อง Recharts)
// ─────────────────────────────────
const SVGChart = ({ data, color, showMA = true, width: W = 600, height: H = 220 }) => {
  const PAD = { top: 12, right: 12, bottom: 28, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  if (!data || data.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
        ไม่มีข้อมูลกราฟ
      </div>
    );
  }

  const closes = data.map(d => d.close);
  const sma20  = showMA ? calcSMA(closes, 20) : [];

  const allVals = [...closes, ...(showMA ? sma20.filter(Boolean) : [])];
  const minV = Math.min(...allVals) * 0.998;
  const maxV = Math.max(...allVals) * 1.002;
  const rangeV = maxV - minV || 1;

  const toX = i => PAD.left + (i / (data.length - 1)) * cW;
  const toY = v => PAD.top  + (1 - (v - minV) / rangeV) * cH;

  // Price line
  const pricePts  = closes.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaPath  = `M${toX(0)},${toY(closes[0])} ` +
    closes.map((v, i) => `L${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ') +
    ` L${toX(closes.length-1)},${PAD.top+cH} L${PAD.left},${PAD.top+cH} Z`;

  // MA20 line
  const ma20Pts = sma20
    .map((v, i) => v !== null ? `${toX(i).toFixed(1)},${toY(v).toFixed(1)}` : null)
    .filter(Boolean).join(' ');

  // Y-axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => minV + (rangeV * i) / yTicks);

  // X-axis labels (show ~5)
  const xStep = Math.floor(data.length / 5) || 1;
  const xLabels = data
    .map((d, i) => i % xStep === 0 || i === data.length - 1 ? { i, label: d.date?.slice(5) || '' } : null)
    .filter(Boolean);

  // Last dot
  const lastX = toX(closes.length - 1);
  const lastY = toY(closes[closes.length - 1]);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={PAD.left} y={PAD.top} width={cW} height={cH} />
        </clipPath>
      </defs>

      {/* Grid */}
      {yTickVals.map((v, i) => (
        <line key={i} x1={PAD.left} y1={toY(v)} x2={PAD.left + cW} y2={toY(v)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGrad)" clipPath="url(#chartClip)" />

      {/* MA20 line */}
      {showMA && ma20Pts && (
        <polyline points={ma20Pts} fill="none"
          stroke={C.yellow} strokeWidth="1.2" strokeDasharray="4 2"
          clipPath="url(#chartClip)" opacity="0.7" />
      )}

      {/* Price line */}
      <polyline points={pricePts} fill="none"
        stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        clipPath="url(#chartClip)" />

      {/* Last price dot */}
      <circle cx={lastX} cy={lastY} r="4" fill={color} stroke={C.bg} strokeWidth="2" />

      {/* Y-axis labels */}
      {yTickVals.map((v, i) => (
        <text key={i} x={PAD.left - 6} y={toY(v) + 4}
          fill={C.muted} fontSize="10" textAnchor="end">
          {v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(1)}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - 6}
          fill={C.muted} fontSize="10" textAnchor="middle">
          {label}
        </text>
      ))}

      {/* MA legend */}
      {showMA && (
        <g>
          <line x1={PAD.left + cW - 60} y1={PAD.top + 10} x2={PAD.left + cW - 44} y2={PAD.top + 10}
            stroke={C.yellow} strokeWidth="1.5" strokeDasharray="4 2" />
          <text x={PAD.left + cW - 40} y={PAD.top + 14} fill={C.yellow} fontSize="9">MA20</text>
        </g>
      )}
    </svg>
  );
};

// ─────────────────────────────────
// 🧩 UI Primitives
// ─────────────────────────────────
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '18px 20px', ...style }}>
    {children}
  </div>
);

const Row = ({ label, value, color, border = true }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', ...(border ? { borderBottom: `1px solid ${C.border}` } : {}) }}>
    <span style={{ fontSize: '13px', color: C.muted }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: '700', color: color || C.text }}>{value}</span>
  </div>
);

const Badge = ({ children, color = C.blue }) => (
  <span style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: '7px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', color }}>
    {children}
  </span>
);

const Skel = ({ h = 18, w = '100%', mb = 8 }) => (
  <div style={{ height: h, width: w, background: 'rgba(255,255,255,0.06)', borderRadius: 8, marginBottom: mb, animation: 'pulse 1.5s infinite' }} />
);

// ─────────────────────────────────
// 📊 Indicator Gauge
// ─────────────────────────────────
const RSIGauge = ({ value }) => {
  if (value === null || value === undefined) return <span style={{ color: C.muted }}>—</span>;
  const pct = Math.min(Math.max(value, 0), 100);
  const color = value < 30 ? C.up : value > 70 ? C.down : C.yellow;
  const label = value < 30 ? 'Oversold (ซื้อ)' : value > 70 ? 'Overbought (ขาย)' : 'Neutral';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '22px', fontWeight: '900', color, fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(1)}</span>
        <Badge color={color}>{label}</Badge>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: C.muted }}>
        <span>0 — ซื้อ</span><span>ขาย — 100</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────
// 🏠 Main
// ─────────────────────────────────
const StockDetailPage = () => {
  const { symbol } = useParams();
  const navigate   = useNavigate();
  const sym        = symbol?.toUpperCase() || '';
  const curr       = THAI.includes(sym) ? '฿' : '$';

  const [quote,   setQuote]   = useState(null);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [news,    setNews]    = useState([]);
  const [tab,     setTab]     = useState('chart');
  const [period,  setPeriod]  = useState('1M');
  const [showMA,  setShowMA]  = useState(true);
  const [lQ, setLQ] = useState(true);
  const [lH, setLH] = useState(true);
  const [lP, setLP] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { if (sym) loadAll(); }, [sym]);

  const loadAll = async () => {
    setError(null); setLQ(true); setLH(true); setLP(true);

    // Quote
    try {
      const q = await getStockQuote(sym);
      setQuote(q);
    } catch {
      setError(`ไม่พบหุ้น "${sym}" — ตรวจสอบ Symbol หรือ Finnhub API Key`);
    } finally { setLQ(false); }

    // History
    try {
      const h = await getStockHistory(sym, 'daily');
      setHistory(Array.isArray(h) ? h : []);
    } catch { setHistory([]); }
    finally { setLH(false); }

    // Profile & News (ไม่บังคับ)
    getCompanyProfile(sym).then(setProfile).catch(() => setProfile(null)).finally(() => setLP(false));
    getStockNews(sym).then(setNews).catch(() => setNews([]));
  };

  // กรองข้อมูลตาม period
  const chartData = useMemo(() => {
    if (!history.length) return [];
    const n = { '1W':7,'1M':30,'3M':90,'6M':180,'1Y':365 }[period] || 30;
    return history.slice(-n);
  }, [history, period]);

  // คำนวณ Indicators จากข้อมูลทั้งหมด (ไม่ filter)
  const indicators = useMemo(() => {
    if (history.length < 14) return null;
    const closes = history.map(d => d.close).filter(Boolean);
    const rsi    = calcRSI(closes);
    const macd   = calcMACD(closes);
    const boll   = calcBollinger(closes);
    const sma20v = calcSMA(closes, 20);
    const sma50v = calcSMA(closes, 50);
    const ma20   = sma20v[sma20v.length - 1];
    const ma50   = sma50v.filter(Boolean).pop();
    const last   = closes[closes.length - 1];
    const high52 = Math.max(...history.slice(-252).map(d => d.high || d.close));
    const low52  = Math.min(...history.slice(-252).map(d => d.low  || d.close));
    return { rsi, macd, boll, ma20, ma50, last, high52, low52 };
  }, [history]);

  const isUp  = quote ? parseFloat(quote.change) >= 0 : true;
  const color = isUp ? C.up : C.down;

  // ─── Error screen ───
  if (!lQ && error) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'Sarabun,sans-serif', color:C.text }}>
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
        <div style={{ textAlign:'center', maxWidth:'360px' }}>
          <div style={{ fontSize:'52px', marginBottom:'16px' }}>⚠️</div>
          <div style={{ fontSize:'16px', fontWeight:'700', color:'#fca5a5', marginBottom:'10px' }}>{error}</div>
          <div style={{ fontSize:'13px', color:C.muted, lineHeight:1.8, marginBottom:'28px' }}>
            US: AAPL · MSFT · GOOGL · TSLA · NVDA<br/>
            🇹🇭 SET: PTT · AOT · KBANK · SCB
          </div>
          <button onClick={() => navigate('/')} style={{ background:'rgba(96,165,250,0.15)', border:`1px solid ${C.blue}`, borderRadius:'12px', color:C.blue, padding:'12px 28px', cursor:'pointer', fontSize:'14px', fontWeight:'700', fontFamily:'inherit' }}>← กลับหน้าหลัก</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'Sarabun','Segoe UI',sans-serif", paddingBottom:'80px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        button:active{transform:scale(0.97)}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(13,13,26,0.94)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${C.border}`, padding:'14px 20px', display:'flex', alignItems:'center', gap:'14px' }}>
        <button onClick={() => navigate('/')} style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, borderRadius:'10px', color:C.text, padding:'7px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>← กลับ</button>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:'20px', fontWeight:'900', color }}>{sym}</span>
          {THAI.includes(sym) && <span style={{ marginLeft:'8px', fontSize:'10px', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:'6px', padding:'2px 7px', color:C.yellow }}>🇹🇭 SET</span>}
          {profile && <span style={{ fontSize:'12px', color:C.muted, marginLeft:'10px' }}>{profile.companyName}</span>}
        </div>
<button onClick={() => navigate(`/valuation?symbol=${sym}`)}>
  💰 วิเคราะห์มูลค่า
</button>
        <button onClick={loadAll} style={{ background:'rgba(96,165,250,0.1)', border:`1px solid rgba(96,165,250,0.25)`, borderRadius:'10px', color:C.blue, padding:'7px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit', fontWeight:'700' }}>↻</button>
      </div>

      <div style={{ padding:'16px', maxWidth:'760px', margin:'0 auto' }}>

        {/* ── PRICE CARD ── */}
        <Card style={{ marginBottom:'14px', animation:'fadeIn 0.35s ease' }}>
          {lQ ? (
            <div><Skel h={44} w="50%" mb={10} /><Skel h={28} w="38%" mb={10} /><Skel h={14} w="75%" /></div>
          ) : quote ? (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'12px' }}>
                <span style={{ fontSize:'42px', fontWeight:'900', letterSpacing:'-1.5px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                  {curr}{typeof quote.price==='number' ? quote.price.toFixed(2) : '—'}
                </span>
                <div style={{ marginBottom:'6px', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ background:`${color}20`, border:`1px solid ${color}40`, borderRadius:'8px', padding:'4px 12px', fontSize:'15px', fontWeight:'800', color }}>
                    {isUp?'▲':'▼'} {typeof quote.change==='number' ? Math.abs(quote.change).toFixed(2) : '—'} ({quote.changePercent})
                  </span>
                  <span style={{ fontSize:'12px', color:C.muted }}>{quote.latestTradingDay}</span>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                {[['เปิด',quote.open,C.text],['สูงสุด',quote.high,C.up],['ต่ำสุด',quote.low,C.down],['ปิดก่อน',quote.previousClose,C.muted]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,0.03)', borderRadius:'10px' }}>
                    <div style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'4px' }}>{l}</div>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:c, fontVariantNumeric:'tabular-nums' }}>{curr}{typeof v==='number'?v.toFixed(2):'—'}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Card>

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:'4px', borderBottom:`1px solid ${C.border}`, marginBottom:'14px', overflowX:'auto' }}>
          {[['chart','📈 กราฟ'],['indicators','🔬 Indicators'],['info','🏢 บริษัท'],['news','📰 ข่าว']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:'9px 16px', border:'none', borderBottom:tab===k?`2px solid ${C.blue}`:'2px solid transparent', background:tab===k?'rgba(96,165,250,0.1)':'transparent', color:tab===k?C.blue:C.muted, cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:'inherit', borderRadius:'10px 10px 0 0', whiteSpace:'nowrap', transition:'all 0.15s' }}>{l}</button>
          ))}
        </div>

        {/* ═══════════════════════════════ */}
        {/* TAB: CHART                      */}
        {/* ═══════════════════════════════ */}
        {tab === 'chart' && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            <Card>
              {/* Controls */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
                <div style={{ display:'flex', gap:'5px' }}>
                  {['1W','1M','3M','6M','1Y'].map(p=>(
                    <button key={p} onClick={()=>setPeriod(p)} style={{ padding:'4px 10px', border:`1px solid ${period===p?C.blue:C.border}`, background:period===p?'rgba(96,165,250,0.15)':'transparent', color:period===p?C.blue:C.muted, borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:'700', fontFamily:'inherit' }}>{p}</button>
                  ))}
                </div>
                <button onClick={()=>setShowMA(v=>!v)} style={{ padding:'4px 10px', border:`1px solid ${showMA?C.yellow:C.border}`, background:showMA?'rgba(251,191,36,0.1)':'transparent', color:showMA?C.yellow:C.muted, borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:'700', fontFamily:'inherit' }}>
                  MA20 {showMA?'✓':'○'}
                </button>
              </div>

              {/* Chart */}
              {lH ? (
                <Skel h={220} />
              ) : (
                <SVGChart data={chartData} color={color} showMA={showMA} width={720} height={220} />
              )}

              {/* Volume bars (simple) */}
              {!lH && chartData.length > 1 && (
                <div style={{ marginTop:'8px' }}>
                  <div style={{ fontSize:'10px', color:C.muted, marginBottom:'4px' }}>Volume</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:'1px', height:'32px' }}>
                    {chartData.map((d, i) => {
                      const maxVol = Math.max(...chartData.map(x => x.volume || 0));
                      const pct = maxVol > 0 ? ((d.volume||0) / maxVol) * 100 : 0;
                      const barColor = d.close >= (d.open||d.close) ? C.up : C.down;
                      return (
                        <div key={i} style={{ flex:1, background:`${barColor}50`, height:`${pct}%`, borderRadius:'1px', minHeight:'1px' }} />
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* OHLC table ล่าสุด */}
            {!lH && chartData.length > 0 && (
              <Card style={{ marginTop:'12px' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', marginBottom:'12px' }}>📋 ข้อมูลล่าสุด ({chartData[chartData.length-1]?.date})</div>
                {(() => { const d = chartData[chartData.length-1]; return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px' }}>
                    {[['Open',d.open,C.text],['High',d.high,C.up],['Low',d.low,C.down],['Close',d.close,color],['Volume',d.volume?.toLocaleString(),'rgba(255,255,255,0.7)']].map(([l,v,c])=>(
                      <div key={l} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px' }}>
                        <div style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'3px' }}>{l}</div>
                        <div style={{ fontSize:'14px', fontWeight:'700', color:c, fontVariantNumeric:'tabular-nums' }}>{typeof v==='number'?v.toFixed(2):v||'—'}</div>
                      </div>
                    ))}
                  </div>
                ); })()}
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* TAB: INDICATORS                 */}
        {/* ═══════════════════════════════ */}
        {tab === 'indicators' && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            {lH ? (
              <Card><div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>{[1,2,3,4].map(i=><Skel key={i} h={18} />)}</div></Card>
            ) : !indicators ? (
              <Card><div style={{ textAlign:'center', padding:'40px', color:C.muted }}><div style={{ fontSize:'40px', marginBottom:'12px' }}>📊</div>ข้อมูลไม่เพียงพอสำหรับคำนวณ Indicators<br/><span style={{ fontSize:'12px' }}>ต้องการข้อมูลอย่างน้อย 26 วัน</span></div></Card>
            ) : (
              <>
                {/* RSI */}
                <Card style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>📉 RSI (14)</div>
                  <RSIGauge value={indicators.rsi} />
                </Card>

                {/* MACD */}
                <Card style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>📊 MACD</div>
                  {indicators.macd ? (
                    <>
                      <Row label="MACD Line"  value={indicators.macd.macd?.toFixed(4) || '—'} color={indicators.macd.macd > 0 ? C.up : C.down} />
                      <Row label="Signal"     value={indicators.macd.signal?.toFixed(4) || '—'} />
                      <Row label="Histogram"  value={indicators.macd.histogram?.toFixed(4) || '—'} color={indicators.macd.histogram > 0 ? C.up : C.down} />
                      <div style={{ marginTop:'12px', padding:'10px 14px', background: indicators.macd.histogram > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border:`1px solid ${indicators.macd.histogram > 0 ? C.up : C.down}30`, borderRadius:'10px' }}>
                        <span style={{ fontSize:'13px', fontWeight:'700', color: indicators.macd.histogram > 0 ? C.up : C.down }}>
                          {indicators.macd.histogram > 0 ? '📈 สัญญาณซื้อ (Bullish)' : '📉 สัญญาณขาย (Bearish)'}
                        </span>
                      </div>
                    </>
                  ) : <div style={{ color:C.muted }}>ข้อมูลไม่เพียงพอ</div>}
                </Card>

                {/* Moving Averages */}
                <Card style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>📏 Moving Averages</div>
                  <Row label="ราคาปัจจุบัน" value={`${curr}${indicators.last?.toFixed(2)}`} color={color} />
                  <Row label="SMA 20"       value={`${curr}${indicators.ma20?.toFixed(2) || '—'}`} color={C.yellow} />
                  <Row label="SMA 50"       value={`${curr}${indicators.ma50?.toFixed(2) || '—'}`} color={C.purple} />
                  {indicators.ma20 && (
                    <div style={{ marginTop:'12px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      <Badge color={indicators.last > indicators.ma20 ? C.up : C.down}>
                        {indicators.last > indicators.ma20 ? '▲ เหนือ MA20' : '▼ ต่ำกว่า MA20'}
                      </Badge>
                      {indicators.ma50 && (
                        <Badge color={indicators.last > indicators.ma50 ? C.up : C.down}>
                          {indicators.last > indicators.ma50 ? '▲ เหนือ MA50' : '▼ ต่ำกว่า MA50'}
                        </Badge>
                      )}
                    </div>
                  )}
                </Card>

                {/* Bollinger Bands */}
                <Card style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>🎯 Bollinger Bands (20)</div>
                  {indicators.boll ? (
                    <>
                      <Row label="Upper Band" value={`${curr}${indicators.boll.upper.toFixed(2)}`} color={C.down} />
                      <Row label="Middle"     value={`${curr}${indicators.boll.middle.toFixed(2)}`} />
                      <Row label="Lower Band" value={`${curr}${indicators.boll.lower.toFixed(2)}`} color={C.up} />
                      {(() => {
                        const pos = (indicators.last - indicators.boll.lower) / (indicators.boll.upper - indicators.boll.lower) * 100;
                        const posColor = pos > 80 ? C.down : pos < 20 ? C.up : C.yellow;
                        return (
                          <div style={{ marginTop:'12px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:C.muted, marginBottom:'6px' }}>
                              <span>Lower</span><span>% B = {pos.toFixed(1)}%</span><span>Upper</span>
                            </div>
                            <div style={{ height:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', position:'relative' }}>
                              <div style={{ position:'absolute', left:`${Math.min(Math.max(pos,2),98)}%`, top:'-3px', width:'12px', height:'12px', background:posColor, borderRadius:'50%', transform:'translateX(-50%)', border:`2px solid ${C.bg}` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : <div style={{ color:C.muted }}>ข้อมูลไม่เพียงพอ</div>}
                </Card>

                {/* 52-week */}
                <Card>
                  <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>📅 52-Week Range</div>
                  <Row label="52W High"     value={`${curr}${indicators.high52?.toFixed(2) || '—'}`} color={C.up} />
                  <Row label="52W Low"      value={`${curr}${indicators.low52?.toFixed(2)  || '—'}`} color={C.down} />
                  {indicators.high52 && indicators.low52 && (
                    <div style={{ marginTop:'12px' }}>
                      {(() => {
                        const range = indicators.high52 - indicators.low52;
                        const pos   = range > 0 ? ((indicators.last - indicators.low52) / range) * 100 : 50;
                        return (
                          <>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:C.muted, marginBottom:'6px' }}>
                              <span>{curr}{indicators.low52?.toFixed(2)}</span>
                              <span style={{ color:C.blue }}>ตำแหน่งปัจจุบัน: {pos.toFixed(1)}%</span>
                              <span>{curr}{indicators.high52?.toFixed(2)}</span>
                            </div>
                            <div style={{ height:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pos}%`, background:`linear-gradient(90deg, ${C.up}, ${C.blue})`, borderRadius:'3px' }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* TAB: INFO                       */}
        {/* ═══════════════════════════════ */}
        {tab === 'info' && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            {lP ? (
              <Card><div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>{[1,2,3,4].map(i=><Skel key={i} h={16} />)}</div></Card>
            ) : profile ? (
              <Card>
                <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'14px' }}>🏢 ข้อมูลบริษัท</div>
                {profile.logo && (
                  <img src={profile.logo} alt="logo" style={{ height:'36px', marginBottom:'14px', borderRadius:'8px' }} onError={e=>e.target.style.display='none'} />
                )}
                <Row label="ชื่อบริษัท"    value={profile.companyName||'—'} />
                <Row label="อุตสาหกรรม"   value={profile.industry||'—'} />
                <Row label="ตลาดหลักทรัพย์" value={profile.exchange||'—'} />
                <Row label="ประเทศ"        value={profile.country||'—'} />
                <Row label="สกุลเงิน"      value={profile.currency||'—'} />
                <Row label="Market Cap"    value={profile.marketCap ? `$${(profile.marketCap/1000).toFixed(2)}B` : '—'} />
                {profile.website && profile.website !== '-' && (
                  <div style={{ marginTop:'12px' }}>
                    <a href={profile.website} target="_blank" rel="noreferrer" style={{ color:C.blue, fontSize:'13px', textDecoration:'none' }}>
                      🔗 {profile.website}
                    </a>
                  </div>
                )}
              </Card>
            ) : (
              <Card><div style={{ textAlign:'center', padding:'40px', color:C.muted }}><div style={{ fontSize:'40px', marginBottom:'12px' }}>🏢</div>ไม่พบข้อมูลบริษัท</div></Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* TAB: NEWS                       */}
        {/* ═══════════════════════════════ */}
        {tab === 'news' && (
          <div style={{ animation:'fadeIn 0.3s ease' }}>
            {news.length === 0 ? (
              <Card><div style={{ textAlign:'center', padding:'40px', color:C.muted }}><div style={{ fontSize:'40px', marginBottom:'12px' }}>📰</div>ไม่มีข่าวล่าสุด</div></Card>
            ) : news.map((item, i) => (
              <Card key={item.id||i} style={{ marginBottom:'10px', cursor:'pointer' }} onClick={() => item.url && window.open(item.url,'_blank')}>
                <div style={{ display:'flex', gap:'12px' }}>
                  {item.image && (
                    <img src={item.image} alt="" style={{ width:'68px', height:'68px', borderRadius:'10px', objectFit:'cover', flexShrink:0 }} onError={e=>e.target.style.display='none'} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', marginBottom:'5px', lineHeight:1.4 }}>{item.headline}</div>
                    <div style={{ fontSize:'11px', color:C.muted, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{item.summary}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'7px' }}>
                      <span style={{ fontSize:'11px', color:C.blue }}>{item.source}</span>
                      <span style={{ fontSize:'11px', color:C.muted }}>{item.datetime}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default StockDetailPage;