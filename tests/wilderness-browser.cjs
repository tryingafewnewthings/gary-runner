'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright'),root=path.join(__dirname,'..'),engine=process.env.GARY_TEST_ENGINE||'chromium';
async function main(){
 const server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target))}catch(_){res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/gary-difficulty-runtime.js*',route=>route.fulfill({contentType:'text/javascript',body:require('./helpers/active-runtime-test-api.cjs')(fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8'))}));
  await page.goto(`http://127.0.0.1:${server.address().port}/gary-wilderness-preview.html`);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Supplied wilderness'),null,{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('/index.html')),dir=path.join(root,'test-results/wilderness-'+engine);fs.mkdirSync(dir,{recursive:true});
  for(const view of ['bridge','reveal','dense','obstacles','rustle','ruins']){
   await frame.evaluate(view=>{GaryWildernessPreview.start(view);GaryWildernessPreview.freeze()},view);
   const s=await frame.evaluate(()=>GaryWildernessPreview.snapshot());assert.equal(s.stage,{bridge:0,reveal:1,dense:2,obstacles:2,rustle:1,ruins:3}[view]);assert.equal(s.ready,true);
   const png=await frame.evaluate(()=>{const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,360,640);return c.toDataURL()});
   fs.writeFileSync(path.join(dir,view+'.png'),Buffer.from(png.split(',')[1],'base64'));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Live movement, pause, independent rustle and allocation bounds use the real fixed-step loop.
  await frame.evaluate(()=>{GaryWildernessPreview.start('rustle');window.__canvases=0;const create=document.createElement.bind(document);document.createElement=function(name,...args){if(name==='canvas')__canvases++;return create(name,...args)};});
  const before=await frame.evaluate(()=>GaryWildernessPreview.snapshot());await page.waitForTimeout(450);const moving=await frame.evaluate(()=>GaryWildernessPreview.snapshot());assert.ok(moving.progress>before.progress);assert.ok(moving.encounter.time>before.encounter.time);
  await page.locator('#pause').click();const paused=await frame.evaluate(()=>GaryWildernessPreview.snapshot());await page.waitForTimeout(150);assert.deepEqual(await frame.evaluate(()=>GaryWildernessPreview.snapshot()),paused);await page.locator('#resume').click();await page.waitForTimeout(150);assert.ok(await frame.evaluate(()=>GaryWildernessPreview.snapshot().progress)>paused.progress);assert.equal(await frame.evaluate(()=>__canvases),0);
  await page.locator('[data-view="obstacles"]').click();await frame.evaluate(()=>GaryWildernessPreview.freeze());
  const fixture=await frame.evaluate(()=>__test.snapshot());assert.deepEqual(fixture.items.map(x=>x.lane),[0,2,0]);assert.equal(fixture.bridge.collapse,false);
  // Rebuild fresh frames while crossing the feather: retained old pixels must not hide missing terrain.
  const entrance=await frame.evaluate(()=>{
   GaryWildernessPreview.start('bridge');GaryWildernessPreview.freeze();const samples=[];
   for(const target of [150,400]){
    for(let i=0;i<400&&GaryWildernessPreview.snapshot().progress<target;i++){__test.advance(1/60);__test.render()}
    const c=document.querySelector('#c'),g=c.getContext('2d');g.save();g.resetTransform();g.clearRect(0,0,c.width,c.height);g.restore();__test.render();const k=c.width/360;
    samples.push({progress:GaryWildernessPreview.snapshot().progress,alpha:g.getImageData(20*k,620*k,1,1).data[3]});
   }return samples;
  });for(const s of entrance){assert.ok(s.progress>=150);assert.equal(s.alpha,255,'underlying terrain survives the translucent entrance')}
  // Render CPU timing: same engine/host, frozen simulation, warmed caches; no FPS assertion.
  const performance=await frame.evaluate(()=>{
   function bench(view){view();for(let i=0;i<20;i++)__test.render();const ms=[];for(let i=0;i<120;i++){const t=performance.now();__test.render();ms.push(performance.now()-t)}ms.sort((a,b)=>a-b);return {samples:ms.length,medianMs:ms[60],p95Ms:ms[114]}}
   const bridge=bench(()=>{GaryBridgePreview.start('middle');GaryBridgePreview.freeze()}),wilderness=bench(()=>{GaryWildernessPreview.start('dense');GaryWildernessPreview.freeze()});return {bridge,wilderness,cacheCount:GaryWildernessPreview.snapshot().cacheCount,frameCanvasAllocations:__canvases,scope:'Headless cloud '+navigator.userAgent+'; warmed synchronous render CPU, not physical iPhone or GPU frame time'};
  });assert.equal(performance.frameCanvasAllocations,0);
  await frame.evaluate(()=>{GaryWildernessPreview.start('rustle');GaryWildernessPreview.resume()});
  performance.liveRustle=await frame.evaluate(()=>new Promise(resolve=>{const a=[],start=GaryRuntimeStats.snapshot();let last,first;function tick(t){first??=t;if(last!==undefined)a.push(t-last);last=t;if(t-first<1800)requestAnimationFrame(tick);else{a.sort((x,y)=>x-y);const end=GaryRuntimeStats.snapshot();GaryWildernessPreview.freeze();resolve({samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],framesOver50ms:a.filter(x=>x>50).length,droppedSimulationSeconds:end.droppedSeconds-start.droppedSeconds})}}requestAnimationFrame(tick)}));
  assert.equal(await frame.evaluate(()=>__canvases),0);
  fs.writeFileSync(path.join(dir,'performance.json'),JSON.stringify(performance,null,2)+'\n');
  await frame.evaluate(()=>{GaryWildernessPreview.start('reveal');GaryWildernessPreview.freeze()});await page.screenshot({path:path.join(dir,'phone-preview.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(engine+': wilderness six real-engine captures, live scrolling/rustle, pause/resume, safe fixtures, cache bounds PASS; '+JSON.stringify(performance));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error(e);process.exitCode=1});
