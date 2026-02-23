// src/services/api/stockAPI.js
import axios from 'axios';

// ============================================
// 🔑 API KEYS - ใส่ key ของคุณตรงนี้
// ============================================
const FINNHUB_KEY = 'd6a8ubhr01qqjvbphmt0d6a8ubhr01qqjvbphmtg'; // finnhub.io/register
const FMP_KEY = '30gy5YTO7qW3ovbKPJu2SjrR0wffJb3C';

const FINNHUB_URL = 'https://finnhub.io/api/v1';
const FMP_URL = 'https://financialmodelingprep.com/api/v3';

// ============================================
// 💰 ราคาหุ้น Real-time
// ============================================

/**
 * ดึงราคาหุ้น - รองรับทั้ง US และหุ้นไทย
 * หุ้นไทย: ใช้ PTT, KBANK (ไม่ต้องมี .BK)
 */
export const getStockQuote = async (symbol) => {
  try {
    let cleanSymbol = symbol.trim().toUpperCase();

     // หุ้นไทย: PTT หรือ PTT.BK → BKK:PTT (format ที่ Finnhub ใช้)
    if (cleanSymbol.endsWith('.BK')) {
      cleanSymbol = 'BKK:' + cleanSymbol.replace('.BK', '');
    } else if (['PTT','AOT','CPALL','KBANK','SCB','ADVANC','SCC','BBL',
                 'TRUE','MINT','DELTA','KTC','GULF','BGRIM'].includes(cleanSymbol)) {
      cleanSymbol = 'BKK:' + cleanSymbol;
    }

    console.log(`🔍 Fetching: ${cleanSymbol}`);

    const response = await axios.get(`${FINNHUB_URL}/quote`, {
      params: { symbol: cleanSymbol, token: FINNHUB_KEY }
    });

    const d = response.data;

    if (!d || d.c === 0) {
      throw new Error(`ไม่พบหุ้น ${cleanSymbol}`);
    }

    const change = d.c - d.pc;
    const changePercent = ((change / d.pc) * 100).toFixed(2);

    console.log(`✅ ${cleanSymbol}: $${d.c}`);

    return {
      symbol: cleanSymbol,
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

// ============================================
// 📈 กราฟราคาย้อนหลัง
// ============================================

/**
 * ดึงข้อมูลกราฟย้อนหลัง
 * interval: 'daily', 'weekly', 'monthly'
 */
export const getStockHistory = async (symbol, interval = 'daily') => {
  try {
    let cleanSymbol = symbol.trim().toUpperCase();

    // แปลงหุ้นไทย
    if (cleanSymbol.endsWith('.BK')) {
      cleanSymbol = 'BKK:' + cleanSymbol.replace('.BK', '');
    } else if (['PTT','AOT','CPALL','KBANK','SCB','ADVANC','SCC','BBL',
                 'TRUE','MINT','DELTA','KTC','GULF','BGRIM'].includes(cleanSymbol)) {
      cleanSymbol = 'BKK:' + cleanSymbol;
    }

    const to = Math.floor(Date.now() / 1000);
    const from = to - (100 * 24 * 60 * 60); // 100 วันย้อนหลัง

    const resolutionMap = {
      'daily': 'D',
      'weekly': 'W',
      'monthly': 'M'
    };

    const response = await axios.get(`${FINNHUB_URL}/stock/candle`, {
      params: {
        symbol: cleanSymbol,
        resolution: resolutionMap[interval] || 'D',
        from,
        to,
        token: FINNHUB_KEY
      }
    });

    const d = response.data;

    if (d.s === 'no_data' || !d.t) {
      throw new Error(`ไม่มีข้อมูลกราฟสำหรับ ${cleanSymbol}`);
    }

    // แปลงเป็น array format สำหรับ Recharts
    return d.t.map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      close: d.c[i],
      volume: d.v[i]
    }));

  } catch (error) {
    console.error(`❌ getStockHistory ${symbol}:`, error.message);
    throw error;
  }
};

// ============================================
// 🏢 ข้อมูลบริษัท
// ============================================

/**
 * ดึงข้อมูลบริษัท (Profile)
 */
export const getCompanyProfile = async (symbol) => {
  try {
    let cleanSymbol = symbol.trim().toUpperCase();
    if (cleanSymbol.endsWith('.BK')) {
      cleanSymbol = cleanSymbol.replace('.BK', '');
    }

    const response = await axios.get(`${FINNHUB_URL}/stock/profile2`, {
      params: { symbol: cleanSymbol, token: FINNHUB_KEY }
    });

    const d = response.data;

    if (!d || !d.name) {
      throw new Error(`ไม่พบข้อมูลบริษัท ${cleanSymbol}`);
    }

    return {
      companyName: d.name,
      symbol: d.ticker,
      industry: d.finnhubIndustry || '-',
      sector: d.finnhubIndustry || '-',
      website: d.weburl || '-',
      logo: d.logo || '',
      country: d.country || '-',
      currency: d.currency || 'USD',
      exchange: d.exchange || '-',
      marketCap: d.marketCapitalization || 0,
      description: `${d.name} (${d.ticker}) - ${d.finnhubIndustry || 'N/A'}`
    };

  } catch (error) {
    console.error(`❌ getCompanyProfile ${symbol}:`, error.message);
    throw error;
  }
};

// ============================================
// 📰 ข่าวหุ้น
// ============================================

