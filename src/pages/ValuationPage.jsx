// src/pages/ValuationPage.jsx
// 💰 AUTO-FETCH งบการเงินจาก FMP API — ไม่ต้องใส่เอง!
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStockQuote, getFinancialStatements } from '../services/api/stockAPI';

// Colors
const C = {
  bg:'#060610', s1:'#0e0e20', s2:'#141428', s3:'#1a1a35',
  border:'rgba(255,255,255,0.06)', text:'#d4d8e8', muted:'rgba(200,210,230,0.38)',
  up:'#00e5a0', down:'#ff5757', hold:'#ffb830', watch:'#38b6ff',
  blue:'#4f8ef7', purple:'#9d71f5', teal:'#00c4b4',
};

const THAI_SYM = ['PTT','AOT','CPALL','KBANK','SCB','ADVANC','SCC','BBL'];

// Calculators
const DCF = ({eps,g,r,tg,n=10}) => {
  if (!eps||eps<=0||r<=tg) return null;
  const gr=g/100,rr=r/100,tgr=tg/100; let pv=0,cf=eps;
  for(let i=1;i<=n;i++){cf*=(1+gr);pv+=cf/(1+rr)**i;}
  return pv+(cf*(1+tgr))/((rr-tgr)*(1+rr)**n);
};
const GRAHAM = ({eps,bvps}) => eps>0&&bvps>0?Math.sqrt(22.5*eps*bvps):null;
const PE_FAIR = ({eps,pe}) => eps>0&&pe>0?eps*pe:null;
const PEG = ({price,eps,g}) => {
  if(!price||!eps||eps<=0||g<=0)return null;
  return(price/eps)/g;
};
const MOS = (fair,price) => fair&&price>0?((fair-price)/fair)*100:null;

// Scoring
const mosScore = m => {
  if(m===null)return 50;
  if(m>=40)return 98;if(m>=25)return 85;if(m>=15)return 72;if(m>=5)return 60;
  if(m>=-5)return 48;if(m>=-15)return 33;if(m>=-30)return 18;return 6;
};
const pegScore = p => {
  if(p===null)return 50;
  if(p<0.5)return 98;if(p<0.75)return 86;if(p<1.0)return 73;if(p<1.5)return 55;
  if(p<2.0)return 38;if(p<3.0)return 22;return 7;
};
const toSignal = score => {
  if(score>=75)return{label:'ซื้อ',en:'BUY',color:C.up,glow:'#00e5a040'};
  if(score>=55)return{label:'เฝ้าดู',en:'WATCH',color:C.watch,glow:'#38b6ff30'};
  if(score>=40)return{label:'ถือ',en:'HOLD',color:C.hold,glow:'#ffb83030'};
  return{label:'ขาย',en:'SELL',color:C.down,glow:'#ff575730'};
};

const SIGNAL_TEXT = {
  BUY:'ราคาต่ำกว่ามูลค่าจริงอย่างมีนัยสำคัญ — เหมาะพิจารณาซื้อ',
  WATCH:'ราคาใกล้เคียงมูลค่าจริง — รอจังหวะราคาลงหรือข้อมูลใหม่',
  HOLD:'ราคาสูงกว่ามูลค่าเล็กน้อย — ถือได้แต่ระวังความเสี่ยง',
  SELL:'ราคาสูงกว่ามูลค่าจริงมาก — ความเสี่ยงสูง',
};

// UI primitives
const Card = ({children,style}) => <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:'16px',padding:'20px',marginBottom:'12px',...style}}>{children}</div>;
const SecHead = ({icon,title,color=C.blue,right}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <span style={{fontSize:'16px'}}>{icon}</span>
      <span style={{fontSize:'13px',fontWeight:'800',color,textTransform:'uppercase',letterSpacing:'1px'}}>{title}</span>
    </div>
    {right}
  </div>
);
const Row = ({label,value,color,note,last}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',...(!last&&{borderBottom:`1px solid ${C.border}`})}}>
    <div>
      <div style={{fontSize:'12px',color:C.muted}}>{label}</div>
      {note&&<div style={{fontSize:'10px',color:'rgba(200,210,230,0.18)',marginTop:'1px'}}>{note}</div>}
    </div>
    <span style={{fontSize:'14px',fontWeight:'700',color:color||C.text,fontVariantNumeric:'tabular-nums'}}>{value}</span>
  </div>
);
const Pill = ({children,color}) => <span style={{background:`${color}18`,border:`1px solid ${color}40`,borderRadius:'6px',padding:'2px 9px',fontSize:'11px',fontWeight:'700',color,whiteSpace:'nowrap'}}>{children}</span>;

