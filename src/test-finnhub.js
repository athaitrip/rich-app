const key = 'd6atpe1r01qnr27iseugd6atpe1r01qnr27isev0';
const symbol = 'BKK:AOT';

fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`)
  .then(r => r.json())
  .then(d => {
    if (d.c > 0) {
      console.log(`✅ ${symbol}: $${d.c}`);
    } else {
      console.log('❌ No data:', d);
    }
  });