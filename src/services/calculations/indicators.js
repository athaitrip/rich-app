// src/services/calculations/indicators.js

/**
 * คำนวณ Moving Average (MA)
 */
export const calculateMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
    result.push({
      date: data[i].date,
      value: sum / period
    });
  }
  return result;
};

/**
 * คำนวณ Exponential Moving Average (EMA)
 */
export const calculateEMA = (data, period) => {
  const result = [];
  const multiplier = 2 / (period + 1);
  
  // คำนวณ SMA แรก
  let ema = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
  result.push({ date: data[period - 1].date, value: ema });
  
  // คำนวณ EMA ที่เหลือ
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ date: data[i].date, value: ema });
  }
  
  return result;
};

/**
 * คำนวณ RSI (Relative Strength Index)
 */
export const calculateRSI = (data, period = 14) => {
  const result = [];
  const changes = [];
  
  // คำนวณการเปลี่ยนแปลงราคา
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }
  
  for (let i = period; i < changes.length; i++) {
    const recentChanges = changes.slice(i - period, i);
    const gains = recentChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
    
    const rs = gains / (losses || 1);
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({
      date: data[i + 1].date,
      value: rsi
    });
  }
  
  return result;
};

/**
 * คำนวณ MACD (Moving Average Convergence Divergence)
 */
export const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const macdLine = [];
  const minLength = Math.min(emaFast.length, emaSlow.length);
  
  for (let i = 0; i < minLength; i++) {
    macdLine.push({
      date: emaFast[i].date,
      value: emaFast[i].value - emaSlow[i].value
    });
  }
  
  // คำนวณ Signal Line (EMA ของ MACD)
  const signalLine = calculateEMAFromValues(macdLine.map(m => m.value), signalPeriod);
  
  // คำนวณ Histogram
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push({
      date: macdLine[i + (macdLine.length - signalLine.length)].date,
      macd: macdLine[i + (macdLine.length - signalLine.length)].value,
      signal: signalLine[i],
      histogram: macdLine[i + (macdLine.length - signalLine.length)].value - signalLine[i]
    });
  }
  
  return histogram;
};

/**
 * Helper function สำหรับคำนวณ EMA จาก array ของ values
 */
const calculateEMAFromValues = (values, period) => {
  const result = [];
  const multiplier = 2 / (period + 1);
  
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  
  return result;
};

/**
 * คำนวณ Bollinger Bands
 */
export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  const result = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const closes = slice.map(d => d.close);
    
    // คำนวณ Middle Band (SMA)
    const middle = closes.reduce((a, b) => a + b, 0) / period;
    
    // คำนวณ Standard Deviation
    const variance = closes.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const sd = Math.sqrt(variance);
    
    result.push({
      date: data[i].date,
      upper: middle + (stdDev * sd),
      middle: middle,
      lower: middle - (stdDev * sd)
    });
  }
  
  return result;
};

/**
 * คำนวณอัตราส่วน P/E (Price to Earnings)
 */
export const calculatePE = (currentPrice, eps) => {
  if (!eps || eps <= 0) return null;
  return currentPrice / eps;
};

/**
 * คำนวณอัตราส่วน P/B (Price to Book Value)
 */
export const calculatePB = (currentPrice, bookValuePerShare) => {
  if (!bookValuePerShare || bookValuePerShare <= 0) return null;
  return currentPrice / bookValuePerShare;
};

/**
 * คำนวณ ROE (Return on Equity)
 */
export const calculateROE = (netIncome, shareholdersEquity) => {
  if (!shareholdersEquity || shareholdersEquity === 0) return null;
  return (netIncome / shareholdersEquity) * 100;
};

/**
 * คำนวณ Debt to Equity Ratio
 */
export const calculateDebtToEquity = (totalDebt, totalEquity) => {
  if (!totalEquity || totalEquity === 0) return null;
  return totalDebt / totalEquity;
};

/**
 * คำนวณ Dividend Yield
 */
export const calculateDividendYield = (annualDividend, currentPrice) => {
  if (!currentPrice || currentPrice === 0) return null;
  return (annualDividend / currentPrice) * 100;
};

/**
 * คำนวณ EPS Growth Rate
 */
export const calculateEPSGrowth = (currentEPS, previousEPS) => {
  if (!previousEPS || previousEPS === 0) return null;
  return ((currentEPS - previousEPS) / Math.abs(previousEPS)) * 100;
};

/**
 * Kelly Criterion - คำนวณขนาดการลงทุนที่เหมาะสม
 */
