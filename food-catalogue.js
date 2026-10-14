/* Gary Eats! — persistent Food Catalogue v1. No dependencies, no impact on gameplay. */
(function () {
  'use strict';
  const STORAGE = 'gary-eats-discovered-food-v1';
  const LABELS = {
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
          found[id] = {firstSeen: parsed[id].firstSeen, count: Math.max(1, Math.min(999999, Math.floor(parsed[id].count) || 1))};
        }
      }
    }
  } catch (e) { /* Private browsing / storage restrictions: retain in memory. */ }
  const save = () => { try { localStorage.setItem(STORAGE, JSON.stringify(found)); } catch (e) {} };
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
  const list=layer.querySelector('#garyCatalogueList');
  let previousFocus=null;
  const paint=()=>{
    let total=foodEntries.length, count=foodEntries.filter(([id])=>!!found[id]).length;
    layer.querySelector('#garyCatalogueSub').textContent = `${count} of ${total} foods discovered · Find food while playing to unlock it.`;
    layer.querySelector('#garyCatalogueFill').style.width = `${total ? (100*count/total) : 0}%`;
    list.textContent='';
    for (const [id, item] of foodEntries) {
      const discovery=found[id], meta=LABELS[id]||{};
      const tile=document.createElement('article');tile.className='garyFoodTile'+(!discovery?' locked':'');
      const art=document.createElement('div');art.className='garyFoodArt';
      if(discovery && item.file){const pic=document.createElement('img');pic.src=item.file;pic.alt='';pic.loading='lazy';pic.onerror=()=>{art.textContent=meta.icon||'🍴'};art.appendChild(pic)}
      else art.textContent=discovery?(meta.icon||'🍴'):'?';
      const title=document.createElement('div');title.className='garyFoodName';title.textContent=discovery?nameFor(id):'??? Undiscovered';
      const info=document.createElement('p');info.className='garyFoodInfo';info.textContent=discovery?(meta.description||'A delicious new discovery.'): 'Find this food on your journey.';
      const bottom=document.createElement('div');bottom.className='garyFoodCount';bottom.textContent=discovery?`Collected ${discovery.count} ${discovery.count===1?'time':'times'} · ${item.points} pts`:'LOCKED';
      tile.append(art,title,info,bottom);list.appendChild(tile);
    }
  };
  const close=()=>{layer.classList.remove('open');layer.setAttribute('aria-hidden','true');(previousFocus||btn).focus();};
  const open=()=>{previousFocus=document.activeElement;paint();layer.classList.add('open');layer.removeAttribute('aria-hidden');layer.querySelector('#garyCatalogueClose').focus();};
  btn.addEventListener('click',open);
  layer.querySelector('#garyCatalogueClose').addEventListener('click',close);
  layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()} if(e.key==='Tab'){e.preventDefault();layer.querySelector('#garyCatalogueClose').focus()}});
  window.GaryFoodCatalogue = Object.freeze({
    discover(id) {
      if (!allowed.has(id)) return false;
      const first = !found[id];
      if(first) found[id]={firstSeen:Date.now(),count:1};
      else found[id].count=Math.min(999999,found[id].count+1);
      save();return first;
    },
    isDiscovered(id){return !!found[id];},
    open,close,
    count(){return Object.keys(found).length;}
  });
})();
