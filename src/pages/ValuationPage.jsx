// src/pages/ValuationPage.jsx
// 💰 Valuation Page — เวอร์ชันอัพเดท + DCF ดีขึ้น (May 2026)

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStockQuote, getFinancialStatements } from '../services/api/stockAPI';

const C = {
  bg: '#060610', s1: '#0e0e20', s2: '#141428', s3: '#1a1a35',
  border: 'rgba(255,255,255,0.06)', text: '#d4d8e8', muted: 'rgba(200,210,230,0.38)',
  up: '#00e5a0', down: '#ff5757', hold: '#ffb830', watch: '#38b6ff',
  blue: '#4f8ef7', purple: '#9d71f5', teal: '#00c4b4',
};

const THAI_SYM = ['PTT', 'AOT', 'CPALL', 'KBANK', 'SCB', 'ADVANC', 'SCC', 'BBL'];

// ==================== DCF IMPROVED ====================
const calculateDCF = ({ eps, g, r, tg, n = 10, terminalGrowthCap = 4 }) => {
  if (!eps || eps <= 0 || r <= tg || r <= 0) {
    return { value: null, error: "ข้อมูลไม่ถูกต้อง (EPS > 0 และ Discount Rate > Terminal Growth)" };
  }

  const gr = g / 100;
  const rr = r / 100;
  const tgr = Math.min(tg / 100, terminalGrowthCap / 100);

  let pvExplicit = 0;
  let cf = eps;

  // Stage 1: High Growth Period (10 ปี)
  for (let i = 1; i <= n; i++) {
    cf *= (1 + gr);
    pvExplicit += cf / Math.pow(1 + rr, i);
  }

  // Stage 2: Terminal Value
  const terminalValue = (cf * (1 + tgr)) / (rr - tgr);
  const pvTerminal = terminalValue / Math.pow(1 + rr, n);

  const fairValue = pvExplicit + pvTerminal;

  return {
    value: Math.round(fairValue * 100) / 100,
    explicitPV: Math.round(pvExplicit * 100) / 100,
    terminalPV: Math.round(pvTerminal * 100) / 100,
    terminalValue: Math.round(terminalValue * 100) / 100,
  };
};

// Other valuation functions
const GRAHAM = (eps, bvps) => (eps > 0 && bvps > 0) ? Math.sqrt(22.5 * eps * bvps) : null;
const PE_FAIR = (eps, pe) => (eps > 0 && pe > 0) ? eps * pe : null;
const PEG = (price, eps, g) => {
  if (!price || !eps || eps <= 0 || g <= 0) return null;
  return (price / eps) / g;
};
const MOS = (fair, price) => (fair && price > 0) ? ((fair - price) / fair) * 100 : null;

// UI Components
const Card = ({ children, style }) => (
  <div style={{
    background: C.s2, border: `1px solid ${C.border}`, borderRadius: '16px',
    padding: '20px', marginBottom: '16px', ...style
  }}>
    {children}
  </div>
);

const SecHead = ({ icon, title, color = C.blue }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
    <span style={{ fontSize: '18px' }}>{icon}</span>
    <span style={{ fontSize: '15px', fontWeight: '800', color, letterSpacing: '0.5px' }}>{title}</span>
  </div>
);

const Row = ({ label, value, color, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
    borderBottom: last ? 'none' : `1px solid ${C.border}`
  }}>
    <span style={{ color: C.muted, fontSize: '13px' }}>{label}</span>
    <span style={{ fontWeight: '700', color: color || C.text, fontSize: '15px' }}>{value}</span>
  </div>
);

const ValuationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Stock data
  const [symInput, setSymInput] = useState(searchParams.get('symbol') || '');
  const [price, setPrice] = useState(0);
  const [manualPrice, setManualPrice] = useState(0);
  const [fetchSym, setFetchSym] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  // Valuation inputs
  const [eps, setEps] = useState(5);
  const [bvps, setBvps] = useState(30);
  const [gr, setGr] = useState(10);     // Growth Rate %
  const [dr, setDr] = useState(10);     // Discount Rate %
  const [tg, setTg] = useState(3);      // Terminal Growth %
  const [tpe, setTpe] = useState(20);

  const currentPrice = price || manualPrice;
  const curr = THAI_SYM.includes(fetchSym) ? '฿' : '$';

  // Calculations
  const dcfResult = useMemo(() => calculateDCF({ eps, g: gr, r: dr, tg }), [eps, gr, dr, tg]);
  const grahVal = useMemo(() => GRAHAM(eps, bvps), [eps, bvps]);
  const peFairVal = useMemo(() => PE_FAIR(eps, tpe), [eps, tpe]);
  const pegVal = useMemo(() => PEG(currentPrice, eps, gr), [currentPrice, eps, gr]);

  const mosDCF = MOS(dcfResult.value, currentPrice);
  const mosGrah = MOS(grahVal, currentPrice);
  const mosPE = MOS(peFairVal, currentPrice);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📊 Stock Valuation</h1>

      {/* DCF Section */}
      <Card>
        <SecHead icon="📈" title="DCF Valuation (2-Stage Model)" color={C.blue} />
        {dcfResult.error ? (
          <p style={{ color: C.down }}>{dcfResult.error}</p>
        ) : (
          <>
            <Row label="Fair Value (DCF)" value={`${curr} ${dcfResult.value}`} color={C.up} />
            <Row label="• Explicit Period (10 ปี)" value={`${curr} ${dcfResult.explicitPV}`} />
            <Row label="• Terminal Value (PV)" value={`${curr} ${dcfResult.terminalPV}`} last />
            <div style={{ marginTop: '12px', fontSize: '12.5px', color: C.muted }}>
              Growth {gr}% → Terminal {tg}% | Discount Rate {dr}%
            </div>
          </>
        )}
      </Card>

      {/* Graham, PE, PEG, MOS... (สามารถเพิ่มต่อได้) */}

      <div style={{ textAlign: 'center', marginTop: '40px', color: C.muted, fontSize: '13px' }}>
        Disclaimer: ไม่ใช่คำแนะนำการลงทุน • ใช้เพื่อการศึกษาเท่านั้น
      </div>
    </div>
  );
};

export default ValuationPage;