export const kellyFormula = (winRate, avgWin, avgLoss) => {
  if (avgWin <= 0 || avgLoss <= 0) return 0;
  const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
  return Math.max(0, Math.min(kelly, 0.25)); // จำกัดไม่เกิน 25% ของพอร์ต
};

/**
 * Sharpe Ratio - วัดผลตอบแทนเทียบกับความเสี่ยง
 */
export const calculateSharpeRatio = (returns, riskFreeRate = 0.02) => {
  if (returns.length === 0) return null;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return null;
  return (avgReturn - riskFreeRate) / stdDev;
};

/**
 * Risk/Reward Ratio
 */
export const calculateRiskReward = (entryPrice, targetPrice, stopLoss) => {
  const reward = targetPrice - entryPrice;
  const risk = entryPrice - stopLoss;
  
  if (risk <= 0) return null;
  return reward / risk;
};

/**
 * ตรวจจับสัญญาณซื้อขาย (Simple Strategy)
 */
export const detectSignals = (data) => {
  const signals = [];
  
  // คำนวณ indicators
  const ma20 = calculateMA(data, 20);
  const ma50 = calculateMA(data, 50);
  const rsi = calculateRSI(data);
  const macd = calculateMACD(data);
  
  const latestData = data[data.length - 1];
  const latestMA20 = ma20[ma20.length - 1]?.value;
  const latestMA50 = ma50[ma50.length - 1]?.value;
  const latestRSI = rsi[rsi.length - 1]?.value;
  const latestMACD = macd[macd.length - 1];
  
  // สัญญาณซื้อ
  if (latestMA20 > latestMA50 && latestRSI < 30) {
    signals.push({
      type: 'BUY',
      reason: 'MA20 > MA50 และ RSI oversold',
      strength: 'STRONG',
      price: latestData.close
    });
  } else if (latestMACD?.histogram > 0 && latestRSI < 50) {
    signals.push({
      type: 'BUY',
      reason: 'MACD เป็นบวกและ RSI ต่ำกว่า 50',
      strength: 'MODERATE',
      price: latestData.close
    });
  }
  
  // สัญญาณขาย
  if (latestMA20 < latestMA50 && latestRSI > 70) {
    signals.push({
      type: 'SELL',
      reason: 'MA20 < MA50 และ RSI overbought',
      strength: 'STRONG',
      price: latestData.close
    });
  } else if (latestMACD?.histogram < 0 && latestRSI > 50) {
    signals.push({
      type: 'SELL',
      reason: 'MACD เป็นลบและ RSI สูงกว่า 50',
      strength: 'MODERATE',
      price: latestData.close
    });
  }
  
  return signals;
};

/**
 * วิเคราะห์ว่าเหมาะกับการลงทุนระยะยาวหรือเทรดระยะสั้น
 */
export const analyzeInvestmentType = (financials, technicals) => {
  const scores = {
    longTerm: 0,
    shortTerm: 0
  };
  
  // คะแนนระยะยาว (Fundamental)
  if (financials.pe && financials.pe < 20) scores.longTerm += 2;
  if (financials.roe && financials.roe > 15) scores.longTerm += 2;
  if (financials.debtToEquity && financials.debtToEquity < 1) scores.longTerm += 2;
  if (financials.dividendYield && financials.dividendYield > 3) scores.longTerm += 2;
  if (financials.epsGrowth && financials.epsGrowth > 10) scores.longTerm += 2;
  
  // คะแนนระยะสั้น (Technical)
  if (technicals.rsi && (technicals.rsi < 30 || technicals.rsi > 70)) scores.shortTerm += 2;
  if (technicals.macdCrossover) scores.shortTerm += 2;
  if (technicals.volumeSpike) scores.shortTerm += 2;
  if (technicals.volatility && technicals.volatility > 2) scores.shortTerm += 2;
  
  return {
    recommendation: scores.longTerm > scores.shortTerm ? 'LONG_TERM' : 'SHORT_TERM',
    longTermScore: scores.longTerm,
    shortTermScore: scores.shortTerm,
    confidence: Math.abs(scores.longTerm - scores.shortTerm) > 4 ? 'HIGH' : 'MODERATE'
  };
};

export default {
  calculateMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculatePE,
  calculatePB,
  calculateROE,
  calculateDebtToEquity,
  calculateDividendYield,
  calculateEPSGrowth,
  kellyFormula,
  calculateSharpeRatio,
  calculateRiskReward,
  detectSignals,
  analyzeInvestmentType
};
