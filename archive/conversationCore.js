(function(window){
  'use strict';
  function detectIntent(text){
    const t=(text||'').toLowerCase();
    if(/^(\s*)?(hi|hey|hello|hiya|good (morning|afternoon|evening))\b/.test(t)) return 'greeting';
    if(/anxi|panic|overwhelm|stress|stressed/.test(t)) return 'anxiety';
    if(/sleep|insomnia|tired/.test(t)) return 'sleep';
    if(/lonely|alone|isolat/.test(t)) return 'lonely';
    if(/no motivation|unmotivated|cant focus|can't focus/.test(t)) return 'motivation';
    if(/burn ?out|burned out|burnt out|exhausted/.test(t)) return 'burnout';
    if(/grief|loss|lost someone|passed away/.test(t)) return 'grief';
    if(/relationship|breakup|partner|argument/.test(t)) return 'relationship';
    if(/anger|furious|rage/.test(t)) return 'anger';
    if(/thank|thanks|appreciate/.test(t)) return 'gratitude';
    return 'general';
  }
  function applyTone(tone, text){
    if(!text) return text;
    switch(tone){
      case 'gentle': return text.replace(/^([^🌱])/,'🌱 $1');
      case 'motivating':
        if(/(session summary|hotline|risk|emergency)/i.test(text)) return text;
        return text.replace(/^([^🔥])/,'🔥 $1');
      default: return text;
    }
  }
  function getStartOptions(){
    return [
      { label: 'Just checking in', text: "Just checking in — wondering how I'm doing today." },
      { label: 'Feeling stressed', text: "I've been feeling stressed and overwhelmed." },
      { label: 'Feeling low', text: "Lately I've been feeling a bit low and unmotivated." },
      { label: 'Need urgent help', text: "I might need urgent help — I'm worried about my safety." }
    ];
  }
  function routeIntent(ctx, intent, raw){
    const a=(items)=> ctx.addActions(items); const bot=(m)=> ctx.pushBot(m); const clear=()=> ctx.clearActions();
    switch(intent){
      case 'anxiety': bot('That sounds stressful. Would a brief grounding or breathing exercise be helpful?'); ctx.setLastSuggestion('grounding'); a([{label:'Try grounding',handler:ctx.startGrounding},{label:'Show breathing',handler:ctx.startBreathing},{label:'Just listen',handler:()=>{bot('Okay, I am here. Share anything that feels important.'); clear();}}]); break;
      case 'sleep': bot('Sleep struggles can be hard. Sometimes a gentle wind-down routine helps. Want a quick tip?'); ctx.setLastSuggestion('sleep-tip'); a([{label:'Give a tip',handler:()=>{bot('Try a 5-minute screen-free break and a slow exhale pattern (4 in, 6 out) to cue rest.'); clear();}},{label:'Not now',handler:()=>{bot('No problem. We can revisit later.'); clear();}}]); break;
      case 'lonely': bot('Feeling lonely is tough. Would exploring supportive community options help?'); ctx.setLastSuggestion('community'); a([{label:'Suggest resources',handler:()=>{bot('Consider peer support lines or moderated online communities focused on shared interests.'); clear();}},{label:'Skip',handler:()=>{bot('Alright. I can simply listen.'); clear();}}]); break;
      case 'motivation': bot('Motivation dips happen. Want a tiny action planning prompt?'); ctx.setLastSuggestion('action-plan'); a([{label:'Yes plan',handler:()=>{bot('Pick one task under 5 min. After finishing, send me "done" and we can reflect.'); clear();}},{label:'Skip',handler:()=>{bot('Understood. Take your time.'); clear();}}]); break;
      case 'burnout': bot('Burnout feelings can build slowly. Would a tiny recovery micro-step (rest, hydration, brief walk) help?'); ctx.setLastSuggestion('burnout'); a([{label:'Suggest micro-step',handler:()=>{bot('Try a 2-minute pause: stand, stretch, slow exhale. Small resets matter.'); clear();}},{label:'Skip',handler:()=>{bot('Okay — we can just keep talking.'); clear();}}]); break;
      case 'grief': bot('I hear grief in what you shared. There is no right timetable. Would grounding or a remembrance prompt help?'); a([{label:'Grounding',handler:ctx.startGrounding},{label:'Remembrance prompt',handler:()=>{bot('If it feels okay: What is one comforting memory you’d like to hold for a moment?'); clear();}},{label:'Just listen',handler:()=>{bot('I’m here and listening.'); clear();}}]); break;
      case 'relationship': bot('Relationship stress can be heavy. Want a brief communication tip or coping strategy?'); a([{label:'Communication tip',handler:()=>{bot('Try “I feel … when … because …” to express needs without blame.'); clear();}},{label:'Coping strategy',handler:()=>{bot('Short pause + grounding before responding can reduce escalation.'); clear();}},{label:'Skip',handler:()=>{bot('Okay — share more if you wish.'); clear();}}]); break;
      case 'anger': bot('Anger can signal unmet needs. Would paced breathing or a reframing prompt help?'); a([{label:'Paced breathing',handler:ctx.startBreathing},{label:'Reframing prompt',handler:()=>{bot('What need of yours feels threatened right now? Naming it can reduce intensity.'); clear();}},{label:'Skip',handler:()=>{bot('Alright. I can stay with you while you process.'); clear();}}]); break;
      case 'gratitude': bot('I appreciate you too. Anything else you’d like to explore or should we begin wrapping up?'); break;
      case 'greeting':
        bot('Hi there — good to meet you. Whenever you’re ready, you can tell me what’s on your mind or pick a quick starter below.');
        a([
          {label:'Feeling stressed', handler:()=>{ bot('Stress can build up — want a grounding or breathing exercise?'); ctx.setLastSuggestion('grounding'); a([{label:'Grounding',handler:ctx.startGrounding},{label:'Breathing',handler:ctx.startBreathing},{label:'Just listen',handler:()=>{bot('I can simply listen. Share anything whenever you like.'); ctx.clearActions(); }}]); }},
          {label:'Feeling low', handler:()=>{ bot('Low moods can feel heavy. We can try a tiny coping step or just talk.'); ctx.clearActions(); }},
          {label:'Just checking in', handler:()=>{ bot('Okay — how have you been feeling lately?'); ctx.clearActions(); }}
        ]);
        break;
      default: bot('Thanks for sharing — can you tell me how long you\'ve felt like this?');
    }
  }
  function maybeOfferGrounding(ctx){ if(ctx.lastSuggestion==='grounding') return; ctx.setLastSuggestion('grounding'); ctx.pushBot('That sounds really tough. Would a short grounding exercise help?'); ctx.addActions([{label:'Yes grounding',handler:ctx.startGrounding},{label:'Breathing',handler:ctx.startBreathing},{label:'No thanks',handler:()=>{ctx.pushBot('Okay — I will just stay with you in this. Share anything you like.'); ctx.clearActions();}}]); }
  function offerHighRiskSupport(ctx, meta){ if(ctx.escalation.offered){ ctx.pushBot('Please choose: hotline info, grounding, or just talk.'); return } ctx.setEscalation({...ctx.escalation, offered:true}); ctx.pushBot("I sense this may be urgent. You're not alone. I can show hotline info, guide grounding, or just listen. What would you like?"); ctx.addActions([{label:'Hotline info',handler:()=> showHotlines(ctx)},{label:'Grounding',handler:ctx.startGrounding},{label:'Just listen',handler:()=>{ ctx.pushBot('I will stay with you here. Type anything that comes up.'); ctx.clearActions(); }}]); }
  // New: Direct risk clarification + structured safety protocol
  function promptDirectRiskCheck(ctx){
    ctx.pushBot("I want to check in for your safety. Are you thinking about harming yourself or ending your life?");
    ctx.addActions([
      { label:'Yes – need help', handler:()=> { ctx.clearActions(); ctx.pushBot("Thank you for telling me. Your safety matters. I can show crisis hotline info now."); showHotlines(ctx); ctx.pushBot("If you can, reach out to someone you trust or a professional. You're not alone."); } },
      { label:'No, just overwhelmed', handler:()=> { ctx.clearActions(); ctx.pushBot("I’m relieved you’re here with me. We can focus on grounding or just talk—what would help right now?"); ctx.addActions([{label:'Grounding',handler:ctx.startGrounding},{label:'Breathing',handler:ctx.startBreathing},{label:'Just listen',handler:()=>{ ctx.pushBot('I will stay with you here. Share anything you want.'); ctx.clearActions(); }}]); } },
      { label:'Prefer not to say', handler:()=> { ctx.clearActions(); ctx.pushBot("That’s okay. I’ll still share crisis resources in case they help. You deserve support."); showHotlines(ctx); } }
    ]);
  }
  function reinforceAutonomy(ctx){ ctx.pushBot("You’re in control of what you share. I won’t diagnose or judge. I can stay with you and offer options anytime."); }
  function showHotlines(ctx){ ctx.clearActions(); const region=localStorage.getItem('hotlineRegion')||'us'; const map={us:'988 (Suicide & Crisis Lifeline) — call or text 988',uk:'Samaritans: 116 123',ca:'988 (Talk Suicide Canada)',au:'Lifeline: 13 11 14'}; ctx.pushBot(`Here are hotline details (${region.toUpperCase()}): ${map[region]||map.us}. If you are in immediate danger, contact local emergency services.`); ctx.setEscalation({...ctx.escalation, accepted:true}); }
  function startGrounding(ctx){ ctx.clearActions(); const f=ctx.pacingFactor||1; ctx.pushBot('Let’s try a 5-4-3-2-1 grounding. Ready? (You can type stop anytime)'); setTimeout(()=>ctx.pushBot('Name 5 things you can see.'), 800*f); setTimeout(()=>ctx.pushBot('Great. Now 4 things you can touch.'), 5000*f); setTimeout(()=>ctx.pushBot('Now 3 things you can hear.'), 9500*f); setTimeout(()=>ctx.pushBot('Next 2 things you can smell or like the scent of.'), 14000*f); setTimeout(()=>ctx.pushBot('Finally 1 thing you appreciate about yourself right now.'), 18500*f); setTimeout(()=>ctx.pushBot('How do you feel now? A tiny shift counts.'), 24000*f); }
  function startBreathing(ctx){ ctx.clearActions(); const f=ctx.pacingFactor||1; ctx.pushBot('Let’s do a brief paced breathing: Inhale 4, hold 2, exhale 6. I’ll count a few cycles.'); let cycle=0; function step(){ if(cycle>=3){ ctx.pushBot('Nice work. Notice any small change in tension?'); return } cycle++; ctx.pushBot(`Cycle ${cycle}: Inhale (4) ... Hold (2) ... Exhale (6).`); setTimeout(step, 6000*f); } setTimeout(step, 800*f); }
  function endSession(ctx){ const userMsgs=(ctx.messages||[]).filter(m=>m.type==='user').length; const today=(ctx.logs||[]).find(l=> l.date === (new Date().toISOString().slice(0,10))); ctx.pushBot(`Session summary: ${userMsgs} messages shared${today? ', mood saved today at level '+today.mood:''}. Remember this space is not clinical care but a reflective aid.`); ctx.pushBot('You can clear this conversation or start fresh. Take care of yourself.'); ctx.setSessionPhase && ctx.setSessionPhase('ended'); ctx.analyticsEvent && ctx.analyticsEvent('session_end',{userMsgs}); ctx.addActions([{label:'Start new session',handler:()=>{ ctx.resetConversation && ctx.resetConversation(); ctx.setSessionPhase('active'); ctx.pushBot('New session started. Share anything when ready.'); ctx.clearActions(); }},{label:'Clear & close',handler:()=>{ ctx.clearActions(); }}]); }
  window.conversationCore = { detectIntent, routeIntent, maybeOfferGrounding, offerHighRiskSupport, showHotlines, startGrounding, startBreathing, endSession, getStartOptions, applyTone, promptDirectRiskCheck, reinforceAutonomy };
  window._mfTest = window._mfTest || {}; window._mfTest.detectIntent = detectIntent;
})(window);