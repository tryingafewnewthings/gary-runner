'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.join(__dirname,'..'),engine=process.env.GARY_TEST_ENGINE||'chromium';
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
function sprite(color){
 const c=createCanvas(128,128),g=c.getContext('2d');
 g.fillStyle=color;g.fillRect(16,16,96,96);g.clearRect(23,23,8,8);
 return c.toBuffer('image/png');
}
async function downloadBytes(page,selector){
 const pending=page.waitForEvent('download',{timeout:15000});
 await page.locator(selector).click();
 const download=await pending,stream=await download.createReadStream(),parts=[];
 for await (const p of stream)parts.push(p);
 return {name:download.suggestedFilename(),buffer:Buffer.concat(parts)};
}
async function main(){
 const server=http.createServer((req,res)=>{
  const candidate=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!candidate.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(candidate)]||'application/octet-stream');res.end(fs.readFileSync(candidate));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,
   ...(engine==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-biome-workspace.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#stage').count(),1);
  assert.equal(await page.locator('#assetCount').count(),0);
  assert.ok((await page.locator('#touch').boundingBox()).width<=360);
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=390,'mobile interface must not overflow screen');
  await page.waitForFunction(()=>window.GaryBiomeWorkspace?.snapshot()?.ready,null,{timeout:60000});
  assert.equal(await page.locator('#mobileSave').isVisible(),true);
  const sprites=[{name:'test-ground-a.png',mimeType:'image/png',buffer:sprite('#786a51')},
   {name:'test-prop-b.png',mimeType:'image/png',buffer:sprite('#536b66')}];
  await page.locator('#addFiles').setInputFiles(sprites);
  await page.waitForFunction(()=>window.GaryBiomeWorkspace?.snapshot()?.assetCount===2,null,{timeout:15000});
  assert.match(await page.locator('#count').textContent(),/2 \/ 20/);
  const gameCount=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().length);
  assert.equal(gameCount,2,'must be inserted in the real engine simultaneously');
  const select=await page.evaluate(()=>{
   const a=window.GaryBiomeWorkspace.snapshot().pack.assets[0];
   return {x:a.draw.x+25,y:a.draw.y+25,original:a.draw.x};
  });
  await page.locator('#touch').scrollIntoViewIfNeeded();
  const r=await page.locator('#touch').boundingBox(),x=r.x+select.x*r.width/360,y=r.y+select.y*r.height/640;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+18,{steps:3});await page.mouse.up();
  await page.waitForFunction(before=>window.GaryBiomeWorkspace.snapshot().pack.assets[0].draw.x>before,select.original);
  await page.locator('#timeline').evaluate(el=>{el.value='4';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>window.GaryBiomeWorkspace.snapshot().scene==='bridge-middle');
  await page.locator('#export').evaluate(el=>el.closest('details').open=true);
  const first=await downloadBytes(page,'#export');
  assert.match(first.name,/gary-biome\.json$/);
  const pack=JSON.parse(first.buffer.toString('utf8'));
  assert.equal(pack.assets.length,2);
  assert.equal(pack.scene,'bridge-middle');
  assert.equal(pack.approved,false);assert.equal(pack.registered,false);
  assert.ok(pack.assets.every(a=>a.pngData.startsWith('data:image/png;base64,')));
  await page.locator('#remove').click();
  await page.waitForFunction(()=>window.GaryBiomeWorkspace.snapshot().assetCount===1);
  await page.locator('#packFile').setInputFiles({name:'roundtrip.gary-biome.json',mimeType:'application/json',buffer:first.buffer});
  await page.waitForFunction(()=>window.GaryBiomeWorkspace.snapshot().assetCount===2);
  assert.equal(await page.locator('#scene').inputValue(),'bridge-middle');
  // The primary mobile export is a true ZIP containing every PNG and placement manifest.
  const archive=await downloadBytes(page,'#exportZip');
  assert.match(archive.name,/biome\.zip$/);
  assert.deepEqual(Array.from(archive.buffer.subarray(0,4)),[80,75,3,4]);
  await page.locator('#remove').click();
  await page.waitForFunction(()=>window.GaryBiomeWorkspace.snapshot().assetCount===1);
  await page.locator('#packFile').setInputFiles({name:'whole-biome.zip',mimeType:'application/zip',buffer:archive.buffer});
  await page.waitForFunction(()=>window.GaryBiomeWorkspace.snapshot().assetCount===2);
  assert.equal(await page.locator('#scene').inputValue(),'bridge-middle');
  await page.locator('#pass').selectOption('front');
  const selectedPass=await page.evaluate(()=>{
    const s=window.GaryBiomeWorkspace.snapshot();
    return s.pack.assets.find(a=>a.id===s.selected).pass;
  });
  assert.equal(selectedPass,'front');
  const live=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot());
  assert.ok(live.some(x=>x.pass==='front'&&x.registered===false));
  const image=await downloadBytes(page,'#screenshot');
  assert.equal(image.buffer.subarray(1,4).toString('ascii'),'PNG');
  await page.setViewportSize({width:375,height:667});
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=375,'375px phone layout must not overflow');
  assert.deepEqual(errors,[]);
  console.log(engine+': multiple real-renderer assets, touch placement, progression presets, full embedded PNG pack round-trip and PNG screenshot PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
