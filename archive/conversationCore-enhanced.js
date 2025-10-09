(function(window){
  'use strict';
  
  // The original conversationCore.js intent detection function with enhancements
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
    
    // Enhanced intent detection
    if(/life (has not|hasn't|isn't) (what i (thought|believed|expected)|what i expected)|lost (purpose|direction)|no (purpose|meaning)|meaningless|no meaning|nothing makes sense/.test(t)) return 'existential';
    if(/moving on (feels|is) (hard|difficult)|can't move on|cannot move on|stuck (on|moving)|hard to move on/.test(t)) return 'adjustment';
    if(/suicid|kill (myself|me)|end my life|don't want to (live|be alive)|harm (myself|me)|cut (myself|me)|want to die|better off dead/.test(t)) return 'self_harm';
    return 'general';
  }
  
  function routeIntent(ctx){
    const intent = detectIntent(ctx.lastMessage);
    switch(intent){
      case 'greeting': ctx.pushBot("Hi there, I'm here to listen. How can I support you today?"); break;
      case 'anxiety': 
        ctx.pushBot("I hear you're feeling anxious. These feelings can be really challenging.");
        maybeOfferGrounding(ctx);
        break;
      case 'sleep': ctx.pushBot("Sleep troubles can affect us deeply. What's been happening with your sleep?"); break;
      case 'lonely': ctx.pushBot("Feeling lonely can be really hard. Would you like to talk more about what's making you feel isolated?"); break;
      case 'motivation': ctx.pushBot("Struggling with motivation can be frustrating. What things have you been finding difficult to do?"); break;
      case 'burnout': 
        ctx.pushBot("Burnout can be exhausting. It sounds like you're carrying a heavy load right now.");
        maybeOfferGrounding(ctx);
        break;
      case 'grief': ctx.pushBot("I'm so sorry for your loss. Grief is a very personal journey. Would you like to share more about what you're experiencing?"); break;
      case 'relationship': ctx.pushBot("Relationship challenges can be really difficult. What's been happening?"); break;
      case 'anger': 
        ctx.pushBot("Feeling angry is completely natural. What triggered these feelings for you?");
        maybeOfferGrounding(ctx);
        break;
      case 'gratitude': ctx.pushBot("You're welcome. I'm here to support you however I can."); break;
      case 'existential': ctx.pushBot("Questioning life's meaning is deeply human. What's brought these thoughts up for you?"); break;
      case 'adjustment': ctx.pushBot("Transitions can be challenging. What's most difficult about moving forward?"); break;
      case 'self_harm': offerHighRiskSupport(ctx); break;
      default: ctx.pushBot("Thank you for sharing that with me. Would you like to tell me more about what you're experiencing?");
    }
    return intent;
  }
  
  function maybeOfferGrounding(ctx){
    if(ctx.lastSuggestion === 'grounding') return;
    ctx.setLastSuggestion && ctx.setLastSuggestion('grounding');
    ctx.pushBot("That sounds difficult. Would a brief grounding exercise help?");
    ctx.addActions([
      {label:'Try grounding', handler:()=>startGrounding(ctx)},
      {label:'Try breathing', handler:()=>startBreathing(ctx)},
      {label:'Just listen', handler:()=>{ctx.pushBot("I'm here to listen. Feel free to continue sharing."); ctx.clearActions();}}
    ]);
  }
  
  function offerHighRiskSupport(ctx){
    ctx.pushBot("I'm concerned about what you've shared. Your wellbeing matters, and it sounds like you're going through something really difficult.");
    showHotlines(ctx);
    ctx.pushBot("Would you like me to help you with some grounding exercises while you consider reaching out?");
    ctx.addActions([
      {label:'Try grounding', handler:()=>startGrounding(ctx)},
      {label:'Show resources', handler:()=>showHotlines(ctx)},
      {label:'Just listen', handler:()=>{ctx.pushBot("I'm here with you. Feel free to share what's happening, and I'll listen."); ctx.clearActions();}}
    ]);
  }
  
  function showHotlines(ctx){
    ctx.pushBot("Here are some resources that can provide immediate support:");
    ctx.pushBot("• 988 Suicide & Crisis Lifeline: Call or text 988");
    ctx.pushBot("• Crisis Text Line: Text HOME to 741741");
    ctx.pushBot("• Emergency Services: 911 (US)");
  }
  
  function startGrounding(ctx){
    ctx.pushBot("Let's try a brief 5-4-3-2-1 grounding exercise to help you feel more present:");
    
    setTimeout(()=>{
      ctx.pushBot("🔍 Notice 5 things you can SEE around you right now. Take your time to observe each one.");
    }, 1000);
    
    setTimeout(()=>{
      ctx.pushBot("👂 Now, notice 4 things you can HEAR. The hum of electronics, outside noises, your own breathing...");
    }, 8000);
    
    setTimeout(()=>{
      ctx.pushBot("✋ Next, notice 3 things you can FEEL or TOUCH. Perhaps the texture of your clothing, the surface you're sitting on, or the temperature of the room.");
    }, 15000);
    
    setTimeout(()=>{
      ctx.pushBot("👃 Notice 2 things you can SMELL or would like to smell.");
    }, 22000);
    
    setTimeout(()=>{
      ctx.pushBot("👅 Finally, notice 1 thing you can TASTE or would like to taste.");
    }, 28000);
    
    setTimeout(()=>{
      ctx.pushBot("How are you feeling after this exercise? Sometimes even a small shift toward feeling more present can help.");
      ctx.addActions([
        {label:'It helped', handler:()=>{ctx.pushBot("I'm glad that was helpful. Grounding can be a useful tool when emotions feel overwhelming."); ctx.clearActions();}},
        {label:'Try breathing', handler:()=>startBreathing(ctx)},
        {label:'Still struggling', handler:()=>{ctx.pushBot("That's okay. These exercises aren't always enough for intense emotions. Would talking more about what's happening help?"); ctx.clearActions();}}
      ]);
    }, 34000);
  }
  
  function startBreathing(ctx){
    ctx.pushBot("Let's try a brief breathing exercise. I'll guide you through several slow, deep breaths.");
    
    let cycle = 0;
    const breathingInterval = setInterval(()=>{
      cycle++;
      if(cycle <= 3){
        ctx.pushBot(`Breathe in slowly through your nose for 4 counts... [${cycle}/3]`);
        
        setTimeout(()=>{
          ctx.pushBot(`Hold for 2 counts... [${cycle}/3]`);
        }, 4000);
        
        setTimeout(()=>{
          ctx.pushBot(`Breathe out slowly through your mouth for 6 counts... [${cycle}/3]`);
        }, 6000);
      } else {
        clearInterval(breathingInterval);
        setTimeout(()=>{
          ctx.pushBot("How do you feel now? Even just a few deep breaths can help calm your nervous system.");
          ctx.addActions([
            {label:'Feel better', handler:()=>{ctx.pushBot("I'm glad that helped. Deep breathing activates your parasympathetic nervous system, which helps reduce stress responses."); ctx.clearActions();}},
            {label:'Try grounding', handler:()=>startGrounding(ctx)},
            {label:'Keep talking', handler:()=>{ctx.pushBot("I'm here to listen. What would help most right now?"); ctx.clearActions();}}
          ]);
        }, 2000);
      }
    }, 12000);
  }
  
  function getStartOptions(){
    return [
      "I've been feeling anxious lately",
      "I'm having trouble sleeping",
      "I feel lonely even when I'm with others",
      "I can't find motivation for anything",
      "I'm feeling burned out from work",
      "I'm grieving a loss",
      "I'm having relationship problems",
      "I'm struggling with anger",
      "I don't know what I want from life anymore",
      "I'm having a hard time moving forward"
    ];
  }
  
  function applyTone(text, tone){
    if(!tone || tone === 'neutral') return text;
    
    switch(tone){
      case 'gentle': 
        return text.replace(/Would (you like|it help)/gi, 'Might it help')
                   .replace(/You should/gi, 'You might consider')
                   .replace(/You need to/gi, 'It could be helpful to');
      case 'direct':
        return text.replace(/I'm wondering if/gi, 'Let\'s')
                   .replace(/Would you like to try/gi, 'Try')
                   .replace(/Perhaps we could/gi, 'Let\'s');
      case 'warm': 
        if(!/you're doing great|well done|good job/i.test(text)) {
          return text.replace(/([.?!])\s*$/, ' I\'m here with you.$1');
        }
        return text;
      case 'supportive':
        return text.replace(/^(I understand|I see|I hear you)/, 'That makes sense, and I appreciate you sharing')
                   .replace(/difficult/gi, 'challenging');
      case 'encouraging':
        return text.replace(/^(I understand|I see)/gi, 'I see your strength in')
                   .replace(/Problem/gi, 'Challenge')
                   .replace(/difficult/gi, 'something you can work through');
      default: return text;
    }
  }
  
  // New: Direct risk clarification + structured safety protocol
  function promptDirectRiskCheck(ctx){
    ctx.pushBot("I want to check in for your safety. Are you thinking about harming yourself or ending your life?");
    ctx.addActions([
      { label:'Yes – need help', handler:()=> { ctx.clearActions(); ctx.pushBot("Thank you for telling me. Your safety matters. I can show crisis hotline info now."); showHotlines(ctx); ctx.pushBot("If you can, reach out to someone you trust or a professional. You're not alone."); } },
      { label:'No, just overwhelmed', handler:()=> { ctx.clearActions(); ctx.pushBot("I'm relieved you're here with me. We can focus on grounding or just talk—what would help right now?"); ctx.addActions([{label:'Grounding',handler:()=>startGrounding(ctx)},{label:'Breathing',handler:()=>startBreathing(ctx)},{label:'Just listen',handler:()=>{ ctx.pushBot('I will stay with you here. Share anything you want.'); ctx.clearActions(); }}]); } },
      { label:'Prefer not to say', handler:()=> { ctx.clearActions(); ctx.pushBot("That's okay. I'll still share crisis resources in case they help. You deserve support."); showHotlines(ctx); } }
    ]);
  }
  
  function reinforceAutonomy(ctx){ 
    ctx.pushBot("You're in control of what you share. I won't diagnose or judge. I can stay with you and offer options anytime."); 
  }
  
  function endSession(ctx){ 
    const userMsgs=(ctx.messages||[]).filter(m=>m.type==='user').length; 
    const today=(ctx.logs||[]).find(l=> l.date === (new Date().toISOString().slice(0,10))); 
    ctx.pushBot(`Session summary: ${userMsgs} messages shared${today? ', mood saved today at level '+today.mood:''}. Remember this space is not clinical care but a reflective aid.`); 
    ctx.pushBot('You can clear this conversation or start fresh. Take care of yourself.'); 
    ctx.setSessionPhase && ctx.setSessionPhase('ended'); 
    ctx.analyticsEvent && ctx.analyticsEvent('session_end',{userMsgs}); 
    ctx.addActions([
      {label:'Start new session',handler:()=>{ 
        ctx.resetConversation && ctx.resetConversation(); 
        ctx.setSessionPhase && ctx.setSessionPhase('active'); 
        ctx.pushBot('New session started. Share anything when ready.'); 
        ctx.clearActions(); 
      }},
      {label:'Clear & close',handler:()=>{ ctx.clearActions(); }}
    ]); 
  }
  
  // Export the conversationCore API
  window.conversationCore = { 
    detectIntent, 
    routeIntent, 
    maybeOfferGrounding, 
    offerHighRiskSupport, 
    showHotlines, 
    startGrounding, 
    startBreathing, 
    endSession, 
    getStartOptions, 
    applyTone, 
    promptDirectRiskCheck, 
    reinforceAutonomy 
  };
  
  // Test harness compatibility
  window._mfTest = window._mfTest || {}; 
  window._mfTest.detectIntent = detectIntent;
})(window);