// SentimentAdapter stub (consent-gated external analysis abstraction)
// For now this is a local heuristic wrapped in a Promise to simulate async API latency.
// In future: replace internalAnalyze with a fetch() to a server-side proxy that scrubs PII.
(function(){
  const NEG = ['sad','alone','tired','afraid','scared','anxious','anxiety','panic','pain','ashamed','guilty','guilt','angry','anger','fear','worried','empty','useless','pointless','meaningless','overwhelmed','numb','exhausted'];
  const POS = ['hope','calm','okay','better','improving','relieved','grateful','safe','progress','proud','appreciate'];

  function tokenize(t){ return (t||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean); }
  function internalAnalyze(text){
    const toks = tokenize(text);
    if(!toks.length) return 0;
    let pos=0,neg=0;
    toks.forEach(w=>{ if(NEG.includes(w)) neg++; else if(POS.includes(w)) pos++; });
    const raw=(pos-neg)/Math.max(toks.length,4);
    return Math.max(-1, Math.min(1, raw*4));
  }

  async function analyze(text, opts={}){
    // Simulated latency 250-500ms
    const latency = 250 + Math.random()*250;
    return new Promise(resolve=>{
      setTimeout(()=>{
        const score = internalAnalyze(text);
        resolve({ score: Number(score.toFixed(3)), provider: 'local-stub', tokens: undefined });
      }, latency);
    });
  }

  window.sentimentAdapter = { analyze };
})();
