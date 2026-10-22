/* Gary Eats! biome workspace — local candidate artwork, not a gameplay editor.
   All asset drawing is owned by the isolated real engine GaryAssetPreview API.
   No writes, authentication, external dependencies or automatic visual approval. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const SCENES=['street-day','street-rain','bridge-approach','bridge-enter','bridge-middle','bridge-exit','wilderness-reveal','wilderness-dense'];
 const PASSES=new Set(['ground','rear','under-water','deck','front']);
 const LIMIT=20,MAX_FILE=3*1024*1024,MAX_TOTAL=18*1024*1024,MAX_PX=3000000;
 const state={assets:[],selected:null,scene:'wilderness-reveal',ready:false,importing:false,renderQueued:false,loadToken:0};
 const game=$('game'),overlay=$('touch'),ctx=overlay.getContext('2d');
 let drag=null,unique=0;
 const status=(message)=>{$('status').textContent=message;};
 const busy=(message)=>{$('busy').textContent=message;};
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
 const slug=(s)=>String(s||'biome').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,44)||'biome';
 const selected=()=>state.assets.find(a=>a.id===state.selected)||null;
 function engine(){
  try{return game.contentWindow?.GaryAssetPreview||null;}catch(_){return null;}
 }
 function setScene(value){
  if(!SCENES.includes(value))return;
  state.scene=value;$('scene').value=value;$('timeline').value=String(SCENES.indexOf(value));
  if(state.ready){
   const api=engine();
   try{if(!api.startScene(value))throw Error('Scene unavailable');renderPack();}
   catch(e){status('Cannot load scene: '+e.message);}
  }
 }
 function ensureEngine(){
  if(game.src.includes('bridgepreview=1'))return;
  status('Loading the isolated real game renderer…');
  game.src='index.html?debug=1&bridgepreview=1&seed=12345';
 }
 function waitEngine(){
  const token=++state.loadToken;
  let attempt=0;
  function tick(){
   if(token!==state.loadToken)return;
   const api=engine();
   if(api?.ready?.()){
    state.ready=true;
    try{
     if(!api.startScene(state.scene))throw Error('Scene preview failed');
     renderPack();status('Actual game ready. Tap an asset or drag it to adjust placement.');
    }catch(e){status('Preview unavailable: '+e.message);}
    return;
   }
   if(++attempt<110)setTimeout(tick,220);
   else status('Game assets failed to load. Open the preview again or refresh.');
  }
  tick();
 }
 function registryFor(name){
  const base=String(name).replace(/\.png$/i,'').toLowerCase();
  const registry=window.GaryWildernessData?.assets||{};
  const match=Object.values(registry).find(x=>x.path?.split('/').pop()?.toLowerCase()===base+'.png');
  if(match)return {width:match.width,height:match.height,w:match.drawWidth,h:match.drawHeight,
   anchor:match.anchor,role:match.role,source:'legacy-measured-unapproved'};
  if(['lower','deck','foreground'].includes(base))
   return {width:720,height:2000,w:360,h:1000,anchor:[360,1600],role:base,source:'bridge-review-unapproved'};
  return null;
 }
 function guess(name,w,h,index){
  const reg=registryFor(name);
  const exact=reg&&reg.width===w&&reg.height===h;
  let width,height,pass,defaultX;
  if(exact){
   width=reg.w;height=reg.h;
   pass=reg.role==='surface'||reg.role==='decal'?'ground':
    reg.role==='lower'?'under-water':reg.role==='deck'?'deck':
    reg.role==='foreground'?'front':'rear';
  }else{
   // Explicitly provisional preview guess; never exported as approved geometry.
   width=clamp(Math.round(w*.20),22,Math.min(90,360));
   height=clamp(Math.round(width*h/w),20,240);
   pass='rear';
  }
  if(pass==='deck'||pass==='under-water')defaultX=pass==='deck'?0:101;
  else if(pass==='ground')defaultX=reg?.role==='surface'?105:clamp(index%2===0?35:270,-100,360-width);
  else defaultX=clamp(index%2===0?30:286-width,-100,360-width);
  return {draw:{x:defaultX,y:clamp(430+(index%5)*20-height,0,1000),width,height},
   pass,registration:exact?'MEASURED_LEGACY_DIMENSIONS_UNAPPROVED':'PROVISIONAL_PREVIEW_SCALE'};
 }
 function safeAsset(a){
  return {id:a.id,name:a.name,source:{width:a.source.width,height:a.source.height},
   draw:{x:a.draw.x,y:a.draw.y,width:a.draw.width,height:a.draw.height},pass:a.pass,
   opacity:a.opacity,scrollWithWorld:a.scrollWithWorld,alpha:a.alpha,
   registration:a.registration,approval:'UNVERIFIED_VISUAL',registered:false,
   collision:'NOT_DEFINED'};
 }
 function checkAlpha(img){
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  if(c.width*c.height>MAX_PX)throw Error('PNG dimensions exceed the 3 million pixel phone limit');
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const data=g.getImageData(0,0,c.width,c.height).data;
  let transparent=0,painted=0;
  for(let i=3;i<data.length;i+=4){if(data[i]<8)transparent++;if(data[i]>64)painted++;}
  if(painted===0)throw Error('PNG has no visible painted pixels');
  return transparent>0?'TRANSPARENT_ALPHA_FOUND':'OPAQUE_OR_NO_TRUE_TRANSPARENCY';
 }
 function loadImage(dataUrl){
  return new Promise((resolve,reject)=>{
   const im=new Image();
   im.onload=()=>resolve(im);
   im.onerror=()=>reject(Error('Cannot decode PNG'));
   im.src=dataUrl;
  });
 }
 function readData(file){
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(Error('Cannot read '+file.name));
   reader.readAsDataURL(file);
  });
 }
 async function loadFile(file,index){
  if(file.type!=='image/png'||!/\.png$/i.test(file.name))throw Error(file.name+': PNG only');
  if(file.size>MAX_FILE)throw Error(file.name+': PNG exceeds 3 MB limit');
  const dataUrl=await readData(file),img=await loadImage(dataUrl);
  const alpha=checkAlpha(img),meta=guess(file.name,img.naturalWidth,img.naturalHeight,index);
  return {id:'art-'+(++unique),name:file.name,source:{width:img.naturalWidth,height:img.naturalHeight},
   dataUrl,image:img,...meta,alpha,opacity:1,scrollWithWorld:true};
 }
 function totalBytes(list){return list.reduce((n,a)=>n+Math.ceil((a.dataUrl?.length||0)*.75),0);}
 async function addFiles(files){
  const batch=[...files];if(!batch.length)return;
  if(state.assets.length+batch.length>LIMIT){status('Limit: 20 artwork items per review pack.');return;}
  if(state.importing)return;
  state.importing=true;busy('Checking '+batch.length+' PNGs…');
  try{
   const next=[];
   for(const f of batch){next.push(await loadFile(f,state.assets.length+next.length));}
   const assembled=[...state.assets,...next];
   if(totalBytes(assembled)>MAX_TOTAL)throw Error('Total PNG data exceeds 18 MB phone limit');
   state.assets=assembled;state.selected=next[0].id;
   rebuildList();updateSelection();renderPack();status(next.length+' artwork asset(s) added. All remain unapproved candidates.');
  }catch(e){status('Import failed: '+e.message);}
  finally{state.importing=false;busy('');$('addFiles').value='';}
 }
 function rebuildList(){
  const area=$('assets');area.replaceChildren();
  $('count').textContent=state.assets.length+' / '+LIMIT;
  if(!state.assets.length){const p=document.createElement('div');p.className='empty';p.textContent='No art added yet. Import transparent PNGs to build this biome.';area.append(p);return;}
  state.assets.forEach((a,i)=>{
   const button=document.createElement('button');button.type='button';button.className='item';button.dataset.id=a.id;
   button.setAttribute('aria-pressed',String(state.selected===a.id));
   const thumbnail=document.createElement('img');thumbnail.src=a.dataUrl;thumbnail.alt='';
   const center=document.createElement('div');center.style.minWidth='0';
   const title=document.createElement('strong');title.textContent=a.name;
   const description=document.createElement('span');description.textContent=a.pass+' · '+Math.round(a.draw.width)+' × '+Math.round(a.draw.height);
   center.append(title,description);
   const side=document.createElement('em');side.textContent=i+1+'/'+state.assets.length;
   button.append(thumbnail,center,side);
   button.addEventListener('click',()=>{state.selected=a.id;rebuildList();updateSelection();drawGuide();});
   area.append(button);
  });
 }
 function updateSelection(){
  const a=selected(),active=!!a;
  $('selectedName').textContent=a?a.name:'Select an asset above to move and layer it.';
  for(const id of ['drawX','drawY','drawW','drawH','pass','worldScroll','opacity','duplicate','remove'])$(id).disabled=!active;
  if(!a){$('assetChecks').textContent='No selected artwork.';drawGuide();return;}
  $('drawX').value=a.draw.x;$('drawY').value=a.draw.y;
  $('drawW').value=a.draw.width;$('drawH').value=a.draw.height;
  $('pass').value=a.pass;$('opacity').value=Math.round(a.opacity*100);
  $('worldScroll').checked=a.scrollWithWorld;
  $('assetChecks').textContent=
   'Source PNG: '+a.source.width+' × '+a.source.height+'\nAlpha: '+a.alpha+
   '\nGeometry: '+a.registration+'\nArt: UNVERIFIED_VISUAL\nCollision: NOT_DEFINED\nPhone performance: UNVERIFIED';
  drawGuide();
 }
 function drawGuide(){
  ctx.clearRect(0,0,360,640);
  const a=selected();if(!a)return;
  const d=a.draw;
  ctx.save();ctx.strokeStyle='#ffcc72';ctx.lineWidth=2;
  ctx.setLineDash([7,5]);ctx.strokeRect(d.x,d.y,d.width,d.height);ctx.setLineDash([]);
  ctx.fillStyle='#ffcc72';ctx.beginPath();ctx.arc(d.x+d.width/2,d.y+d.height,3,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
 function renderPack(){
  if(!state.ready)return;
  const api=engine();
  try{
   api.setPack(state.assets.map(a=>({image:a.image,draw:a.draw,pass:a.pass,opacity:a.opacity,
      scrollWithWorld:a.scrollWithWorld})));
   drawGuide();
  }catch(e){status('Game-layer preview error: '+e.message);}
 }
 function queueRender(){
  if(state.renderQueued)return;
  state.renderQueued=true;
  requestAnimationFrame(()=>{state.renderQueued=false;renderPack();});
 }
 function updateFields(){
  const a=selected();if(!a)return;
  const numbers=['drawX','drawY','drawW','drawH'].map(id=>Number($(id).value));
  if(!numbers.every(finite)||numbers[2]<=0||numbers[3]<=0||numbers[2]>360||numbers[3]>1000){
   status('Invalid asset size or position. Previous values retained.');updateSelection();return;
  }
  [a.draw.x,a.draw.y,a.draw.width,a.draw.height]=numbers;
  if(!PASSES.has($('pass').value))return;
  a.pass=$('pass').value;a.opacity=Number($('opacity').value)/100;
  a.scrollWithWorld=$('worldScroll').checked;
  rebuildList();drawGuide();queueRender();
 }
 function pointFromEvent(e){
  const r=overlay.getBoundingClientRect();
  return {x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*640/r.height};
 }
 function pointerDown(e){
  const p=pointFromEvent(e);
  const a=[...state.assets].reverse().find(o=>p.x>=o.draw.x&&p.x<=o.draw.x+o.draw.width&&p.y>=o.draw.y&&p.y<=o.draw.y+o.draw.height);
  if(!a)return;
  state.selected=a.id;rebuildList();updateSelection();
  drag={id:e.pointerId,startX:p.x,startY:p.y,originX:a.draw.x,originY:a.draw.y,assetId:a.id};
  overlay.setPointerCapture?.(e.pointerId);e.preventDefault();
 }
 function pointerMove(e){
  if(!drag||drag.id!==e.pointerId)return;
  const a=selected();if(!a||drag.assetId!==a.id)return;
  const p=pointFromEvent(e);
  a.draw.x=Math.round(clamp(drag.originX+p.x-drag.startX,-1000,1000));
  a.draw.y=Math.round(clamp(drag.originY+p.y-drag.startY,-1000,10000));
  $('drawX').value=a.draw.x;$('drawY').value=a.draw.y;
  drawGuide();queueRender();e.preventDefault();
 }
 function pointerEnd(e){
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;rebuildList();renderPack();
 }
 async function download(data,filename,mime){
  const blob=data instanceof Blob?data:new Blob([data],{type:mime});
  const file=new File([blob],filename,{type:mime});
  if(navigator.canShare?.({files:[file]})){
   try{await navigator.share({files:[file],title:'Gary Eats! candidate biome'});return;}
   catch(e){if(e.name==='AbortError')return;}
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 function exportObject(embed){
  return {schema:'gary-eats-biome-workspace-v1',version:1,
   title:$('biomeName').value.trim().slice(0,64)||'Untitled biome',
   scene:state.scene,cameraContract:'gary-camera-contract.json',
   world:{width:360,height:640,roadLeft:105,roadRight:255,lanes:[130,180,230]},
   status:'CANDIDATE_VISUAL_UNAPPROVED',approved:false,registered:false,
   warnings:['Raised architecture perspective not approved','No collision registration',
    'Not integrated into normal gameplay','Physical iPhone QA not complete',
    'Any legacy wilderness geometry is provisional; DRAFT01 visuals are rejected'],
   assets:state.assets.map(a=>({...safeAsset(a),...(embed?{pngData:a.dataUrl}:{})}))};
 }
 async function exportPack(embed){
  if(!state.assets.length){status('Add some artwork before exporting the biome.');return;}
  const obj=exportObject(embed);
  const name=slug(obj.title)+(embed?'.gary-biome.json':'.gary-layout.json');
  const json=JSON.stringify(obj);
  if(json.length>34*1024*1024){status('Pack exceeds safe iPhone export size. Remove some images.');return;}
  await download(json,name,'application/json');
  status(embed?'Full PNG artwork and placement metadata exported. Nothing installed in the game.':'Placement-only JSON exported (does not contain the PNGs).');
 }
 function validatePackObject(obj){
  if(!obj||obj.schema!=='gary-eats-biome-workspace-v1'||obj.version!==1||!Array.isArray(obj.assets)||
     obj.assets.length>LIMIT||!SCENES.includes(obj.scene))throw Error('Not a supported Gary Eats! biome package');
  for(const [i,a] of obj.assets.entries()){
   if(!a||typeof a.name!=='string'||a.name.length>220||!a.source||!a.draw||
    !PASSES.has(a.pass)||!a.pngData?.startsWith('data:image/png;base64,')||
    ![a.draw.x,a.draw.y,a.draw.width,a.draw.height,a.source.width,a.source.height,a.opacity].every(finite)||
    a.draw.width<=0||a.draw.height<=0||a.draw.width>360||a.draw.height>1000||
    a.source.width<1||a.source.height<1||a.source.width*a.source.height>MAX_PX||
    !(a.opacity>0&&a.opacity<=1))throw Error('Unsafe or incomplete embedded PNG entry '+(i+1));
  }
 }
 async function importPack(file){
  if(!file||state.importing)return;
  if(file.size>34*1024*1024){status('Saved biome is too large for phone import.');return;}
  state.importing=true;busy('Checking the saved biome…');
  try{
   const obj=JSON.parse(await file.text());validatePackObject(obj);
   const next=[];
   for(const [i,a] of obj.assets.entries()){
    const img=await loadImage(a.pngData);
    if(img.naturalWidth!==a.source.width||img.naturalHeight!==a.source.height)throw Error('Source dimensions mismatch in '+a.name);
    next.push({id:'pack-'+(++unique),name:a.name,source:a.source,draw:{...a.draw},
     pass:a.pass,opacity:a.opacity,scrollWithWorld:a.scrollWithWorld!==false,
     dataUrl:a.pngData,image:img,alpha:checkAlpha(img),
     registration:'REIMPORTED_CANDIDATE_UNVERIFIED'});
   }
   if(totalBytes(next)>MAX_TOTAL)throw Error('Biome exceeds local 18 MB artwork limit');
   state.assets=next;state.selected=next[0]?.id||null;
   $('biomeName').value=String(obj.title||'Imported biome').slice(0,64);
   setScene(obj.scene);rebuildList();updateSelection();renderPack();
   status(next.length+' PNGs and their placements restored. Artistic approval remains required.');
  }catch(e){status('Could not import pack: '+e.message);}
  finally{state.importing=false;busy('');$('packFile').value='';}
 }
 function sampleLayout(){
  if(state.assets.length){status('Remove current artwork before loading geometry examples.');return;}
  const colored=[['Ground guide',60,60,'ground',275,355,'#56644d'],
   ['Left-side prop guide',44,100,'rear',52,360,'#777261'],
   ['Foreground guide',42,86,'front',272,405,'#886449']];
  const sample=[];
  for(const [name,w,h,pass,x,y,color] of colored){
   const c=document.createElement('canvas');c.width=w*2;c.height=h*2;
   const g=c.getContext('2d');g.strokeStyle=color;g.lineWidth=9;
   g.fillStyle='rgba(130,145,127,.48)';g.fillRect(14,14,c.width-28,c.height-28);
   g.strokeRect(14,14,c.width-28,c.height-28);
   const dataUrl=c.toDataURL('image/png'),img=new Image();img.src=dataUrl;
   sample.push({id:'demo-'+(++unique),name:name+'.png',image:img,dataUrl,
    source:{width:c.width,height:c.height},draw:{x,y,width:w,height:h},pass,opacity:.75,
    scrollWithWorld:true,alpha:'GEOMETRY_PLACEHOLDER',registration:'EXAMPLE_ONLY_NOT_GAME_ART'});
  }
  state.assets=sample;state.selected=sample[0].id;
  rebuildList();updateSelection();renderPack();
  status('Three geometry placeholders loaded to demonstrate drawing layers. They are NOT approved artwork.');
 }
 function bind(){
  $('scene').addEventListener('change',()=>setScene($('scene').value));
  $('timeline').addEventListener('input',()=>setScene(SCENES[Number($('timeline').value)]));
  $('previous').addEventListener('click',()=>setScene(SCENES[clamp(SCENES.indexOf(state.scene)-1,0,7)]));
  $('next').addEventListener('click',()=>setScene(SCENES[clamp(SCENES.indexOf(state.scene)+1,0,7)]));
  $('start').addEventListener('click',()=>{ensureEngine();waitEngine();});
  $('mobilePreview').addEventListener('click',()=>{ensureEngine();waitEngine();});
  $('addFiles').addEventListener('change',e=>addFiles(e.target.files||[]));
  $('mobileAdd').addEventListener('click',()=>$('addFiles').click());
  $('importPack').addEventListener('click',()=>$('packFile').click());
  $('packFile').addEventListener('change',e=>importPack(e.target.files?.[0]));
  $('demo').addEventListener('click',sampleLayout);
  for(const id of ['drawX','drawY','drawW','drawH','pass','worldScroll','opacity'])$(id).addEventListener('change',updateFields);
  $('duplicate').addEventListener('click',()=>{
   const a=selected();if(!a)return;
   if(state.assets.length>=LIMIT){status('Maximum 20 assets');return;}
   const n={...a,id:'copy-'+(++unique),name:a.name.replace(/\.png$/i,'')+'-copy.png',draw:{...a.draw,x:a.draw.x+14,y:a.draw.y-12}};
   state.assets.push(n);state.selected=n.id;rebuildList();updateSelection();renderPack();
  });
  $('remove').addEventListener('click',()=>{
   if(!selected())return;
   state.assets=state.assets.filter(a=>a.id!==state.selected);
   state.selected=state.assets.at(-1)?.id||null;
   rebuildList();updateSelection();renderPack();
  });
  $('export').addEventListener('click',()=>exportPack(true));
  $('mobileSave').addEventListener('click',()=>exportPack(true));
  $('exportLayout').addEventListener('click',()=>exportPack(false));
  $('screenshot').addEventListener('click',async()=>{
   if(!state.ready){status('Open the real-game preview first.');return;}
   try{
    const src=game.contentDocument?.getElementById('c');
    if(!src)throw Error('Game canvas not loaded');
    const c=document.createElement('canvas');c.width=360;c.height=640;
    c.getContext('2d').drawImage(src,0,0,360,640);
    await download(await new Promise(resolve=>c.toBlob(resolve,'image/png')),
      slug($('biomeName').value)+'-preview.png','image/png');
   }catch(e){status('Screenshot unavailable: '+e.message);}
  });
  overlay.addEventListener('pointerdown',pointerDown);
  overlay.addEventListener('pointermove',pointerMove);
  for(const e of ['pointerup','pointercancel','lostpointercapture'])overlay.addEventListener(e,pointerEnd);
  game.addEventListener('load',waitEngine);
 }
 bind();rebuildList();updateSelection();
 // The engine preload can be substantial; loading begins without requiring a
 // special debug menu interaction, while buttons remain available for retry.
 ensureEngine();waitEngine();
 window.GaryBiomeWorkspace=Object.freeze({snapshot:()=>({assetCount:state.assets.length,scene:state.scene,
  selected:state.selected,ready:state.ready,pack:exportObject(false)}),validatePackObject});
})();