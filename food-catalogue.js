/* Gary Eats! — Food Catalogue v2: first discoveries, unread highlights and pause-aware notices. */
(function () {
  'use strict';
  const STORAGE = 'gary-eats-discovered-food-v1';
  const LABELS = {
    sausage_roll:{name:'Half-eaten Sausage Roll',icon:'🥐',description:'Golden pastry. Someone got here first.'},
    custard_cream:{name:'Custard Cream',icon:'🍪',description:'A small comfort on a very quiet road.'},
    kebab: { name: 'Kebab', icon: '🥙', description: 'A proper high-street kebab.' },
    fish: { name: 'Fish & Chips', icon: '🐟', description: 'A British classic: golden and crispy.' },
    roast: { name: 'Roast Dinner', icon: '🍽️', description: 'The Sunday roast. Absolutely beautiful.' }
  };
  const foodEntries = Object.entries(typeof ITEMS === 'object' ? ITEMS : {})
    .filter(([, info]) => info && info.kind === 'food');
  const safe = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameFor = id => LABELS[id]?.name || id.replace(/[_-]/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  const allowed = new Set(foodEntries.map(([id])=>id));
  let found = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const id of allowed) {
        if (parsed[id] && Number.isFinite(parsed[id].firstSeen)) {
          found[id] = {firstSeen: parsed[id].firstSeen, count: Math.max(1, Math.min(999999, Math.floor(parsed[id].count) || 1)), unread: parsed[id].unread === true};
        }
      }
    }
  } catch (e) { /* Private browsing / storage restrictions: retain in memory. */ }
  let saveTimer=null, dirty=false;
  const flush=()=>{
    clearTimeout(saveTimer); saveTimer=null;
    if (!dirty) return;
    try { localStorage.setItem(STORAGE,JSON.stringify(found)); dirty=false; } catch(e) {}
  };
  const save=()=>{ dirty=true; if(saveTimer===null) saveTimer=setTimeout(flush,750); };
  addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
  const style = document.createElement('style');
  style.textContent = `
    #garyCatalogueBtn{margin-top:12px;background:transparent;color:#ffe600;border:2px solid #ffe600;box-shadow:none;padding:12px 28px;font-size:.94rem}
    #garyCatalogueLayer{position:absolute;inset:0;background:#0b101bf7;z-index:40;display:none;flex-direction:column;overflow:hidden;color:#f7f3e5;text-align:left}
    #garyCatalogueLayer.open{display:flex}
    #garyCatalogueTop{padding:22px 20px 14px;padding-top:max(22px,env(safe-area-inset-top));background:#151d2c;border-bottom:1px solid #3a4557}
    #garyCatalogueTop .heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
    #garyCatalogueTop h2{margin:0;color:#ffe600;font-size:1.45rem;text-transform:uppercase;letter-spacing:.4px}
    #garyCatalogueClose{width:42px;height:42px;min-width:42px;padding:0;border-radius:50%;background:#344155;color:white;font-size:1.6rem;box-shadow:none}
    #garyCatalogueSub{margin:8px 0 10px;color:#c8d0dc;font-size:.89rem}
    #garyCatalogueBar{height:7px;border-radius:9px;background:#394151;overflow:hidden}
    #garyCatalogueFill{height:100%;width:0;background:#ffe600;transition:width .2s}
    #garyCatalogueList{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px max(20px,env(safe-area-inset-bottom));display:grid;align-content:start;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .garyFoodTile{background:#1c2739;border:1px solid #39475c;border-radius:15px;padding:13px;min-height:177px;min-width:0;display:flex;flex-direction:column;gap:7px}
    .garyFoodTile.locked{background:#19212f;color:#95a0af}
    .garyFoodArt{height:75px;width:100%;display:flex;align-items:center;justify-content:center;background:#121b29;border-radius:9px;font-size:3rem;overflow:hidden}
    .garyFoodArt img{width:100%;height:100%;object-fit:contain}
    .garyFoodTile.locked .garyFoodArt{font-size:2.8rem;color:#677487}
    .garyFoodName{font-size:1rem;font-weight:850;line-height:1.15}
    .garyFoodInfo{font-size:.78rem;color:#cad1df;line-height:1.35;margin:0}
    .garyFoodTile.locked .garyFoodInfo{color:#919dae}
    .garyFoodCount{color:#ffe600;font-weight:700;font-size:.75rem;margin-top:auto}
    .garyFoodTile.unread{border:2px solid #ffe600;background:#303126}
    .garyFoodNew{align-self:flex-start;background:#ffe600;color:#151a23;border-radius:5px;padding:3px 6px;font-size:.66rem;font-weight:900;letter-spacing:1px}
    #garyDiscoveryToast{position:absolute;top:max(118px,calc(env(safe-area-inset-top) + 89px));left:14px;right:14px;z-index:6;pointer-events:none;display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid #e5c75b;border-radius:12px;background:#101b2bf2;box-shadow:0 5px 16px #0005;color:#fff;text-align:left}
    #garyDiscoveryToast[hidden]{display:none}
    #garyDiscoveryToast .icon{font-size:1.8rem;line-height:1}
    #garyDiscoveryToast strong{display:block;color:#ffe07c;font-size:.72rem;letter-spacing:.6px;text-transform:uppercase}
    #garyDiscoveryName{display:block;margin-top:3px;font-weight:800;font-size:.96rem}
    #garyDiscoveryToast small{display:block;margin-top:2px;color:#d4dbe4;font-size:.7rem}
    @media(prefers-reduced-motion:reduce){#garyCatalogueFill{transition:none}}
    @media(max-width:345px){#garyCatalogueList{gap:8px;padding:10px}.garyFoodTile{padding:9px}}
  `;
  document.head.appendChild(style);
  const menu = document.getElementById('menu');
  const stage = document.getElementById('stage');
  if (!menu || !stage) { window.GaryFoodCatalogue = {discover:()=>false}; return; }
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'garyCatalogueBtn'; btn.textContent = 'Food Catalogue';
  btn.setAttribute('aria-haspopup','dialog');
  menu.appendChild(btn);
  const layer = document.createElement('section');
  layer.id = 'garyCatalogueLayer'; layer.setAttribute('role','dialog');
  layer.setAttribute('aria-modal','true'); layer.setAttribute('aria-label','Food catalogue');
  layer.innerHTML = `<div id="garyCatalogueTop"><div class="heading"><h2>Gary's Food Catalogue</h2><button id="garyCatalogueClose" type="button" aria-label="Back to menu">×</button></div><p id="garyCatalogueSub"></p><div id="garyCatalogueBar"><div id="garyCatalogueFill"></div></div></div><div id="garyCatalogueList"></div>`;
  stage.appendChild(layer);
  layer.setAttribute('aria-hidden','true');
  const notice=document.createElement('div');
  notice.id='garyDiscoveryToast';notice.hidden=true;
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.setAttribute('aria-atomic','true');
  notice.innerHTML='<span class="icon" aria-hidden="true"></span><span><strong>New food discovered!</strong><span id="garyDiscoveryName"></span><small>Added to your Food Catalogue</small></span>';
  stage.appendChild(notice);
  const notices=[];
  let noticeTime=0, currentNotice=null, playing=false;
  const updateButton=()=>{
    const unread=Object.values(found).filter(food=>food.unread).length;
    btn.textContent='Food Catalogue'+(unread?' · '+unread+' new':'');
    btn.setAttribute('aria-label','Food Catalogue'+(unread?', '+unread+' new discoveries':''));
  };
  function showNextNotice(){
    currentNotice=notices.shift()||null;noticeTime=0;
    if(currentNotice){
      notice.querySelector('.icon').textContent=LABELS[currentNotice]?.icon||'🍴';
      notice.querySelector('#garyDiscoveryName').textContent=nameFor(currentNotice);
    }
    notice.hidden=!playing||!currentNotice;
  }
  updateButton();
  const list=layer.querySelector('#garyCatalogueList');
  let previousFocus=null;
  const paint=()=>{
    let total=foodEntries.length, count=foodEntries.filter(([id])=>!!found[id]).length;
    layer.querySelector('#garyCatalogueSub').textContent = `${count} of ${total} foods discovered · Find food while playing to unlock it.`;
    layer.querySelector('#garyCatalogueFill').style.width = `${total ? (100*count/total) : 0}%`;
    list.textContent='';
    for (const [id, item] of foodEntries) {
      const discovery=found[id], meta=LABELS[id]||{};
      const tile=document.createElement('article');tile.className='garyFoodTile'+(!discovery?' locked':discovery.unread?' unread':'');
      tile.setAttribute('aria-label',discovery?nameFor(id)+(discovery.unread?', newly discovered':''):'Undiscovered food');
      if(discovery?.unread){const badge=document.createElement('span');badge.className='garyFoodNew';badge.textContent='NEW';tile.appendChild(badge)}
      const art=document.createElement('div');art.className='garyFoodArt';
      if(discovery && item.file){const pic=document.createElement('img');pic.src=item.file;pic.alt='';pic.loading='lazy';pic.onerror=()=>{art.textContent=meta.icon||'🍴'};art.appendChild(pic)}
      else art.textContent=discovery?(meta.icon||'🍴'):'?';
      const title=document.createElement('div');title.className='garyFoodName';title.textContent=discovery?nameFor(id):'??? Undiscovered';
      const info=document.createElement('p');info.className='garyFoodInfo';info.textContent=discovery?(meta.description||'A delicious new discovery.'): 'Find this food on your journey.';
      const bottom=document.createElement('div');bottom.className='garyFoodCount';bottom.textContent=discovery?`Collected ${discovery.count} ${discovery.count===1?'time':'times'} · ${item.points} pts`:'LOCKED';
      tile.append(art,title,info,bottom);list.appendChild(tile);
    }
  };
  const close=()=>{
    if(!layer.classList.contains('open'))return;
    layer.classList.remove('open');layer.setAttribute('aria-hidden','true');
    for(const food of Object.values(found))food.unread=false;
    updateButton();save();(previousFocus||btn).focus();
  };
  const open=()=>{previousFocus=document.activeElement;paint();layer.classList.add('open');layer.removeAttribute('aria-hidden');layer.querySelector('#garyCatalogueClose').focus();};
  btn.addEventListener('click',open);
  layer.querySelector('#garyCatalogueClose').addEventListener('click',close);
  layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()} if(e.key==='Tab'){e.preventDefault();layer.querySelector('#garyCatalogueClose').focus()}});
  window.GaryFoodCatalogue = Object.freeze({
    discover(id) {
      if (!allowed.has(id)) return false;
      const first = !found[id];
      if(first) found[id]={firstSeen:Date.now(),count:1,unread:true};
      else found[id].count=Math.min(999999,found[id].count+1);
      if(first){notices.push(id);if(!currentNotice)showNextNotice();updateButton();}
      save();return first;
    },
    // Called by the fixed gameplay clock. Pausing or hiding the page cannot consume a notice.
    tick(dt){
      if(!playing||!currentNotice)return;
      noticeTime+=dt;
      if(noticeTime>=2.6)showNextNotice();
    },
    setPlaying(value){playing=!!value;notice.hidden=!playing||!currentNotice;},
    resetRun(){notices.length=0;currentNotice=null;noticeTime=0;playing=false;notice.hidden=true;},
    isDiscovered(id){return !!found[id];},
    open,close,
    count(){return Object.keys(found).length;}
  });
})();

