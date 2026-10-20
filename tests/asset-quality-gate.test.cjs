'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const zlib=require('node:zlib');
const {crc32,parsePng,parseWebp,inspect}=require('./asset-quality-gate.cjs');
function chunk(t,bytes){const name=Buffer.from(t),sz=Buffer.alloc(4),crc=Buffer.alloc(4);sz.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));return Buffer.concat([sz,name,bytes,crc]);}
function png(w,h,paint=()=>0,depth=8,type=6){
 const header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=depth;header[9]=type;
 const rows=[];for(let y=0;y<h;y++){const row=Buffer.alloc(1+4*w);for(let x=0;x<w;x++){const alpha=paint(x,y);row[1+4*x]=210;row[1+4*x+1]=50;row[1+4*x+2]=10;row[1+4*x+3]=alpha;}rows.push(row);}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);
}
test('CRC and PNG dimensions / actual alpha, not alpha-channel existence',()=>{
 const a=png(16,8,(x,y)=>x<8?0:255),b=png(16,8,()=>255);
 assert.equal(parsePng(a).width,16);assert.equal(parsePng(a).pixelAlpha,'HAS_TRANSPARENT_PIXELS');
 assert.equal(parsePng(b).pixelAlpha,'FULLY_OPAQUE');
 assert.match(inspect(b,'bad.png',{width:16,height:8,alpha:true}).errors.join(' '),/no genuinely transparent/);
});
test('Reject corrupt PNG chunks',()=>{const a=png(16,8);a[44]^=1;assert.match(inspect(a,'x.png',{}).errors.join(' '),/CRC mismatch/);});
test('Reject incorrect dimensions and invalid grid',()=>{
 const a=png(32,16);const r=inspect(a,'x.png',{width:20,grid:{cols:5,rows:1}});
 assert(r.errors.some(x=>x.includes('Wrong width')));assert(r.errors.some(x=>x.includes('not divisible')));
});
test('Approve registered padded frames and grounded y-baseline',()=>{
 const a=png(32,16,(x,y)=> ((x%16)>=5&&(x%16)<=10&&y>=6&&y<=12)?255:0);
 const g={cols:2,rows:1,cellWidth:16,cellHeight:16,baselineY:12,baselineTolerance:0,padding:3};
 assert.deepEqual(inspect(a,'good.png',{width:32,height:16,alpha:true,grid:g}).errors,[]);
 g.baselineY=8;assert.match(inspect(a,'bad.png',{grid:g}).errors.join(' '),/baseline/);
});
test('Reject empty frame or alpha across cell padding',()=>{
 const a=png(32,16,(x,y)=>x<16&&y>10?255:0);
 const r=inspect(a,'bad.png',{grid:{cols:2,rows:1,padding:2}});
 assert(r.errors.some(s=>s.includes('Empty sprite frame 2')));
 assert(r.errors.some(s=>s.includes('padding')));
});
test('WebP VP8X parses dimensions and does not claim pixel alpha proof',()=>{
 const b=Buffer.alloc(30);b.write('RIFF',0);b.writeUInt32LE(22,4);b.write('WEBPVP8X',8);b.writeUInt32LE(10,16);b[20]=0x10;b[24]=99;b[27]=49;
 const x=parseWebp(b);assert.equal(x.width,100);assert.equal(x.height,50);
 assert.match(inspect(b,'a.webp',{alpha:true}).warnings.join(' '),/UNVERIFIED/);
});
