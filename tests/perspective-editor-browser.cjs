'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const {createCanvas}=require('@napi-rs/canvas');
const Factory=require('../gary-asset-factory.js');
const definitions=require('../gary-asset-factory-contract.json');
const root=path.resolve(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp'};
function fixture(spec){
 const c=createCanvas(spec.source.width,spec.source.height),ctx=c.getContext('2d');
 ctx.scale(spec.source.width/spec.draw.width,spec.source.height/spec.draw.height);
 Factory.draw(ctx,spec,{mode:'mask'});
 return c.toBuffer('image/png');
}
async function settings(page){
 await page.locator('#copySettings').click();
 return JSON.parse(await page.locator('#copyField').inputValue());
}
async function main(){
 const server=http.createServer((req,res)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,
   ...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-perspective-editor.html?asset=victorian-lamppost',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Editor ready'),null,{timeout:7000}).catch(async()=>{
   const state=await page.evaluate(()=>({
     message:document.querySelector('#message')?.textContent,
     ready:document.readyState,
     scripts:[...document.scripts].map(x=>({src:x.src})),
     loadedAssets:document.querySelector('#asset')?.options?.length
   }));
   throw Error('Editor did not initialize: '+JSON.stringify({state,errors}));
  });
  assert.equal(await page.locator('#asset').inputValue(),'victorian-lamppost');
  const specimen=definitions.templates.find(t=>t.id==='victorian-lamppost');
  assert.equal(await page.locator('#edit').evaluate(c=>c.width),specimen.source.width);
  const sprite=fixture(specimen);
  await page.locator('#file').setInputFiles({name:'lamppost-paint.png',mimeType:'image/png',buffer:sprite});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('PNG loaded'),null,{timeout:20000});
  const original=await settings(page);
  assert.equal(original.approval.registered,false);
  assert.equal(original.settings.mode,'whole');
  assert.equal(original.sourceLayers.whole,'lamppost-paint.png');

  // Quick changes alter candidate only, anchor/world size stay fixed.
  await page.locator('#widthScale').evaluate(el=>{el.value='.95';el.dispatchEvent(new Event('change',{bubbles:true}));});
  const quick=await settings(page);
  assert.equal(quick.settings.quick.widthScale,.95);
  assert.deepEqual(quick.worldPlacement,{x:68,y:425,width:36,height:108});
  await page.locator('#compare').click();assert.equal(await page.locator('#compare').getAttribute('aria-pressed'),'true');
  await page.locator('#compare').click();

  await page.locator('[data-tool="corners"]').click();
  let edit=await settings(page);
  let q=edit.settings.quadrilaterals.whole;
  assert.equal(q.length,4);
  await page.locator('#handles').scrollIntoViewIfNeeded();
  const rect=await page.locator('#handles').boundingBox();
  assert.ok(rect.y>=0&&rect.y+rect.height<=844,'handles must be on screen before pointer drag');
  const p={x:rect.x+q[0].x*rect.width/specimen.source.width,
    y:rect.y+q[0].y*rect.height/specimen.source.height};
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+6,p.y+4,{steps:4});await page.mouse.up();
  edit=await settings(page);
  assert.ok(edit.settings.quadrilaterals.whole[0].x>q[0].x,
    'drag did not change corner: '+JSON.stringify({before:q[0],after:edit.settings.quadrilaterals.whole[0],
    rect,p,stageMessage:await page.locator('#message').textContent()}));
  const afterX=edit.settings.quadrilaterals.whole[0].x;
  await page.locator('#undo').click();
  edit=await settings(page);assert.ok(edit.settings.quadrilaterals.whole[0].x<afterX);
  await page.locator('#redo').click();
  edit=await settings(page);assert.equal(edit.settings.quadrilaterals.whole[0].x,afterX);

  const output=page.waitForEvent('download');await page.locator('#exportPng').click();
  const png=await output;assert.ok(png.suggestedFilename().endsWith('perspective-candidate.png'));
  const stream=await png.createReadStream(),chunks=[];
  for await(const ch of stream)chunks.push(ch);
  const bytes=Buffer.concat(chunks);
  assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
  assert.equal(bytes.readUInt32BE(16),specimen.source.width);
  assert.equal(bytes.readUInt32BE(20),specimen.source.height);

  const save=page.waitForEvent('download');await page.locator('#exportSettings').click();
  const json=await save;assert.ok(json.suggestedFilename().endsWith('perspective-candidate.json'));
  const settingsStream=await json.createReadStream(),pieces=[];
  for await(const p of settingsStream)pieces.push(p);
  const exported=Buffer.concat(pieces).toString('utf8');
  assert.equal(JSON.parse(exported).approval.camera,'UNVERIFIED_VISUAL');
  // JSON file roundtrip does not modify artwork pixels.
  await page.locator('#reset').click();
  await page.locator('#settingsFile').setInputFiles({name:'saved-edit.json',mimeType:'application/json',buffer:Buffer.from(exported)});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('restored'),null,{timeout:10000});
  assert.equal((await settings(page)).settings.quadrilaterals.whole[0].x,afterX);

  // A second mode composes individually supplied source-sized faces.
  await page.locator('#mode').selectOption('faces');
  await page.locator('#face').selectOption('roof');
  const roof=createCanvas(specimen.source.width,specimen.source.height);
  roof.getContext('2d').fillStyle='#e4a967';
  roof.getContext('2d').fillRect(45,45,190,70);
  await page.locator('#file').setInputFiles({name:'roof-only.png',mimeType:'image/png',buffer:roof.toBuffer('image/png')});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('roof'),null,{timeout:10000});
  const face=await settings(page);
  assert.equal(face.settings.mode,'faces');assert.equal(face.sourceLayers.roof,'roof-only.png');
  const facePng=page.waitForEvent('download');await page.locator('#exportPng').click();await facePng;
  const screenPng=page.waitForEvent('download');await page.locator('#previewPng').click();await screenPng;
  await page.setViewportSize({width:375,height:667});
  const canvas=await page.locator('.worldStage').boundingBox();
  assert.ok(Math.abs(canvas.width/canvas.height-9/16)<.015);
  assert.deepEqual(errors,[]);
  console.log(engineName+': perspective quick/handles, undo-redo, alpha export, settings roundtrip, independent-face import, iPhone preview PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
