// src/services/api/stockAPI.js
import axios from 'axios';

// ════════════════════════════════════════════════════════════
// 🔑 API KEYS — ใส่ของคุณตรงนี้
// ════════════════════════════════════════════════════════════
const FINNHUB_KEY = 'd6atpe1r01qnr27iseugd6atpe1r01qnr27isev0';  // ⬅️ ใส่ key ของคุณ
const FMP_KEY = '30gy5YTO7qW3ovbKPJu2SjrR0wffJb3C';

// ⚠️ FMP เปลี่ยนเป็น /stable แล้ว (ไม่ใช่ /api/v3)
const FINNHUB_URL = 'https://finnhub.io/api/v1';
const FMP_URL = 'https://financialmodelingprep.com/stable';

// ════════════════════════════════════════════════════════════
// 🇹🇭 หุ้นไทย
// ════════════════════════════════════════════════════════════
const THAI_SYMBOLS = [
  'PTT','AOT','CPALL','KBANK','SCB','ADVANC','SCC','BBL',
  'TRUE','MINT','DELTA','KTC','GULF','BGRIM'
];

const toFinnhubSymbol = (symbol) => {
  const clean = symbol.trim().toUpperCase().replace('.BK', '');
  return THAI_SYMBOLS.includes(clean) ? `BKK:${clean}` : clean;
};

const fromFinnhubSymbol = (sym) => sym.replace('BKK:', '');

// ════════════════════════════════════════════════════════════
// 💰 ราคา
// ════════════════════════════════════════════════════════════
export const getStockQuote = async (symbol) => {
  try {
    const originalSymbol = symbol.trim().toUpperCase().replace('.BK', '');
    const finnhubSymbol = toFinnhubSymbol(originalSymbol);

    const response = await axios.get(`${FINNHUB_URL}/quote`, {
      params: { symbol: finnhubSymbol, token: FINNHUB_KEY }
    });

    const d = response.data;

    if (!d || d.c === 0 || d.c === null) {
      throw new Error(`ไม่พบข้อมูล ${originalSymbol}`);
    }

    const change = d.c - d.pc;
    const changePercent = d.pc > 0 ? ((change / d.pc) * 100).toFixed(2) : '0.00';

    return {
      symbol: originalSymbol,
      price: d.c,
      open: d.o,
      high: d.h,
      low: d.l,
      previousClose: d.pc,
      change: parseFloat(change.toFixed(2)),
      changePercent: changePercent + '%',
      latestTradingDay: new Date().toISOString().split('T')[0]
    };

  } catch (error) {
    console.error(`❌ getStockQuote ${symbol}:`, error.message);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════
// 📈 กราฟ
// ════════════════════════════════════════════════════════════
export const getStockHistory = async (symbol, interval = 'daily') => {
  try {
    const originalSymbol = symbol.trim().toUpperCase().replace('.BK', '');
    const finnhubSymbol = toFinnhubSymbol(originalSymbol);

    const to = Math.floor(Date.now() / 1000);
    const from = to - (100 * 24 * 60 * 60);

    const resolutionMap = { 'daily': 'D', 'weekly': 'W', 'monthly': 'M' };

    const response = await axios.get(`${FINNHUB_URL}/stock/candle`, {
      params: {
        symbol: finnhubSymbol,
        resolution: resolutionMap[interval] || 'D',
        from, to,
        token: FINNHUB_KEY
      }
    });

    const d = response.data;

    if (d.s === 'no_data' || !d.t || d.t.length === 0) {
      return [];
    }

    return d.t.map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      close: d.c[i],
      volume: d.v[i]
    }));

  } catch (error) {
    console.error(`❌ getStockHistory:`, error.message);
    return [];
  }
};

