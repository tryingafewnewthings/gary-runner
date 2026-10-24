'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.GARY_TEST_ENGINE||'chromium';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/gary-world-explorer.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#loading').hidden===true,null,{timeout:65000});
  const frame=page.frames().find(f=>f.url().includes('worldexplorer=1'));
  assert.ok(frame,'real engine iframe loaded');
  assert.equal(await frame.evaluate(()=>GaryWorldExplorer.ready()),true);
  assert.equal(await frame.evaluate(()=>GaryRuntimeStats.snapshot().state),'play');
  const output=path.join(root,'test-results/world-explorer-'+engine);fs.mkdirSync(output,{recursive:true});
  for(const [chapter,offset] of [['street',0],['street',1800],['bridge',210],['bridge',850],['bridge',1210],['wilderness',2400],['wilderness',5600],['wilderness',10170]]){
   const result=await frame.evaluate(([c,o])=>{GaryWorldExplorer.seek(c,o);return {snap:GaryWorldExplorer.snapshot(),png:GaryWorldExplorer.capture()}},[chapter,offset]);
   assert.equal(result.snap.chapter,chapter);assert.equal(Math.round(result.snap.offset),offset);
   const buffer=Buffer.from(result.png.split(',')[1],'base64');
   assert.equal(buffer.readUInt32BE(16),360);assert.equal(buffer.readUInt32BE(20),640);
   fs.writeFileSync(path.join(output,chapter+'-'+offset+'.png'),buffer);
  }
  await page.locator('#weather').selectOption('rain');
  assert.equal((await frame.evaluate(()=>GaryWorldExplorer.snapshot())).mode,'rain');
  await page.locator('#gary').uncheck();await page.locator('#hud').uncheck();
  assert.deepEqual(await frame.evaluate(()=>{const s=GaryWorldExplorer.snapshot();return [s.gary,s.hud]}),[false,false]);
  await page.locator('#seek').evaluate(el=>{el.value='3400';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(Math.round((await frame.evaluate(()=>GaryWorldExplorer.snapshot())).offset),3400);
  await page.locator('#tour').click();await page.waitForTimeout(180);
  const moved=await frame.evaluate(()=>GaryWorldExplorer.snapshot().offset);assert.ok(moved>3400,'tour advances');
  await page.locator('#freeze').click();
  const dl=page.waitForEvent('download',{timeout:12000});await page.locator('#shot').click();
  assert.match((await dl).suggestedFilename(),/gary-wilderness-\d+\.png/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'no horizontal mobile overflow');
  await page.screenshot({path:path.join(output,'iphone.png'),fullPage:true});
  // Normal Play must not expose inspector controls.
  const normal=await browser.newPage();await normal.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(await normal.evaluate(()=>typeof window.GaryWorldExplorer),'undefined');
  assert.deepEqual(errors,[]);
  console.log(engine+': real-engine world explorer, 8 native captures, weather, layers, tour, download and isolation PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
