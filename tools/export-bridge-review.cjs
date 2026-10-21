'use strict';
// Calibrate geometry from supplied alpha only. Never alter or generate painted pixels.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),art=require('../gary-bridge-art.js');
const root=path.join(__dirname,'..'),dir=path.join(root,'art/bridge/review-masks');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const pack=JSON.parse(fs.readFileSync(path.join(root,'gary-bridge-art-contract.json')));
 pack.candidate.structureRevision='supplied-rounded-arcade-v3';
 pack.candidate.archSpans=[[270,374],[450,554],[630,734]];pack.candidate.supportRanges=[[175,270],[374,450],[554,630],[734,819]];
 pack.candidate.soffitInset=null; // The supplied alpha trace, rather than an invented uniform inset, owns the soffits.
 pack.candidate.silhouettes={};pack.candidate.sourceHashes={};
 // Each [y, height, x, width, ...] band is a lossless binary trace of nonzero
 // source alpha. Two-source-pixel guard is applied at cache composition only.
 const report={schema:'gary-bridge-review-registration-v1',approved:false,files:{}};
 for(const key of art.KEYS){
  const file='art/bridge/production/'+key+'.png',bytes=fs.readFileSync(path.join(root,file));
  const im=await loadImage(bytes),c=createCanvas(720,2000),g=c.getContext('2d');g.drawImage(im,0,0);
  const data=g.getImageData(0,0,720,2000).data,bands=[];let count=0,bounds=[720,2000,-1,-1];
  for(let y=0;y<2000;y++){
   const runs=[];for(let x=0;x<720;){if(!data[(y*720+x)*4+3]){x++;continue;}const a=x;while(x<720&&data[(y*720+x)*4+3]){count++;bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];x++;}runs.push(a,x-a);}
   if(!runs.length)continue;
   const last=bands.at(-1);
   if(last&&last[0]+last[1]===y&&JSON.stringify(last.slice(2))===JSON.stringify(runs))last[1]++;
   else bands.push([y,1,...runs]);
  }
  pack.candidate.silhouettes[key]=bands;pack.candidate.sourceHashes[key]=hash(bytes);pack.layers[key].path=file;
  report.files[key]={path:file,source:[720,2000],draw:[360,1000],anchor:[360,1600],sha256:hash(bytes),nonzeroAlpha:count,transparentPixels:1440000-count,boundsInclusive:bounds,status:'PASS_METADATA_ONLY_NOT_ART_APPROVAL'};
 }
 pack.candidate.waterContacts=[{side:-1,x:78,y:408},{side:1,x:282,y:408},{side:-1,x:78,y:588},{side:1,x:282,y:588}];
 fs.writeFileSync(path.join(root,'gary-bridge-art-review.json'),JSON.stringify(pack)+'\n');
 const r=art.create({makeCanvas:()=>createCanvas(1,1),pack,environment:{drawWater(){}}});
 for(const [key,c] of [...Object.entries(r.templates),['water-occlusion-mask',r.waterMask]]){
  const bytes=c.toBuffer('image/png');fs.writeFileSync(path.join(dir,key+'.png'),bytes);
  report.files[key+'Mask']={path:'art/bridge/review-masks/'+key+'.png',sha256:hash(bytes),source:[720,2000],draw:[360,1000],anchor:[360,1600]};
 }
 report.geometry={revision:pack.candidate.structureRevision,method:'nonzero-alpha row-band trace, conservative 2-source-pixel composition guard',archVoids:[[80,310],[80,490],[80,670]],water:'independent clipped outer-foundation gradient; stream y300..680; contacts at y408/588',runtimeCacheBytes:5*360*1000*4,sourceDecodeBytes:3*720*2000*4};
 fs.writeFileSync(path.join(dir,'registration-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Exported supplied-alpha geometry and independent water mask; original PNG bytes unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