/**
 * ดึงข่าวหุ้นล่าสุด
 */
export const getStockNews = async (symbol) => {
  try {
    let cleanSymbol = symbol.trim().toUpperCase();
    if (cleanSymbol.endsWith('.BK')) {
      cleanSymbol = cleanSymbol.replace('.BK', '');
    }

    // วันที่ย้อนหลัง 7 วัน
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const response = await axios.get(`${FINNHUB_URL}/company-news`, {
      params: {
        symbol: cleanSymbol,
        from: formatDate(weekAgo),
        to: formatDate(today),
        token: FINNHUB_KEY
      }
    });

    // คืนแค่ 10 ข่าวล่าสุด
    return response.data.slice(0, 10).map(news => ({
      id: news.id,
      headline: news.headline,
      summary: news.summary,
      source: news.source,
      url: news.url,
      image: news.image,
      datetime: new Date(news.datetime * 1000).toLocaleDateString('th-TH')
    }));

  } catch (error) {
    console.error(`❌ getStockNews ${symbol}:`, error.message);
    return []; // ถ้าข่าวไม่ได้ ไม่ต้อง throw ให้ return []
  }
};

// ============================================
// 🔍 ค้นหาหุ้น
// ============================================

/**
 * ค้นหาหุ้นจากชื่อหรือ symbol
 */
export const searchStocks = async (query) => {
  try {
    const response = await axios.get(`${FINNHUB_URL}/search`, {
      params: { q: query.trim(), token: FINNHUB_KEY }
    });

    return (response.data.result || [])
      .filter(item => item.type === 'Common Stock') // เอาแค่หุ้นปกติ
      .slice(0, 10)
      .map(item => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type
      }));

  } catch (error) {
    console.error('❌ searchStocks:', error.message);
    throw error;
  }
};

// ============================================
// 📊 งบการเงิน (ใช้ FMP)
// ============================================

/**
 * ดึงงบการเงิน - Income Statement, Balance Sheet, Cash Flow
 */
export const getFinancialStatements = async (symbol) => {
  try {
    const cleanSymbol = symbol.replace('.BK', '').trim().toUpperCase();

    const [income, balance, cashflow] = await Promise.all([
      axios.get(`${FMP_URL}/income-statement/${cleanSymbol}`, {
        params: { apikey: FMP_KEY, limit: 5 }
      }),
      axios.get(`${FMP_URL}/balance-sheet-statement/${cleanSymbol}`, {
        params: { apikey: FMP_KEY, limit: 5 }
      }),
      axios.get(`${FMP_URL}/cash-flow-statement/${cleanSymbol}`, {
        params: { apikey: FMP_KEY, limit: 5 }
      })
    ]);

    return {
      incomeStatement: income.data || [],
      balanceSheet: balance.data || [],
      cashFlow: cashflow.data || []
    };

  } catch (error) {
    console.error(`❌ getFinancialStatements ${symbol}:`, error.message);
    return { incomeStatement: [], balanceSheet: [], cashFlow: [] };
  }
};

/**
 * ดึงอัตราส่วนทางการเงิน
 */
export const getFinancialRatios = async (symbol) => {
  try {
    const cleanSymbol = symbol.replace('.BK', '').trim().toUpperCase();

    const response = await axios.get(`${FMP_URL}/ratios/${cleanSymbol}`, {
      params: { apikey: FMP_KEY, limit: 5 }
    });

    return response.data || [];

  } catch (error) {
    console.error(`❌ getFinancialRatios ${symbol}:`, error.message);
    return [];
  }
};

// ============================================
// 🇹🇭 หุ้นไทย - ค้นหา Symbol
// ============================================

/**
 * รายชื่อหุ้นไทยยอดนิยม (hardcoded เพราะ Finnhub ฟรีไม่มี SET search)
 */
export const getThaiStockList = () => {
  return [
    { symbol: 'PTT',   name: 'บริษัท ปตท. จำกัด (มหาชน)',          sector: 'พลังงาน' },
    { symbol: 'AOT',   name: 'บริษัท ท่าอากาศยานไทย จำกัด (มหาชน)', sector: 'คมนาคม' },
    { symbol: 'CPALL', name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',     sector: 'ค้าปลีก' },
    { symbol: 'KBANK', name: 'ธนาคารกสิกรไทย จำกัด (มหาชน)',        sector: 'การเงิน' },
    { symbol: 'SCB',   name: 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)',      sector: 'การเงิน' },
    { symbol: 'BBL',   name: 'ธนาคารกรุงเทพ จำกัด (มหาชน)',         sector: 'การเงิน' },
    { symbol: 'TRUE',  name: 'บริษัท ทรู คอร์ปอเรชั่น จำกัด (มหาชน)', sector: 'โทรคมนาคม' },
    { symbol: 'ADVANC', name: 'บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส จำกัด (มหาชน)', sector: 'โทรคมนาคม' },
    { symbol: 'SCC',   name: 'บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)', sector: 'วัสดุก่อสร้าง' },
    { symbol: 'MINT',  name: 'บริษัท ไมเนอร์ อินเตอร์เนชั่นแนล จำกัด (มหาชน)', sector: 'อาหาร' }
  ];
};

// ============================================
// EXPORT
// ============================================
export default {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getStockNews,
  searchStocks,
  getFinancialStatements,
  getFinancialRatios,
  getThaiStockList
};