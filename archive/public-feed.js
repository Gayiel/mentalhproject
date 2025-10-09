// Reddit/Tumblr style public feed with infinite scroll, upvotes, tag filter, anon post
(function(){
  if(!window.MF_PUBLIC_FEED) return;
  const API_BASE='';
  let loading=false, offset=0, endReached=false, currentTag=null;
  const pageSize=20;

  const styles = `
  #public-feed-wrapper{max-width:1040px;margin:40px auto;display:grid;grid-template-columns:260px 1fr;gap:28px;padding:0 18px;font-family:Inter,system-ui,sans-serif;}
  @media (max-width:900px){#public-feed-wrapper{grid-template-columns:1fr;}}
  .pf-sidebar{display:flex;flex-direction:column;gap:18px;position:sticky;top:70px;height:fit-content;}
  .pf-box{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;box-shadow:0 2px 4px rgba(0,0,0,0.04);} 
  .pf-feed{display:flex;flex-direction:column;gap:14px;}
  .pf-post{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px 18px;display:grid;grid-template-columns:60px 1fr;gap:14px;position:relative;}
  .pf-vote{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;user-select:none;}
  .pf-vote button{background:#f1f5f9;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
  .pf-vote button:hover{background:#e2e8f0;}
  .pf-score{font-weight:600;}
  .pf-tags{margin-top:6px;font-size:12px;color:#555;display:flex;flex-wrap:wrap;gap:4px;}
  .pf-tag{background:#f1f5f9;padding:4px 8px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:600;}
  .pf-tag:hover{background:#e2e8f0;}
  .pf-meta{font-size:12px;opacity:.65;margin-top:2px;}
  .pf-filter-active{background:#6366f1 !important;color:#fff !important;}
  .pf-load-indicator{padding:28px 0;text-align:center;opacity:.6;}
  .pf-end{padding:30px 0;text-align:center;opacity:.45;font-size:12px;}
  .pf-error{color:#dc2626;font-size:13px;font-weight:600;}
  .pf-form textarea{width:100%;min-height:110px;resize:vertical;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-family:inherit;}
  .pf-form select,.pf-form input{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-family:inherit;}
  .pf-form button{background:#6366f1;color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:600;cursor:pointer;}
  .pf-form button:disabled{opacity:.5;cursor:default;}
  .mood-badge{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;font-size:11px;padding:4px 8px;border-radius:8px;font-weight:600;margin-left:6px;}
  `;
  const st=document.createElement('style'); st.textContent=styles; document.head.appendChild(st);

  // Extended aesthetic enhancements injected as a second style tag so we keep original baseline easily editable
  const extraStyles = `
  /* --- Enchanted feed enhancements (glass, ambient, animations) --- */
  :root {
    --pf-glass-bg: rgba(255,255,255,0.75);
    --pf-glass-border: rgba(255,255,255,0.35);
    --pf-glow-accent: 255,255,255;
    --pf-accent: #6366f1;
  }
  @media (prefers-color-scheme: dark) {
    :root { --pf-glass-bg: rgba(30,32,42,0.55); --pf-glass-border: rgba(255,255,255,0.08); --pf-glow-accent: 99,102,241; }
    body.feed-theme-dark #public-feed-wrapper .pf-post{background:linear-gradient(145deg,rgba(40,44,55,0.72),rgba(32,34,44,0.55));color:#f4f4f7;border-color:rgba(255,255,255,0.06);}  
  }
  body.feed-theme-dark #public-feed-wrapper .pf-box { background:rgba(34,36,46,0.65); color:#f4f4f7; }
  body.feed-theme-dark #public-feed-wrapper .pf-post { background:rgba(44,48,60,0.6); }
  body.feed-theme-dark .pf-tag{background:rgba(255,255,255,0.06);color:#e5e5ef;}
  body.feed-theme-dark .pf-tag:hover{background:rgba(255,255,255,0.12);}

  canvas#pf-ambient-canvas { position:fixed; inset:0; width:100%; height:100%; z-index:-2; pointer-events:none; filter:blur(40px) saturate(140%); opacity:0.85; }
  .pf-ambient-overlay { position:fixed; inset:0; background:radial-gradient(circle at 20% 15%,rgba(255,255,255,0.35),transparent 60%), radial-gradient(circle at 80% 70%,rgba(255,255,255,0.28),transparent 60%); mix-blend-mode:overlay; pointer-events:none; z-index:-1; }
  #public-feed-wrapper{position:relative;}
  .pf-post { backdrop-filter: blur(18px) saturate(160%); -webkit-backdrop-filter: blur(18px) saturate(160%); background: linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55)); border:1px solid var(--pf-glass-border); box-shadow: 0 4px 14px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.4) inset; transition: transform .4s cubic-bezier(.19,1,.22,1), box-shadow .4s ease, background .4s ease; overflow:hidden;}
  .pf-post:before { content:''; position:absolute; inset:0; background:linear-gradient(120deg,rgba(var(--pf-glow-accent),0.09),rgba(255,255,255,0) 55%); opacity:0; transition:opacity .6s ease; pointer-events:none; }
  .pf-post:hover:before { opacity:1; }
  .pf-post:hover { transform:translateY(-4px) rotateX(1deg) rotateY(-1deg); box-shadow:0 14px 32px -6px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5) inset; }
  .pf-post[data-tilt] { will-change: transform; }
  .pf-vote button { background: linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.45)); border:1px solid rgba(0,0,0,0.05); box-shadow:0 2px 4px rgba(0,0,0,0.12); transition:background .3s ease, transform .3s; }
  .pf-vote button:hover { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; transform:translateY(-3px); }
  .pf-vote button:active { transform:translateY(-1px) scale(.96); }
  .pf-theme-toggle { position:sticky; top:20px; display:flex; gap:8px; flex-wrap:wrap; }
  .pf-theme-toggle button { flex:1 1 auto; background:rgba(255,255,255,0.5); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.6); border-radius:10px; padding:8px 10px; cursor:pointer; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
  body.feed-theme-dark .pf-theme-toggle button { background:rgba(40,40,54,0.5); border-color:rgba(255,255,255,0.15); color:#e5e5f0; }
  .pf-theme-toggle button.active { background:linear-gradient(90deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 18px -4px rgba(99,102,241,0.45); }
  .pf-progress { position:fixed; left:0; top:0; height:4px; width:0; background:linear-gradient(90deg,#6366f1,#8b5cf6,#6366f1); z-index:3000; border-radius:0 4px 4px 0; box-shadow:0 0 0 1px rgba(255,255,255,0.6) inset,0 2px 6px rgba(0,0,0,0.25); transition:width .15s ease; }
  /* Skeleton loaders */
  .pf-skeleton { position:relative; overflow:hidden; border-radius:18px; background:linear-gradient(145deg,rgba(255,255,255,0.55),rgba(255,255,255,0.4)); border:1px solid rgba(255,255,255,0.4); height:120px; display:grid; grid-template-columns:60px 1fr; gap:14px; padding:16px 18px; }
  .pf-skeleton:after { content:''; position:absolute; inset:0; background:linear-gradient(120deg,transparent,rgba(255,255,255,0.55),transparent); animation: pf-shimmer 1.3s infinite; opacity:.9; }
  @keyframes pf-shimmer { 0% { transform:translateX(-100%);} 100% { transform:translateX(100%);} }
  .pf-reduced-motion .pf-post, .pf-reduced-motion .pf-skeleton { transition:none!important; animation:none!important; }
  `;
  const st2=document.createElement('style'); st2.textContent=extraStyles; document.head.appendChild(st2);

  function h(tag, attrs={}, children=[]) { const el=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') el.className=v; else if(k==='text') el.textContent=v; else el.setAttribute(k,v); }); children.forEach(c=>el.appendChild(c)); return el; }

  function initLayout(){
    if(document.getElementById('public-feed-wrapper')) return;
    const wrap=h('div',{id:'public-feed-wrapper'});
    const sidebar=h('aside',{class:'pf-sidebar'});
    sidebar.appendChild(renderComposer());
    sidebar.appendChild(renderTagFilterBox());
    sidebar.appendChild(renderThemeToggle());
    const feedCol=h('section',{id:'pf-feed', class:'pf-feed', 'aria-live':'polite'});
    wrap.appendChild(sidebar); wrap.appendChild(feedCol);
    const host=document.querySelector('main')||document.body; host.appendChild(wrap);
    initAmbient();
    initProgressBar();
    initTilt();
    setupScroll();
    loadMore();
  }

  /* THEME TOGGLE */
  const FEED_THEMES=['light','dark'];
  function renderThemeToggle(){
    const box=h('div',{class:'pf-box'});
    box.innerHTML=`<h3 style='margin:0 0 10px;'>Appearance</h3><div class='pf-theme-toggle' role='group' aria-label='Feed theme'>${FEED_THEMES.map(t=>`<button type='button' data-theme='${t}'>${t}</button>`).join('')}</div>`;
    setTimeout(()=>{
      const saved=localStorage.getItem('pf-feed-theme')||'light';
      applyFeedTheme(saved);
      box.querySelectorAll('[data-theme]').forEach(btn=>{
        btn.addEventListener('click',()=>{ applyFeedTheme(btn.getAttribute('data-theme')); });
      });
    },0);
    return box;
  }
  function applyFeedTheme(mode){
    document.body.classList.remove('feed-theme-light','feed-theme-dark');
    document.body.classList.add('feed-theme-'+mode);
    localStorage.setItem('pf-feed-theme',mode);
    document.querySelectorAll('.pf-theme-toggle button').forEach(b=>b.classList.toggle('active', b.getAttribute('data-theme')===mode));
  }

  /* AMBIENT BACKGROUND */
  function initAmbient(){
    if(document.getElementById('pf-ambient-canvas')) return;
    const c=document.createElement('canvas'); c.id='pf-ambient-canvas'; document.body.appendChild(c);
    document.body.appendChild(Object.assign(document.createElement('div'),{className:'pf-ambient-overlay'}));
    const ctx=c.getContext('2d');
    let w=window.innerWidth, h=window.innerHeight; c.width=w; c.height=h;
    const dots=Array.from({length:38},()=>({
      x:Math.random()*w,
      y:Math.random()*h,
      r: 40+Math.random()*120,
      dx:(Math.random()-.5)*0.18,
      dy:(Math.random()-.5)*0.18,
      hue: Math.floor(200+Math.random()*140)
    }));
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function tick(){
      ctx.clearRect(0,0,w,h);
      dots.forEach(d=>{
        d.x+=d.dx; d.y+=d.dy;
        if(d.x<-d.r) d.x=w+d.r; else if(d.x>w+d.r) d.x=-d.r;
        if(d.y<-d.r) d.y=h+d.r; else if(d.y>h+d.r) d.y=-d.r;
        const g=ctx.createRadialGradient(d.x,d.y,d.r*0.1,d.x,d.y,d.r);
        g.addColorStop(0,`hsla(${d.hue},70%,70%,0.55)`);
        g.addColorStop(1,'hsla('+d.hue+',70%,70%,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
      });
      if(!reduced) requestAnimationFrame(tick);
    }
    tick();
    window.addEventListener('resize',()=>{ w=window.innerWidth; h=window.innerHeight; c.width=w; c.height=h; });
  }

  /* SCROLL PROGRESS */
  function initProgressBar(){ if(document.querySelector('.pf-progress')) return; const bar=document.createElement('div'); bar.className='pf-progress'; document.body.appendChild(bar); updateScrollProgress(); }
  function updateScrollProgress(){ const bar=document.querySelector('.pf-progress'); if(!bar) return; const scrollTop=window.scrollY; const docHeight=document.documentElement.scrollHeight - window.innerHeight; const pct= docHeight>0 ? (scrollTop/docHeight)*100 : 0; bar.style.width=pct+'%'; }

  /* SKELETONS */
  function createSkeletons(n=3){ const feed=document.getElementById('pf-feed'); if(!feed) return; for(let i=0;i<n;i++){ const sk=document.createElement('div'); sk.className='pf-skeleton'; sk.setAttribute('aria-hidden','true'); feed.appendChild(sk);} }
  function clearSkeletons(){ document.querySelectorAll('.pf-skeleton').forEach(el=>el.remove()); }

  /* TILT EFFECT */
  function initTilt(){
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches; if(reduced) { document.body.classList.add('pf-reduced-motion'); return; }
    let current=null, rect=null; let raf=null;
    function onEnter(e){ current=e.currentTarget; rect=current.getBoundingClientRect(); }
    function onLeave(){ if(!current) return; current.style.transform=''; current=null; }
    function onMove(e){ if(!current) return; const x=(e.clientX-rect.left)/rect.width; const y=(e.clientY-rect.top)/rect.height; const rotX=(y-0.5)*6; const rotY=(x-0.5)*-6; if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ current.style.transform=`translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg)`; }); }
    document.addEventListener('mouseover',e=>{ const card=e.target.closest('.pf-post'); if(card && !card.dataset.tilt){ card.dataset.tilt='1'; card.addEventListener('mousemove',onMove); card.addEventListener('mouseleave',onLeave); onEnter({currentTarget:card}); }});
  }

  function renderComposer(){
    const box=h('div',{class:'pf-box'});
    box.innerHTML=`<h3 style='margin:0 0 10px;'>Share Something</h3>
      <form class='pf-form' id='pf-form'>
        <select id='pf-mood'>
          <option value=''>Mood (optional)</option>
          <option value='5'>5 - Great</option><option value='4'>4</option><option value='3'>3</option><option value='2'>2</option><option value='1'>1 - Low</option>
        </select>
        <input id='pf-tags' placeholder='tags (comma separated)' style='margin-top:8px;' />
        <textarea id='pf-notes' placeholder="What's on your mind?" style='margin-top:8px;'></textarea>
        <div style='display:flex; justify-content:space-between; align-items:center; margin-top:10px;'>
          <span style='font-size:11px; opacity:.65;'>Anonymous • No account needed</span>
          <button type='submit' id='pf-submit'>Post</button>
        </div>
        <div id='pf-post-error' class='pf-error' style='display:none; margin-top:6px;'></div>
      </form>`;
    box.querySelector('#pf-form').addEventListener('submit', submitPost);
    return box;
  }

  function renderTagFilterBox(){
    const box=h('div',{class:'pf-box'});
    box.innerHTML=`<h3 style='margin:0 0 8px;'>Filter</h3>
      <div id='pf-active-filter' style='font-size:12px; margin-bottom:6px; ${currentTag?'':'display:none;'}'>Filtering by <strong>#<span id='pf-active-tag'></span></strong> <button id='pf-clear-tag' style='margin-left:6px; background:#f1f5f9; border:none; padding:4px 6px; border-radius:6px; cursor:pointer; font-size:11px;'>Clear</button></div>
      <div style='font-size:12px; opacity:.65;'>Click a tag on any post to filter the feed.</div>`;
    return box;
  }

  async function submitPost(e){
    e.preventDefault();
    const btn=document.getElementById('pf-submit');
    const errorBox=document.getElementById('pf-post-error');
    errorBox.style.display='none';
    btn.disabled=true; btn.textContent='Posting...';
    try {
      const mood = document.getElementById('pf-mood').value || null;
      const tagsRaw = document.getElementById('pf-tags').value;
      const notes = document.getElementById('pf-notes').value.trim();
      const tags = tagsRaw.split(',').map(t=>t.trim()).filter(Boolean);
      if(!notes && !mood) throw new Error('Add some text or a mood');
      const res = await fetch(API_BASE+'/api/posts-public',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mood: mood?Number(mood):null, tags, notes })});
      if(!res.ok){ const t=await res.text(); throw new Error(t); }
      const data=await res.json();
      prependPost(data.post);
      // reset form
      document.getElementById('pf-mood').value='';
      document.getElementById('pf-tags').value='';
      document.getElementById('pf-notes').value='';
    } catch(err){ errorBox.textContent=err.message.replace(/<.*?>/g,''); errorBox.style.display='block'; }
    finally { btn.disabled=false; btn.textContent='Post'; }
  }

  function postTemplate(p){
    const date=new Date(p.created_at).toLocaleString();
    const tags=(p.tags||'').split(',').filter(Boolean);
    return `<div class='pf-vote'>
        <button data-up='${p.id}' aria-label='Upvote post ${p.id}'>▲</button>
        <div class='pf-score' id='pf-score-${p.id}'>${p.upvotes||0}</div>
      </div>
      <div>
        <div style='display:flex; align-items:center; flex-wrap:wrap; gap:6px;'>
          <strong>@${p.username}</strong>${p.mood?`<span class='mood-badge'>Mood ${p.mood}</span>`:''}
        </div>
        <div class='pf-meta'>${date}</div>
        <div style='margin-top:8px; white-space:pre-line; line-height:1.45;'>${(p.notes||'').replace(/[<>]/g,'')}</div>
        <div class='pf-tags'>${tags.map(t=>`<span class='pf-tag' data-tag='${t}'>#${t}</span>`).join('')}</div>
      </div>`;
  }

  function prependPost(p){
    const feed=document.getElementById('pf-feed');
    if(!feed) return;
    const art=h('article',{class:'pf-post'}); art.innerHTML=postTemplate(p); attachInteractions(art); feed.prepend(art);
  }

  async function loadMore(){
    if(loading || endReached) return; loading=true;
    const feed=document.getElementById('pf-feed');
    const indicator=document.getElementById('pf-loading') || h('div',{id:'pf-loading', class:'pf-load-indicator', text:'Loading...'});
    if(!indicator.isConnected) feed.appendChild(indicator);
    // Add skeleton placeholders for perceived performance
    if(offset===0) createSkeletons(4); else createSkeletons(2);
    try {
      let url=`/api/feed-public?offset=${offset}&limit=${pageSize}`;
      if(currentTag) url += `&tag=${encodeURIComponent(currentTag)}`;
      const res=await fetch(API_BASE+url);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      indicator.remove();
      clearSkeletons();
      if(!data.posts.length){ if(offset===0) feed.appendChild(h('div',{class:'pf-end', text:'No posts yet.'})); endReached=true; return; }
      data.posts.forEach(p=>{
        const art=h('article',{class:'pf-post'}); art.innerHTML=postTemplate(p); attachInteractions(art); feed.appendChild(art);
      });
      if(data.nextOffset==null){ endReached=true; feed.appendChild(h('div',{class:'pf-end', text:'End of feed'})); }
      else { offset=data.nextOffset; }
    } catch(err){ indicator.textContent='Error loading feed'; }
    finally { loading=false; }
  }

  function attachInteractions(art){
    art.querySelectorAll('[data-up]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id=btn.getAttribute('data-up');
        try { const res=await fetch(`/api/posts/${id}/upvote`,{method:'POST'}); if(!res.ok) return; const data=await res.json(); const sc=document.getElementById('pf-score-'+id); if(sc) sc.textContent=data.upvotes; } catch(e){}
      });
    });
    art.querySelectorAll('.pf-tag').forEach(tagEl=>{
      tagEl.addEventListener('click', ()=>{
        const tg=tagEl.getAttribute('data-tag');
        if(currentTag===tg){ clearTagFilter(); return; }
        currentTag=tg; applyTagFilterUI(); resetFeed();
      });
    });
  }

  function applyTagFilterUI(){
    const activeBox=document.getElementById('pf-active-filter');
    const tagSpan=document.getElementById('pf-active-tag');
    if(!activeBox) return;
    activeBox.style.display='block'; tagSpan.textContent=currentTag;
  }
  function clearTagFilter(){ currentTag=null; const activeBox=document.getElementById('pf-active-filter'); if(activeBox) activeBox.style.display='none'; resetFeed(); }
  function resetFeed(){ offset=0; endReached=false; const feed=document.getElementById('pf-feed'); if(feed){ feed.innerHTML=''; loadMore(); } }

  function setupScroll(){
    window.addEventListener('scroll', ()=>{
      if(endReached) return;
      const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 400);
      if(nearBottom) loadMore();
      updateScrollProgress();
    });
    document.addEventListener('click', e=>{
      if(e.target && e.target.id==='pf-clear-tag'){ clearTagFilter(); }
    });
  }

  window.addEventListener('load', initLayout);
})();