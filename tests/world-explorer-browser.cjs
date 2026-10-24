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
  assert.equal(await page.locator('#checkpoints button').count(),5);
  const frame=page.frameLocator('#game');
  for(const p of [0,160,240,420,500,590,625,760,820,995]){
   await page.locator('#position').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},p);
   const snap=await frame.locator('#c').evaluate(c=>({
    width:c.width,height:c.height,
    data:c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3],
    segment:window.GaryWorldExplorer.snapshot().segment,
    frozen:window.GaryWorldExplorer.snapshot().frozen
   }));
   assert.ok(snap.width>=200&&snap.height>=350&&Math.abs(snap.width/snap.height-9/16)<.012,'responsive native 360x640 camera aspect is incorrect');
   assert.ok(snap.data>0,'blank scene at '+p);
   assert.equal(snap.frozen,true,'simulation must be frozen');
  }
  await page.locator('#lighting').selectOption('rain');
  await page.locator('#gary').uncheck();
  await page.locator('#hud').check();
  const result=await frame.locator('#c').evaluate(c=>({s:window.GaryWorldExplorer.snapshot(),png:c.toDataURL('image/png').slice(0,22)}));
  assert.equal(result.png,'data:image/png;base64,');
  const before=await frame.locator('#c').evaluate(c=>({width:c.width,height:c.height,s:window.GaryWorldExplorer.snapshot()}));
  const downloads={};
  for(const kind of ['composite','top-edge','bottom-edge','manifest']){
   const pending=page.waitForEvent('download');await page.locator('#seam-'+kind).click();
   const download=await pending;
   assert.equal(download.suggestedFilename(),'seam-template-'+kind+(kind==='manifest'?'.json':'.png'));
   downloads[kind]=fs.readFileSync(await download.path());
  }
  const manifest=JSON.parse(downloads.manifest);
  assert.equal(manifest.distance,before.s.distance);
  assert.equal(manifest.lightingMode,'rain');
  assert.deepEqual(manifest.hidden,{gary:true,hud:true,rain:true});
  assert.deepEqual(manifest.composite,{width:360,height:256,gapY:96,bottomY:160});
  const pixels=await page.evaluate(async data=>{
   const load=async src=>{const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return {c,x};};
   const a=await load(data.composite),t=await load(data.top),b=await load(data.bottom);
   const equal=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
   return {size:[a.c.width,a.c.height],transparent:a.x.getImageData(0,96,360,64).data.every(v=>v===0),
    top:equal(a.x.getImageData(0,0,360,96).data,t.x.getImageData(0,0,360,96).data),
    bottom:equal(a.x.getImageData(0,160,360,96).data,b.x.getImageData(0,0,360,96).data)};
  },Object.fromEntries([['composite','composite'],['top','top-edge'],['bottom','bottom-edge']].map(([k,v])=>[k,'data:image/png;base64,'+downloads[v].toString('base64')])));
  assert.deepEqual(pixels,{size:[360,256],transparent:true,top:true,bottom:true});
  assert.deepEqual(await frame.locator('#c').evaluate(c=>({width:c.width,height:c.height,s:window.GaryWorldExplorer.snapshot()})),before);
  for(const mode of ['bridge-exit','custom']){
   await page.locator('#seam-mode').selectOption(mode);
   const pending=page.waitForEvent('download');await page.locator('#seam-manifest').click();
   assert.equal(JSON.parse(fs.readFileSync(await (await pending).path())).mode,mode);
  }
  await page.locator('#seam-top').fill('641');await page.locator('#seam-composite').click();
  assert.match(await page.locator('#seam-status').textContent(),/Export error/);
  await page.locator('#seam-top').fill('96');
  await page.locator('#sheet').click();
  await page.waitForFunction(()=>!document.querySelector('#sheet').disabled,null,{timeout:70000});
  assert.equal(await page.locator('#contact').evaluate(c=>[c.width,c.height].join('x')),'720x960');
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS World Explorer mobile native renderer, 10 checkpoints, controls, seam exports and contact sheet');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