const Slide = ({label,hint,value,onChange,min,max,step=0.5,unit=''}) => {
  const pct=((value-min)/(max-min))*100;
  return(
    <div style={{marginBottom:'18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
        <div>
          <span style={{fontSize:'12px',color:C.muted}}>{label}</span>
          {hint&&<div style={{fontSize:'10px',color:'rgba(200,210,230,0.18)'}}>{hint}</div>}
        </div>
        <span style={{fontSize:'15px',fontWeight:'900',color:C.blue,fontVariantNumeric:'tabular-nums'}}>{value}{unit}</span>
      </div>
      <div style={{position:'relative',height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'3px'}}>
        <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${C.purple},${C.blue})`,borderRadius:'3px',transition:'width 0.15s'}}/>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))}
          style={{position:'absolute',inset:0,width:'100%',opacity:0,cursor:'pointer',height:'100%',margin:0}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'9px',color:'rgba(200,210,230,0.18)',marginTop:'3px'}}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
};

const NumBox = ({label,hint,value,onChange,placeholder}) => (
  <div style={{marginBottom:'12px'}}>
    <div style={{fontSize:'12px',color:C.muted,marginBottom:'3px'}}>{label}</div>
    {hint&&<div style={{fontSize:'10px',color:'rgba(200,210,230,0.18)',marginBottom:'4px'}}>{hint}</div>}
    <input type="number" value={value||''} placeholder={placeholder} onChange={e=>onChange(parseFloat(e.target.value)||0)}
      style={{width:'100%',padding:'9px 13px',background:C.s3,border:`1px solid ${C.border}`,borderRadius:'10px',color:C.text,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'border-color 0.2s'}}
      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);

// Radial meter
const Meter = ({score,color,size=160}) => {
  const r=58,cx=size/2,cy=size/2+10;
  const startAngle=215,sweep=270;
  const toRad=d=>(d*Math.PI)/180;
  const arcPath=(startDeg,sweepDeg)=>{
    const s=toRad(startDeg),e=toRad(startDeg+sweepDeg);
    const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s);
    const x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);
    const lg=sweepDeg>180?1:0;
    return`M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };
  const filledSweep=(score/100)*sweep;
  const circumference=2*Math.PI*r*(sweep/360);
  const dashLen=(filledSweep/360)*(2*Math.PI*r);
  return(
    <svg width={size} height={size-20} viewBox={`0 0 ${size} ${size-20}`}>
      <defs>
        <linearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.down}/><stop offset="50%" stopColor={C.hold}/><stop offset="100%" stopColor={C.up}/>
        </linearGradient>
      </defs>
      <path d={arcPath(startAngle,sweep)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round"/>
      <path d={arcPath(startAngle,sweep)} fill="none" stroke="url(#meterGrad)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${dashLen} ${circumference}`} style={{transition:'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)'}}/>
      <text x={cx} y={cy-12} textAnchor="middle" fill={color} style={{fontSize:'34px',fontWeight:'900',fontFamily:'Sarabun,monospace'}}>{Math.round(score)}</text>
      <text x={cx} y={cy+8} textAnchor="middle" fill={C.muted} style={{fontSize:'12px',fontFamily:'Sarabun,sans-serif'}}>/100</text>
    </svg>
  );
};

// Comparison bar
const CompBar = ({label,fair,price,color,curr}) => {
  if(!fair||!price)return null;
  const m=MOS(fair,price);
  const maxV=Math.max(fair,price)*1.12;
  const fp=Math.min((fair/maxV)*100,100);
  const pp=Math.min((price/maxV)*100,100);
  return(
    <div style={{marginBottom:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
        <span style={{fontSize:'12px',color:C.muted}}>{label}</span>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <span style={{fontSize:'14px',fontWeight:'800',color,fontVariantNumeric:'tabular-nums'}}>{curr}{fair.toFixed(2)}</span>
          <Pill color={m>=0?C.up:C.down}>{m>=0?'+':''}{m.toFixed(1)}%</Pill>
        </div>
      </div>
      <div style={{position:'relative',height:'10px',background:'rgba(255,255,255,0.05)',borderRadius:'5px',overflow:'visible'}}>
        <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${fp}%`,background:`${color}60`,borderRadius:'5px',transition:'width 0.6s ease'}}/>
        <div style={{position:'absolute',left:`${fp}%`,top:'-2px',transform:'translateX(-50%)',width:'2px',height:'14px',background:color,borderRadius:'1px'}}/>
        <div style={{position:'absolute',left:`${pp}%`,top:'-4px',transform:'translateX(-50%)',width:'3px',height:'18px',background:C.text,borderRadius:'2px'}}>
          <div style={{position:'absolute',bottom:'-14px',left:'50%',transform:'translateX(-50%)',fontSize:'8px',color:'rgba(200,210,230,0.18)',whiteSpace:'nowrap'}}>ราคา</div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════
// 🏠 MAIN
// ════════════════════════════════════════
const ValuationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Stock
  const [symInput,setSymInput] = useState(searchParams.get('symbol')||'');
  const [price,setPrice] = useState(0);
  const [manualPrice,setManualPrice] = useState(0);
  const [fetchSym,setFetchSym] = useState('');
  const [loading,setLoading] = useState(false);
  const [fetchErr,setFetchErr] = useState('');

  // Auto-fetch financials
  const [autoLoading,setAutoLoading] = useState(false);
  const [autoData,setAutoData] = useState(null);

  // Model params
  const [eps,setEps] = useState(5);
  const [bvps,setBvps] = useState(30);
  const [gr,setGr] = useState(10);
  const [dr,setDr] = useState(10);
  const [tg,setTg] = useState(3);
  const [tpe,setTpe] = useState(20);
  const [inputOpen,setInputOpen] = useState(false);

  const currentPrice = price||manualPrice;
  const curr = THAI_SYM.includes(fetchSym)?'฿':'$';

  // Auto-fetch on mount if symbol in URL
  useEffect(()=>{
    const s=searchParams.get('symbol');
    if(s){setSymInput(s);handleFetch(s);}
  },[]);

// แทนที่ฟังก์ชัน autoFetchFinancials ใน ValuationPage.jsx

  const autoFetchFinancials = useCallback(async (sym) => {
  setAutoLoading(true);
  setAutoData(null);
  
  try {
    const data = await getFinancialStatements(sym);
    
    if (!data.incomeStatement || data.incomeStatement.length === 0) {
      setAutoData({ error: data.error || 'ไม่มีข้อมูลงบการเงิน' });
      return;
    }

    const latest = data.incomeStatement[0];
    const bs = data.balanceSheet?.[0];

    console.log('📊 FMP Data:', latest); // ← เพิ่มบรรทัดนี้เพื่อ debug

    // ════════════════════════════════════════
    // 🔢 EPS - รองรับหลายแหล่ง
    // ════════════════════════════════════════
    let calculatedEPS = null;

    // วิธีที่ 1: ใช้ epsdiluted (แนะนำ - แม่นยำกว่า)
    if (latest.epsdiluted && latest.epsdiluted !== 0) {
      calculatedEPS = Math.abs(latest.epsdiluted);
      console.log('✅ Using epsdiluted:', calculatedEPS);
    }
    // วิธีที่ 2: ใช้ eps (basic)
    else if (latest.eps && latest.eps !== 0) {
      calculatedEPS = Math.abs(latest.eps);
      console.log('✅ Using eps:', calculatedEPS);
    }
    // วิธีที่ 3: คำนวณเอง = netIncome / shares outstanding
    else if (latest.netIncome && latest.weightedAverageShsOutDil) {
      calculatedEPS = Math.abs(latest.netIncome / latest.weightedAverageShsOutDil);
      console.log('✅ Calculated EPS from netIncome/shares:', calculatedEPS);
    }
    // วิธีที่ 4: ใช้ shares outstanding แบบ basic
    else if (latest.netIncome && latest.weightedAverageShsOut) {
      calculatedEPS = Math.abs(latest.netIncome / latest.weightedAverageShsOut);
      console.log('✅ Calculated EPS (basic):', calculatedEPS);
    }

    if (calculatedEPS) {
      setEps(calculatedEPS);
    } else {
      console.warn('⚠️ No EPS data available');
    }

    // ════════════════════════════════════════
    // 📊 BVPS - Book Value Per Share
    // ════════════════════════════════════════
    let calculatedBVPS = null;

    if (bs) {
      const equity = bs.totalStockholdersEquity || 0;
      const shares = latest.weightedAverageShsOutDil || 
                     latest.weightedAverageShsOut || 
                     bs.commonStock || 1;
      
      if (equity > 0 && shares > 0) {
        calculatedBVPS = Math.abs(equity / shares);
        console.log('✅ Calculated BVPS:', calculatedBVPS);
        setBvps(calculatedBVPS);
      }
    }

    // ════════════════════════════════════════
    // 📈 Growth Rate - คำนวณ CAGR 3 ปี
    // ════════════════════════════════════════
    let calculatedGrowth = null;

    if (data.incomeStatement.length >= 3) {
      const oldest = data.incomeStatement[2];
      const newest = data.incomeStatement[0];
      
      // ใช้ EPS diluted ถ้ามี ไม่งั้นใช้ eps หรือคำนวณ
      const getEPS = (stmt) => {
        return Math.abs(
          stmt.epsdiluted || 
          stmt.eps || 
          (stmt.netIncome && stmt.weightedAverageShsOutDil 
            ? stmt.netIncome / stmt.weightedAverageShsOutDil 
            : 0)
        );
      };

      const eps0 = getEPS(oldest);
      const eps2 = getEPS(newest);

      if (eps0 > 0 && eps2 > 0) {
        // CAGR = (ending/beginning)^(1/years) - 1
        calculatedGrowth = (Math.pow(eps2 / eps0, 1/2) - 1) * 100;
        
        // จำกัด growth ไม่ให้เกินเหตุ
        if (calculatedGrowth > 0 && calculatedGrowth < 100) {
          console.log('✅ Calculated Growth (CAGR 2Y):', calculatedGrowth.toFixed(1) + '%');
          setGr(Math.round(calculatedGrowth * 10) / 10);
        }
      }
    }

    // ════════════════════════════════════════
    // 📋 แสดงผลสรุป
    // ════════════════════════════════════════
    setAutoData({
      eps: calculatedEPS,
      bvps: calculatedBVPS,
      growth: calculatedGrowth,
      revenue: latest.revenue,
      netIncome: latest.netIncome,
      year: latest.date || latest.calendarYear,
      source: data.source || 'FMP',
      fields: {
        hasEpsDiluted: !!latest.epsdiluted,
        hasEpsBasic: !!latest.eps,
        hasNetIncome: !!latest.netIncome,
        hasShares: !!(latest.weightedAverageShsOutDil || latest.weightedAverageShsOut)
      }
    });

  } catch (err) {
    console.error('Auto-fetch error:', err);
    setAutoData({ 
      error: 'ดึงข้อมูลไม่สำเร็จ',
      detail: err.message 
    });
  } finally {
    setAutoLoading(false);
  }
}, []);


// ════════════════════════════════════════
// 🎨 UI สำหรับแสดงผล (แทนที่ส่วนเดิม)
// ════════════════════════════════════════
{autoData && !autoData.error && (
  <div style={{
    marginTop: '10px',
    padding: '12px 14px',
    background: 'rgba(52,211,153,0.08)',
    border: '1px solid rgba(52,211,153,0.2)',
    borderRadius: '12px'
  }}>
    <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', marginBottom: '6px' }}>
      ✅ ดึงข้อมูลสำเร็จ
    </div>
    <div style={{ fontSize: '11px', color: 'rgba(200,210,230,0.7)', lineHeight: 1.7 }}>
      {autoData.eps && <div>EPS: ${autoData.eps.toFixed(2)} {autoData.fields?.hasEpsDiluted ? '(Diluted)' : '(Basic)'}</div>}
      {autoData.bvps && <div>BVPS: ${autoData.bvps.toFixed(2)}</div>}
      {autoData.growth && <div>Growth (CAGR 2Y): {autoData.growth.toFixed(1)}%</div>}
      <div>Year: {autoData.year?.toString().slice(0, 4)}</div>
      <div>Source: {autoData.source}</div>
      <div style={{ marginTop: '6px', fontSize: '10px', color: 'rgba(200,210,230,0.5)' }}>
        💡 ค่าถูกใส่ใน Step 2 แล้ว — สามารถปรับแต่งได้
      </div>
    </div>
  </div>
)}

{autoData && autoData.error && (
  <div style={{
    marginTop: '10px',
    padding: '12px 14px',
    background: 'rgba(251,191,36,0.08)',
    border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: '12px'
  }}>
    <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffb830', marginBottom: '4px' }}>
      ⚠️ {autoData.error}
    </div>
    {autoData.detail && (
      <div style={{ fontSize: '11px', color: 'rgba(200,210,230,0.5)' }}>
        {autoData.detail}
      </div>
    )}
    <div style={{ fontSize: '11px', color: 'rgba(200,210,230,0.5)', marginTop: '4px' }}>
      กรุณาใส่ค่าด้วยตนเองใน Step 2
    </div>
  </div>
)}

  const handleFetch = useCallback(async(sym)=>{
    const s=(sym||symInput).trim().toUpperCase();
    if(!s)return;
    setLoading(true);setFetchErr('');
    try{
      const q = await getStockQuote(s);
      setPrice(q.price);
      setFetchSym(s);
      // Auto-fetch financials after price
      autoFetchFinancials(s);
    }catch{
      setFetchErr(`ไม่พบ "${s}" — ตรวจสอบ Symbol หรือ API Key`);
      setPrice(0);
    }finally{setLoading(false);}
  },[symInput,autoFetchFinancials]);

  // Calculations
  const dcfVal = useMemo(()=>DCF({eps,g:gr,r:dr,tg}),[eps,gr,dr,tg]);
  const grahVal = useMemo(()=>GRAHAM({eps,bvps}),[eps,bvps]);
  const peFairVal = useMemo(()=>PE_FAIR({eps,pe:tpe}),[eps,tpe]);
  const pegVal = useMemo(()=>PEG({price:currentPrice,eps,g:gr}),[currentPrice,eps,gr]);

  const mosDCF = MOS(dcfVal,currentPrice);
  const mosGrah = MOS(grahVal,currentPrice);
  const mosPE = MOS(peFairVal,currentPrice);

  const fairs = [dcfVal,grahVal,peFairVal].filter(v=>v&&v>0);
  const avgFair = fairs.length?fairs.reduce((s,v)=>s+v,0)/fairs.length:null;
  const mosAvg = MOS(avgFair,currentPrice);

  const scores = useMemo(()=>[
    {key:'DCF',label:'DCF',score:mosScore(mosDCF),color:C.blue},
    {key:'Graham',label:'Graham',score:mosScore(mosGrah),color:C.purple},
    {key:'P/E',label:'P/E',score:mosScore(mosPE),color:C.teal},
    {key:'PEG',label:'PEG',score:pegScore(pegVal),color:C.hold},
  ],[mosDCF,mosGrah,mosPE,pegVal]);

  const total = scores.reduce((s,v)=>s+v.score,0)/scores.length;
  const signal = toSignal(total);
  const pe_current = currentPrice>0&&eps>0?(currentPrice/eps):null;

  return(
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:"'Sarabun','Courier New',monospace",paddingBottom:'80px'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.35}50%{opacity:.75}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
        input::placeholder{color:rgba(255,255,255,0.2);}
        button:active{transform:scale(0.97);}
      `}</style>

      {/* HEADER */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(6,6,16,0.96)',backdropFilter:'blur(24px)',borderBottom:`1px solid ${C.border}`,padding:'0 20px'}}>
        <div style={{maxWidth:'720px',margin:'0 auto',height:'56px',display:'flex',alignItems:'center',gap:'14px'}}>
          <button onClick={()=>navigate('/')} style={{background:C.s3,border:`1px solid ${C.border}`,borderRadius:'9px',color:C.text,padding:'6px 14px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>← กลับ</button>
          <div style={{flex:1}}>
            <div style={{fontSize:'16px',fontWeight:'900',letterSpacing:'-0.3px'}}>
              <span style={{color:C.up}}>$</span><span style={{color:C.text}}> Valuation</span>
              <span style={{color:C.muted,fontSize:'12px',marginLeft:'10px',fontWeight:'400'}}>DCF · Graham · P/E · PEG</span>
            </div>
          </div>
          {fetchSym&&<div style={{fontSize:'13px',fontWeight:'700',color:signal.color,background:`${signal.color}15`,border:`1px solid ${signal.color}35`,borderRadius:'8px',padding:'4px 12px'}}>{fetchSym} · {signal.en}</div>}
        </div>
      </div>

      <div style={{maxWidth:'720px',margin:'0 auto',padding:'16px'}}>

        {/* STEP 1: LOOKUP */}
        <Card>
          <SecHead icon="🔍" title="Step 1 — ค้นหาหุ้น" color={C.blue}/>
          <div style={{display:'flex',gap:'8px'}}>
            <input value={symInput} onChange={e=>setSymInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&handleFetch()}
              placeholder="เช่น AAPL · PTT · MSFT · NVDA"
              style={{flex:1,padding:'10px 14px',background:C.s3,border:`1px solid ${C.border}`,borderRadius:'10px',color:C.text,fontSize:'14px',fontFamily:'inherit',outline:'none',transition:'border-color 0.2s'}}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
            <button onClick={()=>handleFetch()} disabled={loading}
              style={{padding:'10px 18px',background:`${C.blue}18`,border:`1px solid ${C.blue}40`,borderRadius:'10px',color:C.blue,fontWeight:'800',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{display:'inline-block',animation:loading?'spin 0.8s linear infinite':'none'}}>⟳</span>
              {loading?'กำลังดึง...':'ดึงราคา'}
            </button>
          </div>

          {fetchErr&&<div style={{marginTop:'8px',fontSize:'12px',color:C.down}}>⚠️ {fetchErr}</div>}

          {price>0?(
            <div style={{marginTop:'12px',padding:'12px 16px',background:`${C.up}0c`,border:`1px solid ${C.up}28`,borderRadius:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'11px',color:C.muted,marginBottom:'2px'}}>ราคาปัจจุบัน — {fetchSym}</div>
                <div style={{fontSize:'26px',fontWeight:'900',color:C.up,fontVariantNumeric:'tabular-nums'}}>{curr}{price.toFixed(2)}</div>
              </div>
              <div style={{fontSize:'24px'}}>✅</div>
            </div>
          ):(
            <div style={{marginTop:'12px'}}>
              <div style={{fontSize:'11px',color:C.muted,marginBottom:'6px'}}>หรือใส่ราคาด้วยตนเอง</div>
              <NumBox label="" value={manualPrice||''} onChange={setManualPrice} placeholder="ราคาปัจจุบัน เช่น 175.50"/>
            </div>
          )}

          {/* AUTO-FETCH STATUS */}
          {autoLoading&&<div style={{marginTop:'10px',fontSize:'12px',color:C.blue,display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{display:'inline-block',animation:'spin 0.8s linear infinite'}}>⟳</span>
            กำลังดึงงบการเงินอัตโนมัติจาก FMP API...
          </div>}

          {autoData&&!autoData.error&&(
            <div style={{marginTop:'10px',padding:'10px 14px',background:`${C.up}0c`,border:`1px solid ${C.up}25`,borderRadius:'12px'}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:C.up,marginBottom:'4px'}}>✅ ดึงงบการเงินอัตโนมัติสำเร็จ</div>
              <div style={{fontSize:'11px',color:C.muted}}>
                EPS: ${Math.abs(autoData.eps).toFixed(2)} · Year: {autoData.year?.slice(0,4)} · Source: {autoData.source}
              </div>
              <div style={{fontSize:'10px',color:'rgba(200,210,230,0.3)',marginTop:'4px'}}>
                💡 ค่าถูกใส่ใน Step 2 อัตโนมัติแล้ว — สามารถปรับแต่งได้
              </div>
            </div>
          )}

          {autoData&&autoData.error&&(
            <div style={{marginTop:'10px',padding:'10px 14px',background:`${C.hold}0a`,border:`1px solid ${C.hold}25`,borderRadius:'12px'}}>
              <div style={{fontSize:'12px',color:C.hold}}>⚠️ {autoData.error}</div>
            </div>
          )}
        </Card>

        {/* STEP 2: ASSUMPTIONS */}
        <Card>
          <SecHead icon="⚙️" title="Step 2 — ตรวจสอบ/ปรับค่า" color={C.purple}
            right={<button onClick={()=>setInputOpen(v=>!v)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'18px',padding:'0 4px',fontFamily:'inherit'}}>{inputOpen?'▲':'▼'}</button>}/>

          {!inputOpen&&(
            <div style={{fontSize:'12px',color:C.muted,lineHeight:1.7}}>
              {autoData&&!autoData.error?(
                <>✅ ค่าถูกใส่อัตโนมัติจาก FMP แล้ว<br/>📝 คลิก <strong>▼</strong> ด้านบนเพื่อตรวจสอบหรือปรับแต่ง</>
              ):(
                <>⚠️ ไม่มีงบการเงินอัตโนมัติ<br/>📝 คลิก <strong>▼</strong> ด้านบนเพื่อใส่ค่าเอง</>
              )}
            </div>
          )}

          {inputOpen&&(
            <div style={{animation:'fadeUp 0.2s ease'}}>
              <div style={{padding:'10px 14px',background:`${C.blue}0a`,borderRadius:'10px',fontSize:'11px',color:C.muted,lineHeight:1.7,marginBottom:'16px'}}>
                {autoData&&!autoData.error?(
                  <>💡 ค่าถูกดึงจาก FMP อัตโนมัติแล้ว — แต่คุณสามารถปรับแก้ไขได้</>
                ):(
                  <>💡 หาข้อมูลได้จาก: <span style={{color:C.blue}}>SET.or.th</span> · <span style={{color:C.blue}}>stockanalysis.com</span> · <span style={{color:C.blue}}>macrotrends.net</span></>
                )}
              </div>

              <div style={{fontSize:'11px',fontWeight:'700',color:C.teal,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:'12px'}}>📋 ข้อมูลบริษัท</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <NumBox label={`EPS — กำไรต่อหุ้น (${curr})`} hint={autoData&&!autoData.error?"✅ จาก FMP":"จากงบกำไรขาดทุนรายปี"} value={eps} onChange={setEps} placeholder="เช่น 5.50"/>
                <NumBox label={`BVPS — มูลค่าทางบัญชีต่อหุ้น (${curr})`} hint={autoData&&!autoData.error?"✅ คำนวณจาก FMP":"ส่วนผู้ถือหุ้น ÷ จำนวนหุ้น"} value={bvps} onChange={setBvps} placeholder="เช่น 30.00"/>
              </div>

              <div style={{height:'1px',background:C.border,margin:'14px 0'}}/>
              <div style={{fontSize:'11px',fontWeight:'700',color:C.purple,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:'14px'}}>🔬 DCF Parameters</div>
              <Slide label="Growth Rate — อัตราเติบโต" hint={autoData&&!autoData.error?"✅ CAGR 3y จาก FMP":"EPS growth ย้อนหลัง 3-5 ปี"} value={gr} onChange={setGr} min={1} max={40} unit="%"/>
              <Slide label="Discount Rate (WACC)" hint="ปกติ 8-12% สำหรับหุ้นทั่วไป" value={dr} onChange={setDr} min={5} max={20} unit="%"/>
              <Slide label="Terminal Growth Rate" hint="≈ GDP growth ระยะยาว (~3%)" value={tg} onChange={setTg} min={1} max={6} unit="%"/>

              <div style={{height:'1px',background:C.border,margin:'14px 0'}}/>
              <div style={{fontSize:'11px',fontWeight:'700',color:C.hold,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:'14px'}}>📊 P/E Target</div>
              <Slide label="Target P/E (Industry Average)" hint="Tech ~25x · Finance ~12x · Energy ~10x" value={tpe} onChange={setTpe} min={5} max={60} step={1} unit="x"/>
            </div>
          )}
        </Card>

        {/* STEP 3: SIGNAL */}
        <Card style={{border:`1px solid ${signal.color}40`,background:`linear-gradient(145deg,${signal.glow},${C.s2})`,animation:'fadeUp 0.35s ease'}}>
          <SecHead icon="🎯" title="Step 3 — ผลการวิเคราะห์" color={signal.color}/>
          <div style={{display:'flex',alignItems:'center',gap:'20px',flexWrap:'wrap',marginBottom:'20px'}}>
            <div style={{textAlign:'center'}}><Meter score={total} color={signal.color} size={160}/></div>
            <div style={{flex:1,minWidth:'200px'}}>
              <div style={{fontSize:'11px',color:C.muted,marginBottom:'6px',textTransform:'uppercase',letterSpacing:'1px'}}>สัญญาณอัตโนมัติ</div>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                <div style={{fontSize:'42px',fontWeight:'900',color:signal.color,lineHeight:1,textShadow:`0 0 30px ${signal.color}80`}}>{signal.label}</div>
                <div style={{padding:'4px 12px',background:`${signal.color}20`,border:`1px solid ${signal.color}50`,borderRadius:'8px',fontSize:'13px',fontWeight:'800',color:signal.color}}>{signal.en}</div>
              </div>
              <div style={{fontSize:'12px',color:C.muted,lineHeight:1.7}}>{SIGNAL_TEXT[signal.en]}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
            {scores.map(s=>(
              <div key={s.key} style={{background:'rgba(0,0,0,0.3)',borderRadius:'12px',padding:'12px 8px',textAlign:'center',border:`1px solid ${s.color}25`}}>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.8px'}}>{s.key}</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:s.color,marginBottom:'6px'}}>{Math.round(s.score)}</div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${s.score}%`,background:s.color,borderRadius:'2px',transition:'width 0.8s ease'}}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* FAIR VALUE BARS */}
        {currentPrice>0&&(
          <Card style={{animation:'fadeUp 0.4s ease 0.1s both'}}>
            <SecHead icon="⚖️" title="เปรียบเทียบมูลค่า" color={C.teal}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
              <div style={{padding:'12px 14px',background:C.s3,borderRadius:'12px'}}>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'4px'}}>📍 ราคาปัจจุบัน</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:C.text,fontVariantNumeric:'tabular-nums'}}>{curr}{currentPrice.toFixed(2)}</div>
              </div>
              {avgFair&&(
                <div style={{padding:'12px 14px',background:C.s3,borderRadius:'12px',border:`1px solid ${mosAvg>=0?C.up:C.down}30`}}>
                  <div style={{fontSize:'10px',color:C.muted,marginBottom:'4px'}}>⚖️ มูลค่าเฉลี่ย</div>
                  <div style={{fontSize:'22px',fontWeight:'900',color:mosAvg>=0?C.up:C.down,fontVariantNumeric:'tabular-nums'}}>{curr}{avgFair.toFixed(2)}</div>
                  <div style={{fontSize:'12px',fontWeight:'700',color:mosAvg>=0?C.up:C.down,marginTop:'2px'}}>
                    {mosAvg>=0?'✅ ถูกกว่า':'❌ แพงกว่า'} {Math.abs(mosAvg).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
            <CompBar label="DCF Value" fair={dcfVal} price={currentPrice} color={C.blue} curr={curr}/>
            <CompBar label="Graham Number" fair={grahVal} price={currentPrice} color={C.purple} curr={curr}/>
            <CompBar label="P/E Fair Value" fair={peFairVal} price={currentPrice} color={C.teal} curr={curr}/>
          </Card>
        )}

        {/* MODEL DETAILS */}
        <Card style={{animation:'fadeUp 0.4s ease 0.15s both'}}>
          <SecHead icon="📊" title="DCF — Discounted Cash Flow" color={C.blue}/>
          <div style={{fontSize:'11px',color:C.muted,marginBottom:'14px',lineHeight:1.7,padding:'8px 12px',background:`${C.blue}0a`,borderRadius:'8px'}}>
            คำนวณมูลค่าจากกระแสเงินสด (EPS) ที่คาดการณ์ไว้ 10 ปี แล้วคิดลดกลับมาปัจจุบัน
          </div>
          {dcfVal?(
            <>
              <Row label="มูลค่าจาก DCF" value={`${curr}${dcfVal.toFixed(2)}`} color={C.blue}/>
              {currentPrice>0&&<Row label="ราคาปัจจุบัน" value={`${curr}${currentPrice.toFixed(2)}`} color={currentPrice<=dcfVal?C.up:C.down}/>}
              {currentPrice>0&&<Row label="Margin of Safety" value={`${mosDCF>=0?'+':''}${mosDCF.toFixed(1)}%`} color={mosDCF>=0?C.up:C.down} note={mosDCF>=20?'✅ มีส่วนลดปลอดภัย ≥20%':mosDCF>=0?'⚠️ ส่วนลดน้อย':'❌ ราคาสูงกว่า DCF'}/>}
              <Row label="EPS" value={`${curr}${eps}`}/>
              <Row label="Growth Rate" value={`${gr}%/ปี`}/>
              <Row label="WACC" value={`${dr}%`}/>
              <Row label="Terminal Growth" value={`${tg}%`} last/>
            </>
          ):<div style={{color:C.muted,fontSize:'13px'}}>ใส่ EPS > 0 เพื่อคำนวณ</div>}
        </Card>

        <Card style={{animation:'fadeUp 0.4s ease 0.2s both'}}>
          <SecHead icon="🏛️" title="Graham Number" color={C.purple}/>
          <div style={{fontSize:'11px',color:C.muted,marginBottom:'14px',lineHeight:1.7,padding:'8px 12px',background:`${C.purple}0a`,borderRadius:'8px'}}>
            สูตร: <span style={{color:C.purple,fontWeight:'700'}}>√(22.5 × EPS × BVPS)</span> — ราคา<span style={{color:C.up}}> ต่ำกว่า</span> Graham = "ถูก"
          </div>
          {grahVal?(
            <>
              <Row label="Graham Number" value={`${curr}${grahVal.toFixed(2)}`} color={C.purple}/>
              {currentPrice>0&&<Row label="ราคาปัจจุบัน" value={`${curr}${currentPrice.toFixed(2)}`} color={currentPrice<=grahVal?C.up:C.down}/>}
              {currentPrice>0&&<Row label="Margin of Safety" value={`${mosGrah>=0?'+':''}${mosGrah.toFixed(1)}%`} color={mosGrah>=0?C.up:C.down} note={mosGrah>=33?'✅ Graham แนะนำ ≥33%':mosGrah>=0?'⚠️ น้อยกว่าที่แนะนำ':'❌ แพงกว่า Graham'}/>}
              <Row label="EPS" value={`${curr}${eps}`}/>
              <Row label="BVPS" value={`${curr}${bvps}`} last/>
            </>
          ):<div style={{color:C.muted,fontSize:'13px'}}>ใส่ EPS และ BVPS > 0</div>}
        </Card>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <Card style={{animation:'fadeUp 0.4s ease 0.25s both',marginBottom:0}}>
            <SecHead icon="📈" title="P/E Valuation" color={C.teal}/>
            <div style={{fontSize:'11px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>EPS × Target P/E</div>
            {peFairVal?(
              <>
                <Row label="P/E Fair" value={`${curr}${peFairVal.toFixed(2)}`} color={C.teal}/>
                {currentPrice>0&&<Row label="ปัจจุบัน" value={`${curr}${currentPrice.toFixed(2)}`} color={currentPrice<=peFairVal?C.up:C.down}/>}
                {currentPrice>0&&<Row label="MOS" value={`${mosPE>=0?'+':''}${mosPE.toFixed(1)}%`} color={mosPE>=0?C.up:C.down}/>}
                <Row label="P/E ตอนนี้" value={pe_current?`${pe_current.toFixed(1)}x`:'—'}/>
                <Row label="Target P/E" value={`${tpe}x`} last/>
              </>
            ):<div style={{color:C.muted,fontSize:'12px'}}>ใส่ EPS > 0</div>}
          </Card>

          <Card style={{animation:'fadeUp 0.4s ease 0.3s both',marginBottom:0}}>
            <SecHead icon="⚡" title="PEG Ratio" color={C.hold}/>
            <div style={{fontSize:'11px',color:C.muted,marginBottom:'12px',lineHeight:1.6}}>P/E ÷ Growth Rate</div>
            {pegVal!==null?(
              <>
                <Row label="PEG" value={pegVal.toFixed(2)} color={pegVal<1?C.up:pegVal<2?C.hold:C.down}/>
                <Row label="สัญญาณ" value={pegVal<0.5?'🟢 ถูกมาก':pegVal<1.0?'🟢 ถูก':pegVal<1.5?'🟡 พอดี':pegVal<2.0?'🟠 แพงบ้าง':'🔴 แพงมาก'} color={pegVal<1?C.up:pegVal<2?C.hold:C.down}/>
                <Row label="P/E ตอนนี้" value={pe_current?`${pe_current.toFixed(1)}x`:'—'}/>
                <Row label="Growth" value={`${gr}%`} last/>
              </>
            ):<div style={{color:C.muted,fontSize:'12px'}}>ต้องการ ราคา + EPS</div>}
          </Card>
        </div>

        {/* DISCLAIMER */}
        <div style={{marginTop:'16px',padding:'14px 16px',background:'rgba(255,87,87,0.05)',border:'1px solid rgba(255,87,87,0.15)',borderRadius:'12px',fontSize:'11px',color:'rgba(255,150,150,0.8)',lineHeight:1.7}}>
          ⚠️ <strong>Disclaimer:</strong> เครื่องมือนี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน ค่าจาก API อาจไม่สมบูรณ์ การลงทุนมีความเสี่ยง ควรศึกษาข้อมูลและปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจ
        </div>
      </div>
    </div>
  );
};

export default ValuationPage;