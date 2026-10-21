'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright'),root=path.join(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
async function main(){
 const server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch(_){res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1000,height:950},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/gary-difficulty-runtime.js*',route=>route.fulfill({contentType:'text/javascript',body:require('./helpers/active-runtime-test-api.cjs')(fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8'))}));
  await page.goto(`http://127.0.0.1:${server.address().port}/gary-camera-lab.html`);
  await page.waitForFunction(()=>document.querySelector('#engine').contentWindow.GaryBridgePreview&&!document.querySelector('#engine').contentDocument.querySelector('#startBtn').disabled,null,{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('/index.html'));
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'legacy');
  await page.locator('#loadArtwork').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Registered transparent PNG'));
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'UNAPPROVED_BLOCKOUT');
  await page.locator('#footprints').uncheck();await page.locator('#volumes').uncheck();
  // Hide only Lab guide lines for the clean actual-engine export. Engine remains unchanged.
  const dir=path.join(root,'test-results/bridge-art-'+engineName);fs.mkdirSync(dir,{recursive:true});
  for(const view of ['enter','middle','exit']){
   await page.locator(`[data-view="${view}"]`).click();
   assert.equal(Math.round(await frame.evaluate(()=>GaryBridgePreview.snapshot().near)),{enter:560,middle:850,exit:1210}[view]);
   const data=await frame.evaluate(()=>{const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,360,640);return c.toDataURL()});
   fs.writeFileSync(path.join(dir,view+'.png'),Buffer.from(data.split(',')[1],'base64'));
  }
  await page.locator('#copyJson').click();const candidate=JSON.parse(await page.locator('#exportText').inputValue());
  assert.equal(candidate.approved,false);assert.equal(candidate.raisedArchitecture.structureRevision,'connected-arcade-v2');assert.deepEqual(candidate.raisedArchitecture.sideFaceTop,[112,248]);assert.equal(candidate.raisedArchitecture.supportHeight,80);assert.equal(candidate.raisedArchitecture.artworkBlockout,true);
  fs.writeFileSync(path.join(dir,'camera-candidate.json'),JSON.stringify(candidate,null,2)+'\n');
  await page.locator('[data-view="middle"]').click();await page.locator('#footprints').check();await page.locator('#volumes').check();
  await page.screenshot({path:path.join(dir,'camera-lab.png'),fullPage:true});
  const before=await frame.evaluate(()=>GaryRuntimeStats.snapshot());await page.locator('#artwork').uncheck();
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'legacy');assert.deepEqual(await frame.evaluate(()=>GaryRuntimeStats.snapshot()),before);
  await page.locator('#artwork').check();await page.locator('[data-view="enter"]').click();await page.locator('#resume').click();
  const pack=require('../gary-bridge-art-contract.json'),art=require('../gary-bridge-art.js');
  const base=art.sidePoint(pack,-1,400,pack.candidate.supportHeight*pack.candidate.heightProjection+4);base[0]-=2;
  let previousNear=560;
  for(let i=0;i<6;i++){
   await page.waitForTimeout(150);
   const sample=await frame.evaluate(base=>{const near=GaryBridgePreview.snapshot().near,c=document.querySelector('#c'),scale=c.width/360,y=base[1]+near-800;return {near,pixel:[...c.getContext('2d').getImageData(Math.round(base[0]*scale),Math.round(y*scale),1,1).data]};},base);
   assert.ok(sample.near>previousNear);assert.ok(sample.pixel[2]>sample.pixel[0],'submerged base stays water-coloured while the real engine scrolls');previousNear=sample.near;
  }
  await page.locator('#freeze').click();const frozen=await frame.evaluate(()=>GaryBridgePreview.snapshot().near);await page.waitForTimeout(100);assert.equal(await frame.evaluate(()=>GaryBridgePreview.snapshot().near),frozen);assert.deepEqual(errors,[]);
  // Supplied review art uses exactly the same active renderer and isolation boundary.
  await page.locator('#loadReview').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('UNAPPROVED ART REVIEW'));
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'UNAPPROVED_ART_REVIEW');
  assert.equal(await page.locator('#support').isDisabled(),true,'painted registration cannot be distorted by geometry sliders');
  await page.locator('#footprints').uncheck();await page.locator('#volumes').uncheck();
  const reviewDir=path.join(root,'test-results/bridge-review-'+engineName);fs.mkdirSync(reviewDir,{recursive:true});
  // Track allocations through preset selection AND continuous engine playback.
  await frame.evaluate(()=>{window.__reviewCanvases=0;window.__reviewCanvasStacks=[];const create=document.createElement.bind(document);document.createElement=function(name,...args){if(name==='canvas'){window.__reviewCanvases++;window.__reviewCanvasStacks.push(new Error().stack);}return create(name,...args)};});
  for(const view of ['approach','enter','middle','exit']){
   await page.locator(`[data-view="${view}"]`).click();
   // Export exactly 360x640 from the engine, independent of viewport or DPR.
   const png=await frame.evaluate(()=>{const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,360,640);return c.toDataURL();});
   fs.writeFileSync(path.join(reviewDir,view+'.png'),Buffer.from(png.split(',')[1],'base64'));
  }
  assert.ok(await frame.evaluate(()=>__reviewCanvasStacks.every(s=>!s.includes('/gary-bridge-art.js'))),'no artwork rebuild during view changes');
  const presetAllocations=await frame.evaluate(()=>__reviewCanvases);
  await page.locator('[data-view="middle"]').click();
  // A roast and ordinary food remain visible on the safe deck and collectible.
  const visibility=await frame.evaluate(()=>{const c=document.querySelector('#c'),g=c.getContext('2d'),k=c.width/360;
   const before=[...g.getImageData(163*k,330*k,34*k,40*k).data];__test.add('roast',1,350);__test.render();
   const after=[...g.getImageData(163*k,330*k,34*k,40*k).data];return before.some((v,i)=>v!==after[i]);});
  assert.equal(visibility,true,'foreground does not hide centre-deck food');
  await page.locator('[data-view="approach"]').click();
  const statsBefore=await frame.evaluate(()=>GaryRuntimeStats.snapshot());
  const allocationsBefore=await frame.evaluate(()=>__reviewCanvases);
  await frame.evaluate(()=>{window.__reviewDeltas=[];let last;function sample(t){if(last!==undefined)__reviewDeltas.push(t-last);last=t;if(!window.__reviewStop&&__reviewDeltas.length<1800)requestAnimationFrame(sample);}requestAnimationFrame(sample);__test.move(-1);});
  await page.locator('#resume').click();
  const samples=[];let lastNear=0;
  for(let i=0;i<160;i++){
   await page.waitForTimeout(100);
   const sample=await frame.evaluate(()=>{const s=GaryBridgePreview.snapshot(),stats=GaryRuntimeStats.snapshot();
    const result={near:s.near,phase:s.phase,lane:stats.lane,target:stats.target,collapse:s.collapse};
    const y=408+s.near-800;if(y>165&&y<590){const c=document.querySelector('#c'),k=c.width/360;result.water=[...c.getContext('2d').getImageData(78*k,y*k,1,1).data];}return result;});
   assert.ok(sample.near>=lastNear,'scroll never reverses');lastNear=sample.near;
   if(sample.near>=500&&sample.near<1260){assert.equal(sample.target,1);assert.equal(sample.lane,1);}
   if(sample.water)assert.ok(sample.water[2]>sample.water[0],'supplied support remains submerged through scrolling');
   assert.equal(sample.collapse,false);samples.push(sample);
   if(i%6===0){const png=await frame.evaluate(()=>document.querySelector('#c').toDataURL());fs.writeFileSync(path.join(reviewDir,'scroll-'+String(i).padStart(3,'0')+'.png'),Buffer.from(png.split(',')[1],'base64'));}
   if(sample.phase==='done')break;
  }
  assert.equal(samples.at(-1).phase,'done','complete approach, crossing and wilderness exit play continuously');
  await page.locator('#freeze').click();
  const statsAfter=await frame.evaluate(()=>{window.__reviewStop=true;return GaryRuntimeStats.snapshot()});
  const allocationStacks=await frame.evaluate(n=>__reviewCanvasStacks.slice(n),allocationsBefore);
  assert.ok(allocationStacks.every(s=>s.includes('drawCachedCrop')),'only existing street crops may warm during the early approach');
  const performance=await frame.evaluate(()=>{const a=__reviewDeltas.slice(2).sort((a,b)=>a-b);return {samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1),framesOver50ms:a.filter(x=>x>50).length};});
  performance.presetCanvasAllocations=presetAllocations-4;performance.liveStreetCropAllocations=allocationStacks.length;performance.artworkFrameAllocations=0;
  performance.droppedSimulationSeconds=statsAfter.droppedSeconds-statsBefore.droppedSeconds;
  performance.scope='Headless '+engineName+' cloud host, not physical iPhone';
  fs.writeFileSync(path.join(reviewDir,'live-crossing.json'),JSON.stringify({performance,samples},null,2)+'\n');
  await page.locator('#copyJson').click();fs.writeFileSync(path.join(reviewDir,'camera-candidate.json'),await page.locator('#exportText').inputValue());
  // Compare the same moving middle section against the pre-existing bridge.
  // Browser-host timing is diagnostic, never a physical-iPhone FPS claim.
  async function profileMiddle(){
   await page.locator('[data-view="middle"]').click();await page.locator('#resume').click();
   const timing=await frame.evaluate(()=>new Promise(resolve=>{const a=[];let last,first;function tick(t){first??=t;if(last!==undefined)a.push(t-last);last=t;if(t-first<1800)requestAnimationFrame(tick);else{a.sort((a,b)=>a-b);resolve({samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]});}}requestAnimationFrame(tick);}));
   await page.locator('#freeze').click();return timing;
  }
  const comparison={review:await profileMiddle()};await page.locator('#artwork').uncheck();comparison.legacy=await profileMiddle();
  fs.writeFileSync(path.join(reviewDir,'performance-comparison.json'),JSON.stringify(comparison,null,2)+'\n');
  assert.deepEqual(errors,[]);
  console.log(engineName+': same-section timing '+JSON.stringify(comparison));
  console.log(engineName+': supplied art four engine captures, visible food, complete live crossing, lane guidance, independent water and zero artwork frame/cache allocations PASS; '+JSON.stringify(performance));
  console.log(engineName+': Camera Lab registered artwork, three real-engine captures, projection export, layer switching and scrolling PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
