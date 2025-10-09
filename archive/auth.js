// Front-end auth helper
(async function(){
  const API_BASE = ''; // adjust if backend on different origin e.g. 'http://localhost:3001'
  // Provide a simple login/register overlay and feed layout injection
  const root = document.createElement('div');
  root.id = 'auth-shell';
  document.body.prepend(root);

  const style = document.createElement('style');
  style.textContent = `
  #auth-shell { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg,#141824,#1d2533); font-family: Inter, system-ui, sans-serif; z-index: 5000; }
  #auth-shell.hidden { display:none; }
  .auth-card { width: 340px; background: #fff; padding: 28px 26px 30px; border-radius: 18px; box-shadow:0 8px 40px rgba(0,0,0,0.18); animation: fadeIn .4s ease; }
  .auth-card h1 { margin:0 0 14px; font-size: 1.6rem; }
  .auth-field { margin-bottom: 14px; }
  .auth-field label { display:block; font-weight:600; margin-bottom:6px; }
  .auth-field input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #d0d4d9; }
  .auth-actions { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
  .btn-primary { background:#3b82f6; color:#fff; border:none; padding:12px 14px; border-radius:10px; font-weight:600; cursor:pointer; }
  .btn-alt { background:#f1f5f9; color:#111; border:none; padding:10px 14px; border-radius:10px; font-weight:600; cursor:pointer; }
  .auth-meta { margin-top:12px; font-size:12px; color:#555; line-height:1.4; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
  #global-feed { max-width:960px; margin:60px auto; padding:0 20px 120px; display:grid; grid-template-columns:1fr 320px; gap:26px; font-family:Inter,sans-serif; }
  @media (max-width:960px){ #global-feed { grid-template-columns:1fr; } }
  .feed-stream { display:flex; flex-direction:column; gap:16px; }
  .feed-post { background:rgba(255,255,255,0.85); backdrop-filter:blur(8px); border:1px solid rgba(0,0,0,0.06); border-radius:16px; padding:18px 20px; position:relative; overflow:hidden; }
  .feed-post h3 { margin:0 0 4px; font-size:1rem; }
  .feed-post time { font-size:11px; text-transform:uppercase; letter-spacing:1px; opacity:.65; }
  .feed-post .tags { margin-top:8px; font-size:12px; opacity:.75; }
  .feed-post .conversation-snippet { margin-top:10px; font-size:13px; line-height:1.4; white-space:pre-line; }
  .mood-pill { display:inline-block; padding:4px 10px; border-radius:30px; font-size:12px; font-weight:600; background:linear-gradient(90deg,#3b82f6,#6366f1); color:#fff; }
  .sidebar-box { background:#fff; border:1px solid rgba(0,0,0,0.06); padding:18px 20px; border-radius:16px; position:sticky; top:80px; display:flex; flex-direction:column; gap:14px; }
  .logout-btn { margin-top:6px; align-self:flex-start; background:#ef4444; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600; }
  .compose-box { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:16px; padding:16px 18px; display:flex; flex-direction:column; gap:10px; }
  .compose-box textarea { width:100%; border:1px solid #d0d4d9; border-radius:10px; padding:10px; resize:vertical; min-height:90px; }
  .compose-box button { align-self:flex-end; }
  `;
  document.head.appendChild(style);

  function setToken(t){ localStorage.setItem('auth_token', t); }
  function getToken(){ return localStorage.getItem('auth_token'); }
  function clearToken(){ localStorage.removeItem('auth_token'); }

  let currentUser = null;

  function showAuth(){ root.classList.remove('hidden'); }
  function hideAuth(){ root.classList.add('hidden'); }

  async function api(path, options = {}){
    const token = getToken();
    const headers = { 'Content-Type':'application/json', ...(options.headers||{}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(API_BASE + path, { ...options, headers });
    } catch (netErr) {
      throw new Error('NETWORK: Unable to reach backend. Is the server running?');
    }
    if (!res.ok) {
      let payload = await res.text();
      try { const parsed = JSON.parse(payload); payload = parsed.error || JSON.stringify(parsed); } catch(_){}
      throw new Error(payload || ('HTTP ' + res.status));
    }
    return res.json();
  }

  function renderError(msg){
    let box = document.getElementById('auth-error');
    if (!box){
      box = document.createElement('div');
      box.id = 'auth-error';
      box.style.background = '#fee2e2';
      box.style.border = '1px solid #fca5a5';
      box.style.padding = '8px 10px';
      box.style.borderRadius = '8px';
      box.style.fontSize = '13px';
      box.style.fontWeight = '600';
      const card = root.querySelector('.auth-card');
      if (card) card.insertBefore(box, card.firstChild.nextSibling);
    }
    box.textContent = msg;
  }
  function clearError(){ const box = document.getElementById('auth-error'); if (box) box.remove(); }
  function setButtonsDisabled(dis){ ['login-btn','register-btn'].forEach(id=>{ const b=document.getElementById(id); if (b) b.disabled = dis; }); }

  function renderAuth(){
    root.innerHTML = `<div class="auth-card" role="dialog" aria-modal="true">
      <h1>Mind Flow</h1>
      <div class="auth-field"><label for="auth-username">Username</label><input id="auth-username" autocomplete="username" /></div>
      <div class="auth-field"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" /></div>
      <div class="auth-actions">
        <button id="login-btn" class="btn-primary">Log In</button>
        <button id="register-btn" class="btn-alt">Create Account</button>
      </div>
      <div class="auth-meta">Your data is stored locally & synced to the server for multi-device access. Avoid using personal identifying info in notes.</div>
    </div>`;
    const u = document.getElementById('auth-username');
    const p = document.getElementById('auth-password');
    document.getElementById('login-btn').onclick = async () => {
      clearError(); setButtonsDisabled(true);
      try {
        const data = await api('/api/login', { method:'POST', body: JSON.stringify({ username:u.value.trim(), password:p.value }) });
        setToken(data.token); await bootApp();
      } catch(e){ renderError(e.message || 'Login failed'); }
      finally { setButtonsDisabled(false); }
    };
    document.getElementById('register-btn').onclick = async () => {
      clearError(); setButtonsDisabled(true);
      try {
        await api('/api/register', { method:'POST', body: JSON.stringify({ username:u.value.trim(), password:p.value }) });
        // Auto login after successful registration
        const data = await api('/api/login', { method:'POST', body: JSON.stringify({ username:u.value.trim(), password:p.value }) });
        setToken(data.token); await bootApp();
      } catch(e){ renderError(e.message || 'Register failed'); }
      finally { setButtonsDisabled(false); }
    };
  }

  async function bootApp(){
    // detect backend availability early
    let meData = null; let errMsg = '';
    try { meData = await api('/api/me'); } catch(e){ errMsg = e.message; }
    if (!meData){ showAuth(); renderAuth(); if (errMsg.startsWith('NETWORK')) renderError('Backend not reachable. Start server.js on port 3001.'); return; }
    currentUser = meData.user;
    hideAuth();
    renderFeed(currentUser);
    loadFeed();
  }

  function renderFeed(me){
    if (document.getElementById('global-feed')) return;
    const wrap = document.createElement('div');
    wrap.id = 'global-feed';
    const isAdmin = me && me.admin;
    wrap.innerHTML = `<div class="feed-stream" id="feed-stream"></div>
      <div class="sidebar-box" id="sidebar-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="font-weight:700; font-size:1.1rem;">Compose</div>
          <div style="font-size:11px; font-weight:600; ${isAdmin?'background:#6366f1;color:#fff; padding:4px 8px; border-radius:6px;':'display:none;'}">ADMIN</div>
        </div>
        <div class="compose-box">
          <div style="display:flex; gap:8px;">
            <select id="compose-mood" aria-label="Mood" style="padding:8px; border-radius:8px; border:1px solid #d0d4d9;">
              <option value="">Mood?</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
            <input id="compose-tags" placeholder="tags" style="flex:1; padding:8px; border-radius:8px; border:1px solid #d0d4d9;" />
          </div>
          <textarea id="compose-notes" placeholder="What's on your mind?" aria-label="Notes"></textarea>
          <button id="compose-post" class="btn-primary">Post</button>
          <button id="logout-btn" type="button" class="logout-btn">Log Out</button>
        </div>
        ${isAdmin ? `<div class="admin-panel" style="margin-top:18px; border-top:1px solid #eceff3; padding-top:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 style="margin:0; font-size:0.95rem;">Admin Panel</h4>
              <button id="admin-refresh" style="background:#6366f1; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Refresh</button>
            </div>
            <div style="display:flex; gap:6px; margin:10px 0;">
              <button id="admin-toggle-users" style="flex:1; background:#f1f5f9; border:none; padding:6px 8px; border-radius:6px; cursor:pointer; font-size:12px;">Users</button>
              <button id="admin-toggle-posts" style="flex:1; background:#f1f5f9; border:none; padding:6px 8px; border-radius:6px; cursor:pointer; font-size:12px;">Posts</button>
            </div>
            <div id="admin-users" style="display:none; max-height:140px; overflow:auto; font-size:12px; border:1px solid #e2e8f0; border-radius:8px; padding:6px; background:#fff;"></div>
            <div id="admin-posts" style="display:none; max-height:140px; overflow:auto; font-size:12px; border:1px solid #e2e8f0; border-radius:8px; padding:6px; background:#fff; margin-top:8px;"></div>
          </div>`: ''}
      </div>`;
    document.body.appendChild(wrap);

  document.getElementById('logout-btn').onclick = () => { clearToken(); location.reload(); };
    document.getElementById('compose-post').onclick = async () => {
      const mood = document.getElementById('compose-mood').value;
      const tagsRaw = document.getElementById('compose-tags').value;
      const notes = document.getElementById('compose-notes').value;
      const tags = tagsRaw.split(',').map(t=>t.trim()).filter(Boolean);
      try {
        await api('/api/posts', { method:'POST', body: JSON.stringify({ mood: mood?Number(mood):null, tags, notes }) });
        document.getElementById('compose-notes').value='';
        document.getElementById('compose-tags').value='';
        loadFeed();
      } catch(e){ alert('Post failed'); }
    };

    if (isAdmin){
      const btnUsers = document.getElementById('admin-toggle-users');
      const btnPosts = document.getElementById('admin-toggle-posts');
      const btnRefresh = document.getElementById('admin-refresh');
      btnUsers && btnUsers.addEventListener('click', ()=>{
        const box = document.getElementById('admin-users');
        if (!box) return; const visible = box.style.display !== 'none';
        box.style.display = visible ? 'none':'block';
        if (!visible) loadAdminUsers();
      });
      btnPosts && btnPosts.addEventListener('click', ()=>{
        const box = document.getElementById('admin-posts');
        if (!box) return; const visible = box.style.display !== 'none';
        box.style.display = visible ? 'none':'block';
        if (!visible) loadAdminPosts();
      });
      btnRefresh && btnRefresh.addEventListener('click', ()=>{ loadAdminUsers(); loadAdminPosts(); });
    }
  }

  async function loadFeed(){
    const stream = document.getElementById('feed-stream');
    if (!stream) return;
    stream.innerHTML = '<div style="padding:30px 0; text-align:center; opacity:.6;">Loading feed...</div>';
    try {
      const data = await api('/api/feed');
      if (!data.posts.length){
        stream.innerHTML = '<div style="padding:40px; text-align:center; opacity:.6;">No posts yet. Create one using the compose panel.</div>';
        return;
      }
      stream.innerHTML = '';
      data.posts.forEach(p => {
        const div = document.createElement('div');
        div.className = 'feed-post';
        const date = new Date(p.created_at).toLocaleString();
        const conversation = p.conversation_json ? JSON.parse(p.conversation_json) : null;
        const snippet = conversation ? conversation.filter(m=>m.type==='user').map(m=>m.text).slice(0,2).join('\n') : (p.notes || '');
        div.innerHTML = `<div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
            <div>
              <h3>${p.username}</h3>
              <time>${date}</time>
            </div>
            ${p.mood ? `<span class="mood-pill">Mood ${p.mood}</span>` : ''}
          </div>
          <div class="conversation-snippet">${snippet ? snippet.replace(/[<>]/g,'') : ''}</div>
          <div class="tags">${p.tags ? p.tags.split(',').map(t=>`#${t}`).join(' ') : ''}</div>`;
        stream.appendChild(div);
      });
    } catch(e){
      stream.innerHTML = '<div style="padding:40px; text-align:center; color:#dc2626;">Failed to load feed.</div>';
    }
  }

  async function loadAdminUsers(){
    if (!currentUser || !currentUser.admin) return;
    const box = document.getElementById('admin-users');
    if (!box) return; box.innerHTML = 'Loading users...';
    try {
      const data = await api('/api/admin/users');
      if (!data.users.length){ box.innerHTML = '<div style="opacity:.6;">No users</div>'; return; }
      box.innerHTML = data.users.map(u=>`<div style="display:flex; justify-content:space-between; gap:10px; padding:2px 0; border-bottom:1px dotted #e2e8f0;">
        <span>${u.id}. @${u.username}${u.admin?' <strong style=\"color:#6366f1;\">(admin)</strong>':''} — ${u.post_count} posts</span>
      </div>`).join('');
    } catch(e){ box.innerHTML = '<div style="color:#dc2626;">'+e.message+'</div>'; }
  }

  async function loadAdminPosts(){
    if (!currentUser || !currentUser.admin) return;
    const box = document.getElementById('admin-posts');
    if (!box) return; box.innerHTML = 'Loading posts...';
    try {
      const data = await api('/api/admin/posts?limit=50');
      if (!data.posts.length){ box.innerHTML = '<div style="opacity:.6;">No posts</div>'; return; }
      box.innerHTML = data.posts.map(p=>`<div style="padding:2px 0; border-bottom:1px dotted #e2e8f0;">
        <strong>#${p.id}</strong> @${p.username} ${p.mood?`m${p.mood}`:''} ${(p.notes||'').slice(0,40).replace(/[<>]/g,'')}...
      </div>`).join('');
    } catch(e){ box.innerHTML = '<div style="color:#dc2626;">'+e.message+'</div>'; }
  }

  bootApp();
})();