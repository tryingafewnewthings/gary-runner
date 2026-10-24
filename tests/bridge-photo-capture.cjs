'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?debug=1&bridgepreview=1&painted=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GaryBridgePreview&&window.GaryAssetPreview?.ready()&&window.GaryUserBridgeStatus?.ready(),null,{timeout:65000});
  const out=path.join(root,'docs/bridge-user-review');fs.mkdirSync(out,{recursive:true});
  for(const mode of ['day','night','rain']){
   const raw=await page.evaluate(mode=>{
    if(!GaryAssetPreview.startScene('bridge-middle',mode))throw Error('Scene failed: '+mode);
    const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,360,640);
    return c.toDataURL('image/png').split(',')[1];
   },mode);
   const bytes=Buffer.from(raw,'base64');if(bytes.readUInt32BE(16)!==360||bytes.readUInt32BE(20)!==640)throw Error('Wrong capture size');
   fs.writeFileSync(path.join(out,mode+'.png'),bytes);
  }
  if(errors.length)throw Error(errors.join('; '));
  fs.writeFileSync(path.join(out,'REVIEW.md'),'# Supplied bridge review\n\nNative 360x640 game captures for day/night/rain. User artwork is staged for review, NOT approved or merged. Check in-game camera, entry taper, water movement and occlusion before merge.\n');
  console.log('Captured supplied bridge at 360x640 in day/night/rain');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
