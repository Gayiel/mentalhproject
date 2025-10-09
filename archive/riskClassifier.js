// Simple client-side risk classification (MVP)
// No external API calls yet. Heuristic + lightweight sentiment approximation.
(function(){
  const crisisKeywords = [
    'kill myself','end my life','suicide','hurt myself','hurt my self','cut myself','no reason to live','i might harm',
    'take my life','die today','die tonight','want to die','i want to die'
  ];
  const moderateKeywords = [
    'hopeless','worthless','can\'t cope','cant cope','overwhelmed','tired of everything','empty inside','numb','exhausted','burned out','burnt out'
  ];
  const negativeLex = ['sad','alone','tired','afraid','scared','anxious','anxiety','panic','pain','ashamed','guilty','guilt','angry','anger','fear','worried','empty','useless','pointless','meaningless'];
  const positiveLex = ['hope','calm','okay','better','improving','relieved','grateful','safe'];

  function tokenize(str){
    return (str||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
  }

  function sentimentScore(text){
    const toks = tokenize(text);
    if(!toks.length) return 0;
    let pos=0, neg=0;
    toks.forEach(t=>{ if(negativeLex.includes(t)) neg++; else if(positiveLex.includes(t)) pos++; });
    const raw = (pos - neg) / Math.max(toks.length, 4);
    return Math.max(-1, Math.min(1, raw * 4)); // scale up a bit
  }

  function matchList(text, list){
    const lt = text.toLowerCase();
    return list.filter(k => lt.includes(k));
  }

  function classifyRisk(text, history, overrideScore){
    const score = typeof overrideScore === 'number' ? overrideScore : sentimentScore(text);
    const crisisMatches = matchList(text, crisisKeywords);
    const moderateMatches = matchList(text, moderateKeywords);

    // Escalate if prior messages show pattern (simple heuristic: count last 5 high-risk triggers)
    const recent = Array.isArray(history) ? history.slice(-5) : [];
    let priorCrisisSignals = 0;
    recent.forEach(m => {
      if(m && m.type === 'user'){
        priorCrisisSignals += matchList(m.text || '', crisisKeywords).length;
      }
    });

    let level = 'normal';
    if (crisisMatches.length || (score < -0.45 && moderateMatches.length)) level = 'high';
    else if (moderateMatches.length || score < -0.25) level = 'moderate';
    else if (score < -0.1) level = 'low';

    if (priorCrisisSignals >= 2 && level !== 'high') level = 'high';

    return {
      level,
      score: Number(score.toFixed(3)),
      crisisTriggers: crisisMatches,
      moderateTriggers: moderateMatches,
      hasPattern: priorCrisisSignals >= 2
    };
  }

  window.classifyRisk = classifyRisk;
})();
