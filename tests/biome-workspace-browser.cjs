'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const ZIP=require('../gary-biome-zip.js');
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
  const artifacts=path.join(root,'test-results',engine,'biome');fs.mkdirSync(artifacts,{recursive:true});
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
  const placement=a=>({name:a.name,source:a.source,draw:a.draw,pass:a.pass,opacity:a.opacity,scrollWithWorld:a.scrollWithWorld});
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
  const unpacked=await ZIP.unzip(new Blob([archive.buffer]));
  const manifest=JSON.parse(new TextDecoder().decode(unpacked.get('manifest.json')));
  assert.deepEqual(manifest.assets.map(placement),pack.assets.map(placement),'all exact placement values survive JSON then ZIP');
  for(let i=0;i<sprites.length;i++)assert.deepEqual(Buffer.from(unpacked.get(manifest.assets[i].path)),sprites[i].buffer,'original PNG byte integrity');
  const restored=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets);
  assert.deepEqual(restored.map(placement),pack.assets.map(placement));
  await page.locator('#advanced').evaluate(el=>el.open=true);
  await page.locator('#pass').selectOption('front');
  const selectedPass=await page.evaluate(()=>{
    const s=window.GaryBiomeWorkspace.snapshot();
    return s.pack.assets.find(a=>a.id===s.selected).pass;
  });
  assert.equal(selectedPass,'front');
  await page.waitForFunction(()=>document.querySelector('#game').contentWindow.GaryAssetPreview.packSnapshot().some(a=>a.pass==='front'));
  const live=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot());
  assert.ok(live.some(x=>x.pass==='front'&&x.registered===false));
  // Phone pointer events: tap jitter, locked movement and secondary touches must not place art.
  const beforeTouch=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[0].draw);
  await page.locator('#touch').evaluate(c=>{c.setPointerCapture=()=>{};}); // Synthetic pointer sequences have no native capture owner.
  const pointer=async(type,id,x,y,primary=true)=>page.locator('#touch').dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,clientX:x,clientY:y,button:0,bubbles:true});
  await page.locator('#touch').scrollIntoViewIfNeeded();
  const bounds=await page.locator('#touch').boundingBox();
  const tx=bounds.x+(beforeTouch.x+beforeTouch.width/2)*bounds.width/360,ty=bounds.y+(beforeTouch.y+beforeTouch.height/2)*bounds.height/640;
  await pointer('pointerdown',11,tx,ty);await pointer('pointermove',11,tx+1,ty+1);await pointer('pointercancel',11,tx+1,ty+1);
  assert.deepEqual(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[0].draw),beforeTouch);
  await page.locator('#lock').click();
  await pointer('pointerdown',12,tx,ty);await pointer('pointermove',12,tx+25,ty+30);await pointer('pointerup',12,tx+25,ty+30);
  assert.deepEqual(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[0].draw),beforeTouch);
  await page.locator('#lock').click();
  await pointer('pointerdown',13,tx,ty);await pointer('pointerdown',14,tx+10,ty,false);await pointer('pointermove',13,tx+30,ty+20);await pointer('pointerup',13,tx+30,ty+20);
  assert.deepEqual(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[0].draw),beforeTouch);
  const authoringDraw=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets.map(a=>a.draw));
  // Actual scrolling: both candidates move together; freeze/re-layer must not teleport the untouched one.
  const initialY=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().map(a=>a.screenY));
  await page.locator('#motion').click();
  await page.waitForFunction(y=>document.querySelector('#game').contentWindow.GaryAssetPreview.packSnapshot()[1].screenY>y+12,initialY[1]);
  await page.locator('#motion').click();
  const frozen=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().map(a=>a.screenY));
  assert.ok(frozen[0]>initialY[0]+12);assert.ok(Math.abs((frozen[0]-initialY[0])-(frozen[1]-initialY[1]))<.001);
  await page.locator('#pass').selectOption('rear');
  const afterLayer=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().map(a=>a.screenY));
  assert.deepEqual(afterLayer,frozen);
  const frozenDistance=await page.locator('#game').evaluate(e=>e.contentWindow.GaryRuntimeStats.snapshot().distance);
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#game').evaluate(e=>e.contentWindow.GaryRuntimeStats.snapshot().distance),frozenDistance);
  const scrollZip=await downloadBytes(page,'#exportZip');
  const scrollEntries=await ZIP.unzip(new Blob([scrollZip.buffer]));
  const scrollManifest=JSON.parse(new TextDecoder().decode(scrollEntries.get('manifest.json')));
  assert.deepEqual(scrollManifest.assets.map(a=>a.draw),authoringDraw,'scroll review must not rewrite checkpoint-relative world placements in an export');
  await page.locator('#mobilePreview').click();
  assert.equal(await page.locator('#game').evaluate(e=>e.contentWindow.GaryRuntimeStats.snapshot().distance),frozenDistance,'Preview must not reset a composed scene');
  await page.locator('#assets .item').nth(1).click();
  await page.locator('#worldScroll').uncheck();
  const mixed=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().map(a=>a.screenY));
  await page.locator('#motion').click();
  await page.waitForFunction(y=>document.querySelector('#game').contentWindow.GaryAssetPreview.packSnapshot()[0].screenY>y+8,mixed[0]);
  await page.locator('#motion').click();
  const mixedEnd=await page.locator('#game').evaluate(e=>e.contentWindow.GaryAssetPreview.packSnapshot().map(a=>a.screenY));
  assert.ok(mixedEnd[0]>mixed[0]+8);assert.equal(mixedEnd[1],mixed[1],'screen-fixed assets do not scroll');
  // Use conspicuous QA geometry to measure real engine occlusion, never replacement game art.
  const qa={...pack,assets:[{...pack.assets[0],draw:{x:80,y:180,width:200,height:440},pass:'rear'}]};
  await page.locator('#packFile').setInputFiles({name:'occlusion.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(qa))});
  await page.waitForFunction(()=>GaryBiomeWorkspace.snapshot().assetCount===1);
  const pixels=()=>page.locator('#game').evaluate(e=>{const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(e.contentDocument.querySelector('#c'),0,0,360,640);return c.toDataURL('image/png');});
  const captures={};
  for(const pass of ['ground','rear','under-water','deck','front']){
   await page.locator('#pass').selectOption(pass);
   await page.waitForFunction(p=>document.querySelector('#game').contentWindow.GaryAssetPreview.packSnapshot()[0]?.pass===p,pass);captures[pass]=await pixels();
   fs.writeFileSync(path.join(artifacts,'bridge-'+pass+'.png'),Buffer.from(captures[pass].split(',')[1],'base64'));
  }
  assert.notEqual(captures.rear,captures.front,'Gary must occlude rear candidates and be occluded by foreground');
  assert.notEqual(captures['under-water'],captures.deck,'water must occlude supports before the deck pass');
  assert.notEqual(captures.ground,captures['under-water'],'ground and submerged passes must render at different depths');
  for(const scene of ['street-day','street-rain','bridge-enter','bridge-exit','wilderness-dense']){
   await page.locator('#scene').selectOption(scene);
   assert.equal(await page.locator('#motion').getAttribute('data-playing'),'0');
   const png=await pixels();fs.writeFileSync(path.join(artifacts,scene+'.png'),Buffer.from(png.split(',')[1],'base64'));
  }
  for(const scene of ['street-day','wilderness-dense']){
   const groundPack={...qa,scene,assets:[{...qa.assets[0],draw:{x:0,y:130,width:100,height:500},pass:'ground'}]};
   await page.locator('#packFile').setInputFiles({name:'ground-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(groundPack))});
   await page.waitForFunction(s=>GaryBiomeWorkspace.snapshot().scene===s,scene);
   const below=await pixels();await page.locator('#pass').selectOption('rear');
   await page.waitForFunction(()=>document.querySelector('#game').contentWindow.GaryAssetPreview.packSnapshot()[0].pass==='rear');
   assert.notEqual(await pixels(),below,scene+': ground must be occluded by real buildings/vegetation');
  }
  // A useful multi-asset composition uses existing original files, with no generated artwork.
  const bush=fs.readFileSync(path.join(root,'art/fox/fox-bush.png'));
  const layout={...pack,scene:'street-day',assets:[
   {...pack.assets[0],name:'left-bush.png',source:{width:512,height:512},pngData:'data:image/png;base64,'+bush.toString('base64'),draw:{x:12,y:365,width:80,height:80},pass:'rear'},
   {...pack.assets[1],name:'right-bush.png',source:{width:512,height:512},pngData:'data:image/png;base64,'+bush.toString('base64'),draw:{x:270,y:475,width:80,height:80},pass:'front'}]};
  await page.locator('#packFile').setInputFiles({name:'original-art.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(layout))});
  await page.waitForFunction(()=>GaryBiomeWorkspace.snapshot().assetCount===2);
  for(const scene of ['street-day','bridge-middle','wilderness-reveal']){
   await page.locator('#scene').selectOption(scene);
   fs.writeFileSync(path.join(artifacts,'layout-'+scene+'.png'),Buffer.from((await pixels()).split(',')[1],'base64'));
  }
  // Explicit same-layer order is exported and applied by the renderer.
  await page.locator('#assets .item').nth(0).click();await page.locator('#pass').selectOption('front');
  await page.locator('#forward').click();
  assert.equal(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[1].name),'left-bush.png');
  const startSize=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[1].draw);
  await page.locator('#scale').evaluate(el=>{el.value='125';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  const endSize=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[1].draw);
  assert.equal(endSize.width/startSize.width,1.25);assert.equal(endSize.height/startSize.height,1.25);
  assert.equal(endSize.y+endSize.height,startSize.y+startSize.height,'scaling preserves the ground anchor');
  // A failed atomic import keeps the current pack intact, even when forged metadata says it is small.
  const beforeBad=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack);
  const invalid={...qa,assets:[{...qa.assets[0],draw:{...qa.assets[0].draw,x:1001}}]};
  await page.locator('#packFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Could not import biome'));
  assert.deepEqual(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack),beforeBad);
  const header=Buffer.from(sprites[0].buffer);header.writeUInt32BE(200000,16);
  await page.locator('#addFiles').setInputFiles({name:'oversized.png',mimeType:'image/png',buffer:header});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import failed'));
  assert.deepEqual(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack),beforeBad);
  // Generic DEFLATE ZIP from a standard producer, without a manifest.
  const zlib=require('node:zlib'),png=sprites[0].buffer,name=Buffer.from('art/standard.png'),compressed=zlib.deflateRawSync(png);
  const local=Buffer.alloc(30+name.length),central=Buffer.alloc(46+name.length),footer=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(ZIP.crc32(png),14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(png.length,22);local.writeUInt16LE(name.length,26);name.copy(local,30);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(ZIP.crc32(png),16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(png.length,24);central.writeUInt16LE(name.length,28);name.copy(central,46);
  footer.writeUInt32LE(0x06054b50);footer.writeUInt16LE(1,8);footer.writeUInt16LE(1,10);footer.writeUInt32LE(central.length,12);footer.writeUInt32LE(local.length+compressed.length,16);
  await page.locator('#addFiles').setInputFiles({name:'standard.zip',mimeType:'application/zip',buffer:Buffer.concat([local,compressed,central,footer])});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('PNGs imported from ZIP'));
  assert.equal(await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets[0].name),'standard.png');
  await page.locator('#scene').selectOption('bridge-middle');
  const bridgeFiles=['lower','deck','foreground'].map(name=>({name:name+'.png',data:new Uint8Array(fs.readFileSync(path.join(root,'art/bridge/production',name+'.png')))}));
  const bridgeZip=Buffer.from(await ZIP.zip(bridgeFiles).arrayBuffer());
  await page.locator('#addFiles').setInputFiles({name:'bridge-layers.zip',mimeType:'application/zip',buffer:bridgeZip});
  await page.waitForFunction(()=>GaryBiomeWorkspace.snapshot().assetCount===3);
  const registered=await page.evaluate(()=>GaryBiomeWorkspace.snapshot().pack.assets);
  assert.deepEqual(registered.map(a=>a.pass),['under-water','deck','front']);
  assert.ok(registered.every(a=>a.draw.x===0&&a.draw.y===50&&a.draw.width===360&&a.draw.height===1000),'full-frame bridge source uses its actual 2:1 registration and shared world anchor');
  const image=await downloadBytes(page,'#screenshot');
  assert.equal(image.buffer.subarray(1,4).toString('ascii'),'PNG');
  await page.setViewportSize({width:375,height:667});
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=375,'375px phone layout must not overflow');
  assert.deepEqual(errors,[]);
  console.log(engine+': exact ZIP bytes/placement, malformed import atomicity, DEFLATE, real pixel occlusion, scroll/freeze, phone pointer cancellation, multiple real-renderer assets, touch placement, progression presets, full embedded PNG pack round-trip and PNG screenshot PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
