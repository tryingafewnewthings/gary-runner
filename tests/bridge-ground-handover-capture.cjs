'use strict';
/* Five native 360x640 REAL-ENGINE bridge checkpoints in day/night/rain.
 * This is QA evidence, never automatic artistic or iPhone approval.
 * Existing rejected wilderness artwork is NOT a style reference.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
const checkpoints={approach:210,preHandover:480,entrance:560,crossing:850,farExit:1210};
async function main(){
 const engine=process.env.GARY_TEST_ENGINE==='webkit'?'webkit':'chromium';
 const server=http.createServer((req,res)=>{
  const full=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://test').pathname));
  if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(full)]||'application/octet-stream');
   res.end(fs.readFileSync(full));}catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(String(error.message)));
  await page.goto('http://127.0.0.1:'+server.address().port+
   '/index.html?debug=1&bridgepreview=1&worldexplorer=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GaryWorldExplorer?.ready()&&
   window.GaryUserBridgeStatus?.ready(),null,{timeout:70000});
  const dir=path.join(root,'test-results','bridge-ground-handover',engine);
  fs.mkdirSync(dir,{recursive:true});
  const captures=[];
  for(const mode of ['day','night','rain']){
   for(const [name,near] of Object.entries(checkpoints)){
    const position=400+(near-120)*199/1250;
    const result=await page.evaluate(({mode,position})=>{
     window.GaryWorldExplorer.mode(mode);
     if(!window.GaryWorldExplorer.seek(position,18))throw Error('World Explorer seek failed');
     const snap=window.GaryWorldExplorer.snapshot();
     const source=document.getElementById('c'),canvas=document.createElement('canvas');
     canvas.width=360;canvas.height=640;
     canvas.getContext('2d').drawImage(source,0,0,360,640);
     return {base64:canvas.toDataURL('image/png').split(',')[1],
      near:snap.bridge.near,segment:snap.segment,frozen:snap.frozen};
    },{mode,position});
    if(result.segment!=='bridge'||!result.frozen||Math.abs(result.near-near)>1.5)
     throw Error('Wrong bridge coordinate '+name+': '+JSON.stringify(result));
    const bytes=Buffer.from(result.base64,'base64');
    if(bytes.readUInt32BE(16)!==360||bytes.readUInt32BE(20)!==640)
     throw Error('Invalid 360x640 capture: '+name+'/'+mode);
    const filename=mode+'-'+name+'.png';fs.writeFileSync(path.join(dir,filename),bytes);
    captures.push({file:filename,mode,checkpoint:name,near:result.near,
      width:360,height:640,actualEngine:true});
   }
  }
  if(errors.length)throw Error(errors.join('; '));
  fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify({
   schema:'gary-eats-bridge-ground-handover-evidence-v1',
   engine,source:'LIVE_INDEX_HTML_RENDERER',capturedAt:new Date().toISOString(),
   references:['original high-street cobbles','owner-accepted bridge mock-up as target'],
   excludedReference:'ALL EXISTING WILDERNESS ARTWORK',
   screenshots:captures,technical:'NATIVE_CANVAS_CAPTURED',
   visualApproval:'REQUIRES_OWNER_REVIEW',iphoneSafari:'NOT_TESTED'
  },null,2)+'\n');
  console.log('PASS '+engine+' 15 real-engine bridge ground transition captures');
 }finally{await browser?.close();server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
