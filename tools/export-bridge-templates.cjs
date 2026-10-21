'use strict';
// Deterministic geometric masks/templates. No material artwork is generated.
const fs=require('node:fs'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const art=require('../gary-bridge-art.js'),pack=require('../gary-bridge-art-contract.json');
const root=path.join(__dirname,'..'),dir=path.join(root,'art/bridge/templates');fs.mkdirSync(dir,{recursive:true});
const renderer=art.create({makeCanvas:()=>createCanvas(1,1),pack,environment:{drawWater(){}}});
for(const key of art.KEYS)fs.writeFileSync(path.join(dir,key+'.png'),renderer.templates[key].toBuffer('image/png'));
fs.writeFileSync(path.join(dir,'water-occlusion-mask.png'),renderer.waterMask.toBuffer('image/png'));
fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify({schema:'gary-camera-candidate-v1',approved:false,source:'gary-camera-contract.json',artPack:'gary-bridge-art-contract.json',raisedArchitecture:pack.candidate,registration:pack.registration},null,2)+'\n');
const report={schema:'gary-bridge-registration-report-v1',approved:false,files:{}};
for(const [name,c] of [...Object.entries(renderer.templates),['water-occlusion-mask',renderer.waterMask]]){
 const data=c.getContext('2d').getImageData(0,0,720,2000).data;let count=0,left=720,top=2000,right=-1,bottom=-1;
 for(let y=0;y<2000;y++)for(let x=0;x<720;x++)if(data[(y*720+x)*4+3]){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const bytes=fs.readFileSync(path.join(dir,name+'.png'));
 report.files[name]={source:[720,2000],draw:[360,1000],anchor:[360,1600],nonzeroAlpha:count,transparentPixels:720*2000-count,boundsInclusive:[left,top,right,bottom],sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),status:'PASS_GEOMETRY_AND_ALPHA_ONLY'};
}
fs.writeFileSync(path.join(dir,'registration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('Exported three unapproved transparent blockouts and separate environment water mask (720x2000).');
