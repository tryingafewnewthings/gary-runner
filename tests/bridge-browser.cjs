'use strict';
// Real published engine: no runtime source instrumentation in this preview check.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
async function main(){
 const server=http.createServer((req,res)=>{
  const target=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:360,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/gary-bridge-preview.html`);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Safe centre'),null,{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('/index.html'));
  const output=path.join(root,'test-results/bridge-'+engineName);fs.mkdirSync(output,{recursive:true});
  for(const view of ['approach','enter','middle','exit']){
   assert.equal(await frame.evaluate(view=>{const ok=GaryBridgePreview.start(view);GaryBridgePreview.freeze();return ok},view),true);
   assert.equal(Math.round((await frame.evaluate(()=>GaryBridgePreview.snapshot())).near),{approach:210,enter:560,middle:850,exit:1210}[view]);
   const data=await frame.evaluate(()=>{const c=document.querySelector('#c');return {width:c.width,height:c.height,url:c.toDataURL()}});
   assert.equal(data.width,360);assert.equal(data.height,640);
   fs.writeFileSync(path.join(output,view+'.png'),Buffer.from(data.url.split(',')[1],'base64'));
  }
  // Resume and touch steer through an entire crossing at actual engine speed.
  await page.locator('[data-view="approach"]').tap();
  const before=await frame.evaluate(()=>GaryBridgePreview.snapshot());
  await frame.locator('#c').tap({position:{x:50,y:400}});
  await page.waitForTimeout(800);
  await page.locator('#pause').tap();const paused=await frame.evaluate(()=>GaryBridgePreview.snapshot());
  assert.ok(paused.near>before.near);await page.waitForTimeout(150);
  assert.deepEqual(await frame.evaluate(()=>GaryBridgePreview.snapshot()),paused);
  await page.locator('#resume').tap();
  await page.waitForFunction(()=>document.querySelector('#game').contentWindow.GaryBridgePreview.snapshot().phase==='done',null,{timeout:15000});
  const stats=await frame.evaluate(()=>GaryRuntimeStats.snapshot());assert.equal(stats.state,'play');assert.equal(stats.target,1);
  await page.locator('#replay').tap();await page.locator('#pause').tap();assert.equal((await frame.evaluate(()=>GaryBridgePreview.snapshot())).phase,'approach');
  await frame.evaluate(()=>{GaryBridgePreview.resume();GaryBridgePreview.freeze()});
  await page.screenshot({path:path.join(output,'iphone-preview.png')});
  await page.setViewportSize({width:390,height:667});
  const compact=await page.locator('#game').boundingBox();
  assert.ok(Math.abs(compact.height/compact.width-16/9)<.02,'compact iPhone preview preserves full camera');
  assert.ok((await page.locator('#still').boundingBox()).y+44<667,'controls fit a compact phone');
  await page.screenshot({path:path.join(output,'iphone-compact.png')});assert.deepEqual(errors,[]);
  console.log(`${engineName}: bridge preview loaded, four 360x640 captures, touch crossing, pause/resume and replay PASS`);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
