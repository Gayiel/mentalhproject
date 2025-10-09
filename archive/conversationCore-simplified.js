(function(window){
  'use strict';
  
  // The intent detection function with essential patterns
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
      ctx.pushBot("🔍 Notice 5 things you can SEE around you right now.");
    }, 1000);
    
    setTimeout(()=>{
      ctx.pushBot("👂 Now, notice 4 things you can HEAR.");
    }, 5000);
    
    setTimeout(()=>{
      ctx.pushBot("✋ Next, notice 3 things you can FEEL or TOUCH.");
    }, 9000);
    
    setTimeout(()=>{
      ctx.pushBot("👃 Notice 2 things you can SMELL or would like to smell.");
    }, 13000);
    
    setTimeout(()=>{
      ctx.pushBot("👅 Finally, notice 1 thing you can TASTE or would like to taste.");
    }, 17000);
    
    setTimeout(()=>{
      ctx.pushBot("How are you feeling after this exercise? Sometimes even a small shift toward feeling more present can help.");
      ctx.addActions([
        {label:'It helped', handler:()=>{ctx.pushBot("I'm glad that was helpful. Grounding can be a useful tool when emotions feel overwhelming."); ctx.clearActions();}},
        {label:'Still struggling', handler:()=>{ctx.pushBot("That's okay. These exercises aren't always enough for intense emotions. Would talking more about what's happening help?"); ctx.clearActions();}}
      ]);
    }, 21000);
  }
  
  function startBreathing(ctx){
    ctx.pushBot("Let's try a brief breathing exercise. I'll guide you through slow, deep breaths.");
    
    setTimeout(() => ctx.pushBot("Breathe in slowly through your nose for 4 counts..."), 1000);
    setTimeout(() => ctx.pushBot("Hold for 2 counts..."), 6000);
    setTimeout(() => ctx.pushBot("Breathe out slowly through your mouth for 6 counts..."), 9000);
    setTimeout(() => ctx.pushBot("Again, breathe in slowly through your nose for 4 counts..."), 16000);
    setTimeout(() => ctx.pushBot("Hold for 2 counts..."), 21000);
    setTimeout(() => ctx.pushBot("Breathe out slowly through your mouth for 6 counts..."), 24000);
    
    setTimeout(() => {
      ctx.pushBot("How do you feel now? Even just a few deep breaths can help calm your nervous system.");
      ctx.addActions([
        {label:'Feel better', handler:()=>{ctx.pushBot("I'm glad that helped. Deep breathing activates your parasympathetic nervous system, which helps reduce stress responses."); ctx.clearActions();}},
        {label:'Keep talking', handler:()=>{ctx.pushBot("I'm here to listen. What would help most right now?"); ctx.clearActions();}}
      ]);
    }, 31000);
  }
  
  function getStartOptions(){
    return [
      "I've been feeling anxious lately",
      "I'm having trouble sleeping",
      "I feel lonely",
      "I can't find motivation",
      "I'm feeling burned out",
      "I'm grieving a loss",
      "I'm having relationship problems",
      "I'm struggling with anger"
    ];
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
    getStartOptions
  };
})(window);