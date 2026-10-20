#!/usr/bin/env node
'use strict';
/** Gary Eats! dependency-free image metadata/alpha gate. Does not judge artistic quality. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const MAX_PIXELS = 30_000_000;
const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);
const table = new Uint32Array(256);
for (let n=0;n<256;n++) {let c=n; for (let k=0;k<8;k++) c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);table[n]=c>>>0;}
function crc32(buffer){let c=0xffffffff;for(const b of buffer)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function parsePng(buf, pixelRead=true){
 if(buf.length<33||!buf.subarray(0,8).equals(PNG_SIG))throw Error('Invalid PNG signature');
 let pos=8, ihdr=null, idat=[], trans=null, palette=null, sawEnd=false;
 while(pos+12<=buf.length){
  const len=buf.readUInt32BE(pos), name=buf.toString('ascii',pos+4,pos+8), end=pos+12+len;
  if(len>60_000_000||end>buf.length)throw Error('Broken/truncated PNG chunk '+name);
  const bytes=buf.subarray(pos+4,pos+8+len), stored=buf.readUInt32BE(pos+8+len);
  if(crc32(bytes)!==stored)throw Error('PNG CRC mismatch: '+name);
  const data=buf.subarray(pos+8,pos+8+len);
  if(name==='IHDR'){
   if(ihdr||len!==13)throw Error('Invalid IHDR');
   const width=data.readUInt32BE(0), height=data.readUInt32BE(4);
   ihdr={width,height,depth:data[8],type:data[9],compression:data[10],filter:data[11],interlace:data[12]};
   if(!width||!height||width>8192||height>8192||width*height>MAX_PIXELS)throw Error('Unreasonable raster dimensions');
   if(ihdr.compression||ihdr.filter||![0,1].includes(ihdr.interlace))throw Error('Unsupported PNG encoding');
  }
  if(name==='PLTE')palette=data;
  if(name==='tRNS')trans=data;
  if(name==='IDAT')idat.push(data);
  if(name==='IEND'){sawEnd=true;break;}
  pos=end;
 }
 if(!ihdr||!sawEnd||!idat.length)throw Error('PNG missing IHDR/IDAT/IEND');
 const {width,height,depth,type,interlace}=ihdr;
 const info={kind:'png',width,height,alphaChannel:type===4||type===6||!!trans,pixelAlpha:'UNVERIFIED',alphaMask:null};
 if(!pixelRead)return info;
 if(interlace!==0){info.pixelAlpha='UNVERIFIED (interlaced PNG)';return info;}
 const channels={0:1,2:3,3:1,4:2,6:4}[type];
 if(!channels||![1,2,4,8,16].includes(depth)||(type!==0&&type!==3&&depth<8)||(type===3&&depth===16))throw Error('Unsupported PNG colour depth');
 const rowBytes=Math.ceil(width*depth*channels/8), bpp=Math.max(1,Math.ceil(depth*channels/8));
 const need=(rowBytes+1)*height;
 if(need>230_000_000)throw Error('Decoded PNG too large');
 const raw=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:need+1});
 if(raw.length!==need)throw Error('PNG decoded row size mismatch');
 let prior=Buffer.alloc(rowBytes), hasAlpha=false, offset=0;
 const mask=(type===6&&depth===8)?new Uint8Array(width*height):null;
 for(let y=0;y<height;y++){
  const filter=raw[offset++], out=Buffer.allocUnsafe(rowBytes);
  for(let x=0;x<rowBytes;x++){
   const base=raw[offset++],a=x>=bpp?out[x-bpp]:0,b=prior[x],c=x>=bpp?prior[x-bpp]:0;
   let predictor=0;
   if(filter===1)predictor=a;
   else if(filter===2)predictor=b;
   else if(filter===3)predictor=Math.floor((a+b)/2);
   else if(filter===4)predictor=paeth(a,b,c);
   else if(filter!==0)throw Error('Unknown PNG scanline filter');
   out[x]=(base+predictor)&255;
  }
  for(let x=0;x<width;x++){
   let a=255;
   if(type===6){a=depth===8?out[x*4+3]:(out[x*8+6]===255&&out[x*8+7]===255?255:0);}
   else if(type===4){a=depth===8?out[x*2+1]:(out[x*4+2]===255&&out[x*4+3]===255?255:0);}
   else if(type===3&&trans){const bit=x*depth, k=depth===8?out[x]:(out[bit>>>3]>>>(8-depth-(bit&7)))&((1<<depth)-1);a=trans[k]===undefined?255:trans[k];}
   else if(type===0&&trans){const key=depth===16?trans.readUInt16BE(0):trans[1];const val=depth===16?out.readUInt16BE(x*2):depth===8?out[x]:(out[Math.floor(x*depth/8)]>>>(8-depth-((x*depth)%8)))&((1<<depth)-1);if(key===val)a=0;}
   else if(type===2&&trans){const stride=depth===16?6:3;const r=depth===16?out.readUInt16BE(x*stride):out[x*stride];const g=depth===16?out.readUInt16BE(x*stride+2):out[x*stride+1];const b=depth===16?out.readUInt16BE(x*stride+4):out[x*stride+2];if(r===trans.readUInt16BE(0)&&g===trans.readUInt16BE(2)&&b===trans.readUInt16BE(4))a=0;}
   if(a<255)hasAlpha=true;
   if(mask)mask[y*width+x]=a;
  }
  prior=out;
 }
 info.pixelAlpha=hasAlpha?'HAS_TRANSPARENT_PIXELS':'FULLY_OPAQUE';info.alphaMask=mask;
 return info;
}
function parseWebp(b){
 if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw Error('Invalid WebP RIFF header');
 const declared=b.readUInt32LE(4)+8;if(declared!==b.length)throw Error('WebP RIFF size mismatch');
 const type=b.toString('ascii',12,16),length=b.readUInt32LE(16),o=20;
 if(o+length>b.length)throw Error('Truncated WebP chunk');
 let width,height,flag=false;
 if(type==='VP8X'){
  if(length<10)throw Error('Short WebP VP8X');flag=!!(b[o]&0x10);
  width=1+b[o+4]+(b[o+5]<<8)+(b[o+6]<<16);height=1+b[o+7]+(b[o+8]<<8)+(b[o+9]<<16);
 }else if(type==='VP8 '){
  if(length<10||b[o+3]!==0x9d||b[o+4]!==1||b[o+5]!==0x2a)throw Error('Unsupported WebP VP8 frame');
  width=b.readUInt16LE(o+6)&0x3fff;height=b.readUInt16LE(o+8)&0x3fff;
 }else if(type==='VP8L'){
  if(length<5||b[o]!==0x2f)throw Error('Unsupported WebP lossless frame');
  width=1+b[o+1]+((b[o+2]&63)<<8);height=1+(b[o+2]>>6)+(b[o+3]<<2)+((b[o+4]&15)<<10);
  flag=!!(b[o+4]&0x10);
 }else throw Error('Unknown WebP image header '+type);
 if(!width||!height||width*height>MAX_PIXELS)throw Error('Unreasonable WebP dimensions');
 return {kind:'webp',width,height,alphaChannel:flag,pixelAlpha:'UNVERIFIED (WebP pixels not decoded)',alphaMask:null};
}
function boundsOf(mask,width,height,grid){
 const {cols,rows,cellWidth:w,cellHeight:h}=grid, found=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const a=mask[(row*h+y)*width+col*w+x];
   if(a>=18){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
  found.push(maxX<0?null:{minX,minY,maxX,maxY});
 }
 return found;
}
function inspect(buffer, filename, rule, defaults={}){
 const errors=[],warnings=[];
 if(!buffer.length)return {errors:['Empty file'],warnings};
 const ext=path.extname(filename).toLowerCase();
 if(!['.png','.webp'].includes(ext))return {errors:['Only PNG and WebP assets accepted'],warnings};
 const max=rule.maxBytes||defaults.maxBytes||6291456;
 if(buffer.length>max)errors.push(`Too large: ${buffer.length} bytes > ${max}`);
 let img;
 try{img=ext==='.png'?parsePng(buffer):parseWebp(buffer);}catch(e){return {errors:[...errors,String(e.message)],warnings};}
 if(img.kind!==ext.slice(1))errors.push('Extension and image contents disagree');
 if(rule.width!==undefined&&img.width!==rule.width)errors.push(`Wrong width ${img.width}; expected ${rule.width}`);
 if(rule.height!==undefined&&img.height!==rule.height)errors.push(`Wrong height ${img.height}; expected ${rule.height}`);
 if(rule.alpha===true){
  if(img.pixelAlpha==='FULLY_OPAQUE')errors.push('Transparent sprite contains no genuinely transparent pixels');
  else if(img.pixelAlpha!=='HAS_TRANSPARENT_PIXELS')warnings.push('Actual transparency UNVERIFIED: '+img.pixelAlpha);
 }
 if(rule.grid){
  const g=rule.grid;
  if(!Number.isInteger(g.cols)||!Number.isInteger(g.rows)||g.cols<1||g.rows<1)errors.push('Invalid grid row/column count');
  else if(img.width%g.cols||img.height%g.rows)errors.push('Sheet not divisible by grid');
  else{
   const cw=img.width/g.cols,ch=img.height/g.rows;
   if(g.cellWidth&&cw!==g.cellWidth)errors.push(`Cell width ${cw} != ${g.cellWidth}`);
   if(g.cellHeight&&ch!==g.cellHeight)errors.push(`Cell height ${ch} != ${g.cellHeight}`);
   if(g.baselineY!==undefined||g.padding!==undefined){
    if(img.alphaMask){
     for(const [i,b] of boundsOf(img.alphaMask,img.width,img.height,{...g,cellWidth:cw,cellHeight:ch}).entries()){
      if(!b){errors.push(`Empty sprite frame ${i+1}`);continue;}
      if(g.baselineY!==undefined&&Math.abs(b.maxY-g.baselineY)>(g.baselineTolerance||3))errors.push(`Frame ${i+1} baseline ${b.maxY} != ${g.baselineY} ±${g.baselineTolerance||3}`);
      if(g.padding!==undefined&&Math.min(b.minX,b.minY,cw-1-b.maxX,ch-1-b.maxY)<g.padding)errors.push(`Frame ${i+1} violates ${g.padding}px safe padding`);
     }
    }else warnings.push('Frame alpha bounds UNVERIFIED: only non-interlaced 8-bit RGBA PNG supported');
   }
  }
 }
 return {errors,warnings,info:{kind:img.kind,width:img.width,height:img.height,pixelAlpha:img.pixelAlpha,bytes:buffer.length}};
}
function manifest(rootDir=root){const m=JSON.parse(fs.readFileSync(path.join(rootDir,'asset-quality-manifest.json'),'utf8'));if(m.schemaVersion!==1||!m.assets||typeof m.assets!=='object')throw Error('Invalid asset-quality-manifest.json');return m;}
function checkFiles(rootDir,paths,m){
 const results=[];
 for(const filename of paths){
  const rule=m.assets[filename];
  if(!rule){results.push({file:filename,errors:['No quality contract in asset-quality-manifest.json'],warnings:[]});continue;}
  const full=path.resolve(rootDir,filename);
  if(!full.startsWith(rootDir+path.sep)){results.push({file:filename,errors:['Unsafe manifest path'],warnings:[]});continue;}
  if(!fs.existsSync(full)){results.push({file:filename,errors:['Missing asset'],warnings:[]});continue;}
  results.push({file:filename,...inspect(fs.readFileSync(full),filename,rule,m.defaults)});
 }
 return results;
}
function gitFiles(argv){
 const idx=argv.indexOf('--base');
 if(idx<0)throw Error('Expected --base <SHA> or --all');
 const base=argv[idx+1];
 if(!/^[a-f0-9]{7,40}$/i.test(base))throw Error('Invalid --base SHA');
 const out=cp.execFileSync('git',['-C',root,'diff','--name-only','--diff-filter=ACMR',`${base}...HEAD`],{encoding:'utf8'});
 return out.split('\n').map(x=>x.trim()).filter(Boolean);
}
function main(argv=process.argv.slice(2)){
 const m=manifest(root);let images=[];
 if(argv.includes('--all'))images=Object.keys(m.assets);
 else{
  const changes=gitFiles(argv);
  images=changes.filter(f=>/\.(png|webp|jpe?g)$/i.test(f));
  if(changes.includes('asset-quality-manifest.json'))images=[...new Set([...images,...Object.keys(m.assets)])];
 }
 const out=checkFiles(root,images,m);
 let fails=0,warns=0;
 for(const r of out){if(r.errors.length)fails++;if(r.warnings.length)warns++;
  console.log(`${r.errors.length?'FAIL':r.warnings.length?'UNVERIFIED':'PASS'} ${r.file}`);
  for(const e of r.errors)console.error('  - '+e);
  for(const e of r.warnings)console.warn('  ? '+e);
 }
 console.log(`Gary Eats! quality gate: ${out.length} images; ${fails} failed; ${warns} needing separate inspection. Artistic/camera and iPhone approval remain UNVERIFIED.`);
 return fails?1:0;
}
if(require.main===module){try{process.exitCode=main();}catch(e){console.error('FAIL Asset gate: '+e.message);process.exitCode=1;}}
module.exports={crc32,parsePng,parseWebp,boundsOf,inspect,checkFiles,main};
