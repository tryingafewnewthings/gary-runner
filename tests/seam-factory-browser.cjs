'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await (process.env.GARY_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.GARY_BROWSER_PATH?{executablePath:process.env.GARY_BROWSER_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-world-explorer.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#position').disabled,null,{timeout:70000});
  const frame=page.frameLocator('#game');
  await page.waitForFunction(()=>!document.querySelector('#seam-prepare').disabled);
  const snapshot=()=>frame.locator('#c').evaluate(c=>({width:c.width,height:c.height,s:window.GaryWorldExplorer.snapshot()}));
  const before=await snapshot();assert.equal(before.s.bridge.near,320);
  const visibility=await frame.locator('#c').evaluate(()=>{
   const api=window.GaryWorldExplorer,before=JSON.stringify(api.snapshot());api.mode('rain');
   const hidden=api.captureFrame(),gary=api.captureFrame({hideGary:false}),hud=api.captureFrame({hideHud:false}),rain=api.captureFrame({hideRain:false});
   const diff=(a,b)=>a.canvas.toDataURL()!==b.canvas.toDataURL();
   api.mode('day');return {gary:diff(hidden,gary),hud:diff(hidden,hud),rain:diff(hidden,rain),restored:JSON.stringify(api.snapshot())===before};
  });assert.deepEqual(visibility,{gary:true,hud:true,rain:true,restored:true});
  const dir=path.join(root,'docs/seam-factory');fs.mkdirSync(dir,{recursive:true});
  const engine=process.env.GARY_TEST_ENGINE||'chromium';
  await page.locator('#seam-prepare').click();
  assert.equal(await page.locator('#seam-kit').isVisible(),true);
  const download=async selector=>{const p=page.waitForEvent('download');await page.locator(selector).click();const d=await p;return {name:d.suggestedFilename(),data:fs.readFileSync(await d.path())};};
  const png=await download('#seam-save');assert.equal(png.name,'seam-template.png');
  await page.locator('#seam-advanced').evaluate(n=>n.open=true);
  const zip=await download('#seam-zip');
  const {unzip}=require('../gary-biome-zip.js');const files=await unzip(new Uint8Array(zip.data).buffer);
  assert.deepEqual([...files.keys()],['seam-template.png','upper-reference.png','lower-reference.png','seam-manifest.json','generation-prompt.txt']);
  const m=JSON.parse(Buffer.from(files.get('seam-manifest.json')));assert.equal(m.worldBoundary.world,before.s.bridge.anchor);
  assert.equal(m.worldBoundary.screenY,320);assert.equal(m.sourceCrops.top.y,192);assert.equal(m.sourceCrops.bottom.y,352);
  assert.equal(m.assetRegistration.worldTop,m.worldBoundary.world+128);assert.equal(m.registration.bridge.end-m.registration.bridge.far,620);
  assert.deepEqual(m.hidden,{gary:true,hud:true,rain:true});assert.deepEqual(await snapshot(),before);
  const {loadImage,createCanvas}=require('@napi-rs/canvas');
  const im=await loadImage(png.data);assert.equal(im.width,360);assert.equal(im.height,256);
  const c=createCanvas(360,256),x=c.getContext('2d');x.drawImage(im,0,0);
  assert.ok(x.getImageData(0,96,360,64).data.every(v=>v===0));
  for(const [name,y] of [['upper-reference.png',0],['lower-reference.png',160]]){const edge=await loadImage(Buffer.from(files.get(name)));const ec=createCanvas(360,96),ex=ec.getContext('2d');ex.drawImage(edge,0,0);assert.deepEqual(x.getImageData(0,y,360,96).data,ex.getImageData(0,0,360,96).data);}
  assert.deepEqual(Buffer.from(files.get('seam-template.png')),png.data);
  if(engine==='chromium')for(const [name,bytes] of files)fs.writeFileSync(path.join(dir,name),bytes);
  await page.locator('#seam-advanced').evaluate(n=>n.open=false);
  await page.screenshot({path:path.join(dir,engine+'-interface.png'),fullPage:true});
  const native=await frame.locator('#c').evaluate(()=>window.GaryWorldExplorer.captureFrame({excludeCandidate:true}).canvas.toDataURL());
  fs.writeFileSync(path.join(dir,engine+'-entrance.png'),Buffer.from(native.split(',')[1],'base64'));
  // Native sharing fallback and clipboard rejection stay actionable.
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});});
  await page.locator('#seam-share').click();assert.match(await page.locator('#seam-status').textContent(),/Save PNG/);
  await page.locator('#seam-copy').click();assert.match(await page.locator('#seam-status').textContent(),/copied|selected/);
  // Actual native import, alpha/dimension rejection, before/after, shared world anchor.
  const candidate=createCanvas(360,256),cx=candidate.getContext('2d');cx.fillStyle='#fa00dd';cx.fillRect(140,110,80,40);
  await page.locator('#seam-file').setInputFiles({name:'candidate.png',mimeType:'image/png',buffer:candidate.toBuffer('image/png')});
  await page.waitForFunction(()=>!document.querySelector('#seam-candidate').hidden);
  const placed=await frame.locator('#c').evaluate(()=>window.GaryAssetPreview.snapshot());assert.equal(placed.draw.y,192);assert.equal(placed.pass,'deck');assert.equal(placed.registered,false);
  await page.locator('#seam-after').uncheck();assert.equal(await frame.locator('#c').evaluate(()=>window.GaryAssetPreview.snapshot()),null);
  await page.locator('#seam-after').check();
  for(const mode of ['day','night','rain']){
   await page.locator('#seam-weather').selectOption(mode);
   assert.equal((await snapshot()).s.bridge.near,320);
   const shot=await frame.locator('#c').evaluate(()=>window.GaryWorldExplorer.captureFrame({hideRain:false}).canvas.toDataURL());
   fs.writeFileSync(path.join(dir,engine+'-candidate-'+mode+'.png'),Buffer.from(shot.split(',')[1],'base64'));
  }
  assert.equal(await page.locator('#seam-kit').isVisible(),false,'lighting invalidates the kit');
  await page.locator('#seam-mode').selectOption('bridge-entrance');
  await page.locator('#seam-advanced').evaluate(n=>n.open=true);
  await page.locator('#seam-manifest-file').setInputFiles({name:'seam-manifest.json',mimeType:'application/json',buffer:Buffer.from(files.get('seam-manifest.json'))});
  await page.waitForFunction(()=>document.querySelector('#seam-status').textContent.includes('restored'));
  await page.locator('#seam-file').setInputFiles({name:'candidate.png',mimeType:'image/png',buffer:candidate.toBuffer('image/png')});
  await page.waitForFunction(()=>!document.querySelector('#seam-candidate').hidden);
  // Sharing resolves only to share-sheet confirmation, never claims attachment.
  await page.locator('#seam-prepare').click();
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:async()=>{},configurable:true});Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});});
  await page.locator('#seam-share').click();assert.match(await page.locator('#seam-status').textContent(),/not verified/);
  await page.locator('#seam-mode').selectOption('bridge-exit');
  const exit=await snapshot();assert.equal(exit.s.bridge.near-620,320);
  assert.equal(await page.locator('#seam-prepare').isDisabled(),true);assert.match(await page.locator('#seam-approval').textContent(),/rejected/);
  await page.locator('#seam-mode').selectOption('custom');assert.equal(await page.locator('#seam-prepare').isDisabled(),true);
  await page.locator('#seam-advanced').evaluate(n=>n.open=true);
  await page.locator('#seam-position').evaluate(n=>{n.value='80';n.dispatchEvent(new Event('input'));});
  await page.locator('#seam-view').scrollIntoViewIfNeeded();const box=await page.locator('#seam-view').boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+128*box.height/640);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+148*box.height/640);await page.mouse.up();
  assert.ok(Math.abs(Number(await page.locator('#seam-position').inputValue())-100)<=1,'CSS pointer quantization is within one logical pixel');
  await page.locator('#seam-mode').selectOption('bridge-entrance');await page.locator('#seam-prepare').click();
  await page.locator('#seam-file').setInputFiles({name:'flattened.png',mimeType:'image/png',buffer:png.data});
  await page.waitForFunction(()=>document.querySelector('#seam-status').textContent.includes('outside'));
  await page.locator('#seam-top').fill('100');assert.equal(await page.locator('#seam-kit').isVisible(),false);
  await page.locator('#seam-top').fill('641');assert.equal(await page.locator('#seam-prepare').isDisabled(),true);
  const generic=await frame.locator('#c').evaluate(()=>{const a=window.GaryWorldExplorer;const b=a.alignSeam({kind:'world',scene:'street-day',world:1500});a.mode('night');return {b,distance:a.snapshot().distance};});
  assert.equal(generic.b.world,1500);assert.equal(generic.distance,1820);
  // No preview APIs in normal Play; no extra registry request or candidate installed.
  const normal=await browser.newPage();await normal.goto('http://127.0.0.1:'+server.address().port+'/index.html');
  assert.equal(await normal.evaluate(()=>typeof window.GaryWorldExplorer),'undefined');assert.equal(await normal.evaluate(()=>typeof window.GaryAssetPreview),'undefined');await normal.close();
  const missing=await browser.newPage();
  await missing.route('**/gary-seam-registry.json*',async route=>{const body=JSON.parse(fs.readFileSync(path.join(root,'gary-seam-registry.json')));body.transitions[0].references.push('missing-seam-reference.png');await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});});
  await missing.goto('http://127.0.0.1:'+server.address().port+'/gary-world-explorer.html');await missing.waitForFunction(()=>!document.querySelector('#position').disabled,null,{timeout:70000});
  assert.equal(await missing.locator('#seam-prepare').isDisabled(),true);assert.match(await missing.locator('#seam-approval').textContent(),/unavailable/);await missing.close();
  assert.equal(errors.length,0,errors.join('; '));console.log('PASS seam factory '+engine+': world registration, immutable kit, alpha, sharing fallback, candidate preview, rejected sources, mobile layout');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