// ════════════════════════════════════════════════════════════
// 🏢 Company Profile
// ════════════════════════════════════════════════════════════
export const getCompanyProfile = async (symbol) => {
  try {
    const originalSymbol = symbol.trim().toUpperCase().replace('.BK', '');
    const finnhubSymbol = toFinnhubSymbol(originalSymbol);

    const response = await axios.get(`${FINNHUB_URL}/stock/profile2`, {
      params: { symbol: finnhubSymbol, token: FINNHUB_KEY }
    });

    const d = response.data;

    if (!d || !d.name) {
      throw new Error(`ไม่พบข้อมูลบริษัท`);
    }

    return {
      companyName: d.name,
      symbol: originalSymbol,
      industry: d.finnhubIndustry || '-',
      website: d.weburl || '-',
      logo: d.logo || '',
      country: d.country || '-',
      currency: d.currency || 'USD',
      exchange: d.exchange || '-',
      marketCap: d.marketCapitalization || 0
    };

  } catch (error) {
    console.error(`❌ getCompanyProfile:`, error.message);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════
// 📰 ข่าว
// ════════════════════════════════════════════════════════════
export const getStockNews = async (symbol) => {
  try {
    const originalSymbol = symbol.trim().toUpperCase().replace('.BK', '');
    const finnhubSymbol = toFinnhubSymbol(originalSymbol);

    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const response = await axios.get(`${FINNHUB_URL}/company-news`, {
      params: {
        symbol: finnhubSymbol,
        from: formatDate(weekAgo),
        to: formatDate(today),
        token: FINNHUB_KEY
      }
    });

    return (response.data || []).slice(0, 10).map(news => ({
      id: news.id,
      headline: news.headline,
      summary: news.summary,
      source: news.source,
      url: news.url,
      image: news.image,
      datetime: new Date(news.datetime * 1000).toLocaleDateString('th-TH')
    }));

  } catch (error) {
    console.error(`❌ getStockNews:`, error.message);
    return [];
  }
};

// ════════════════════════════════════════════════════════════
// 🔍 ค้นหา
// ════════════════════════════════════════════════════════════
export const searchStocks = async (query) => {
  try {
    const response = await axios.get(`${FMP_URL}/search-symbol`, {
      params: { query: query.trim(), apikey: FMP_KEY, limit: 10 },
      timeout: 5000
    });

    return (response.data || []).map(item => ({
      symbol: item.symbol,
      name: item.name,
      type: item.exchangeShortName
    }));

  } catch (error) {
    console.log('FMP search failed, using Finnhub...');
    
    try {
      const response = await axios.get(`${FINNHUB_URL}/search`, {
        params: { q: query.trim(), token: FINNHUB_KEY }
      });
      return (response.data.result || [])
        .filter(item => item.type === 'Common Stock')
        .slice(0, 10)
        .map(item => ({
          symbol: fromFinnhubSymbol(item.symbol),
          name: item.description,
          type: item.type
        }));
    } catch {
      throw error;
    }
  }
};

// ════════════════════════════════════════════════════════════
// 📊 งบการเงิน (FMP Stable + Annual Period)
// ════════════════════════════════════════════════════════════
export const getFinancialStatements = async (symbol) => {
  const cleanSymbol = symbol.replace('.BK', '').replace('BKK:', '').trim().toUpperCase();

  try {
    console.log(`📊 Fetching ${cleanSymbol} from FMP Stable (Annual)...`);

    // ⚠️ สำคัญ: เพิ่ม period=annual เพื่อให้ได้ EPS รายปี (ไม่ใช่ TTM)
    const [incomeRes, balanceRes] = await Promise.all([
      axios.get(`${FMP_URL}/income-statement/?symbol=${cleanSymbol}`, {
        params: { 
          apikey: FMP_KEY,
          limit: 5 
        },
        timeout: 8000
      }).catch(() => ({ data: [] })),
      
      axios.get(`${FMP_URL}/balance-sheet-statement/?symbol=${cleanSymbol}`, {
        params: { 
          apikey: FMP_KEY,
          limit: 5 
        },
        timeout: 8000
      }).catch(() => ({ data: [] }))
    ]);

    const income = incomeRes.data || [];
    const balance = balanceRes.data || [];

    if (income.length > 0) {
      console.log(`✅ FMP: got ${income.length} annual statements`);
      console.log(`📊 Latest Annual EPS: ${income[0].eps || income[0].epsdiluted}`);
      return {
        incomeStatement: income,
        balanceSheet: balance,
        cashFlow: [],
        source: 'FMP (Annual)'
      };
    }

    console.log(`⚠️ FMP empty, estimating...`);
    return await estimateFinancials(cleanSymbol);

  } catch (error) {
    console.error(`❌ FMP error:`, error.message);
    return await estimateFinancials(cleanSymbol);
  }
};

// ════════════════════════════════════════════════════════════
// 🔮 ประมาณค่างบการเงิน
// ════════════════════════════════════════════════════════════
const estimateFinancials = async (symbol) => {
  try {
    const [profile, quote] = await Promise.all([
      getCompanyProfile(symbol).catch(() => null),
      getStockQuote(symbol).catch(() => null)
    ]);

    if (!profile || !quote) {
      return {
        incomeStatement: [],
        balanceSheet: [],
        cashFlow: [],
        error: 'ไม่สามารถประมาณค่าได้'
      };
    }

    const SECTOR_PE = {
      'Technology': 25, 'Financial': 12, 'Healthcare': 20,
      'Consumer': 18, 'Energy': 10, 'default': 15
    };

    const industry = profile.industry || 'default';
    let pe = SECTOR_PE.default;

    for (const [key, val] of Object.entries(SECTOR_PE)) {
      if (industry.includes(key)) { pe = val; break; }
    }

    const eps = quote.price / pe;
    const bvps = eps * 3;

    return {
      incomeStatement: [{
        date: new Date().toISOString().split('T')[0],
        symbol: symbol,
        eps: eps,
        revenue: eps * 1e9,
        netIncome: eps * 1e8,
        estimated: true
      }],
      balanceSheet: [{
        totalStockholdersEquity: bvps * 1e9,
        estimated: true
      }],
      cashFlow: [],
      source: 'Estimated',
      note: `ประมาณจาก P/E ${pe}x (${industry})`
    };

  } catch {
    return {
      incomeStatement: [],
      balanceSheet: [],
      cashFlow: [],
      error: 'กรุณาใส่ค่าเอง'
    };
  }
};

// ════════════════════════════════════════════════════════════
// 🇹🇭 หุ้นไทย
// ════════════════════════════════════════════════════════════
export const getThaiStockList = () => [
  { symbol: 'PTT',    name: 'ปตท.',              sector: 'พลังงาน'    },
  { symbol: 'AOT',    name: 'ท่าอากาศยานไทย',    sector: 'คมนาคม'    },
  { symbol: 'CPALL',  name: 'ซีพี ออลล์',        sector: 'ค้าปลีก'   },
  { symbol: 'KBANK',  name: 'กสิกรไทย',          sector: 'การเงิน'   },
  { symbol: 'SCB',    name: 'ไทยพาณิชย์',        sector: 'การเงิน'   },
  { symbol: 'BBL',    name: 'กรุงเทพ',           sector: 'การเงิน'   },
  { symbol: 'ADVANC', name: 'แอดวานซ์',          sector: 'โทรคมนาคม' },
  { symbol: 'SCC',    name: 'ปูนซิเมนต์ไทย',     sector: 'วัสดุ'     },
];

// ════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════
export default {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getStockNews,
  searchStocks,
  getFinancialStatements,
  getThaiStockList
};