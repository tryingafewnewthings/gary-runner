/* Gary Eats! portable ZIP pack support — PKZIP STORE writer + bounded ZIP reader.
   No dependencies, remote uploads, executable files or production asset installation. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GaryBiomeZip=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const te=new TextEncoder(),td=new TextDecoder();
 const MAX_TOTAL=25*1024*1024,MAX_SINGLE=4*1024*1024,MAX_FILES=90;
 function crc32(bytes){
  let c=0xffffffff;
  for(let i=0;i<bytes.length;i++){
   c^=bytes[i];
   for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
 }
 function safePath(name){
  if(typeof name!=='string'||!name||name.startsWith('/')||name.includes('\\')||name.includes('..')||name.includes(':')||
     name.replace(/\/$/,'').split('/').some(seg=>!seg||seg==='.')||name.length>240)throw Error('Unsafe ZIP entry path');
  return name;
 }
 function bytesOf(data){
  return data instanceof Uint8Array?data:typeof data==='string'?te.encode(data):null;
 }
 function put16(bytes,offset,value){new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).setUint16(offset,value,true);}
 function put32(bytes,offset,value){new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).setUint32(offset,value,true);}
 function zip(entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>MAX_FILES)throw Error('Invalid number of ZIP entries');
  let total=0,offset=0;const parts=[],directory=[],seen=new Set();
  for(const entry of entries){
   const name=safePath(entry.name),filename=te.encode(name),data=bytesOf(entry.data);
   if(!data||data.length>MAX_SINGLE||seen.has(name))throw Error('Invalid or duplicate ZIP entry '+name);
   seen.add(name);total+=data.length;if(total>MAX_TOTAL)throw Error('Biome ZIP exceeds safe phone limit');
   const crc=crc32(data),local=new Uint8Array(30+filename.length);
   put32(local,0,0x04034b50);put16(local,4,20);put16(local,6,0x800);put16(local,8,0);
   put32(local,14,crc);put32(local,18,data.length);put32(local,22,data.length);
   put16(local,26,filename.length);local.set(filename,30);
   const central=new Uint8Array(46+filename.length);
   put32(central,0,0x02014b50);put16(central,4,20);put16(central,6,20);
   put16(central,8,0x800);put16(central,10,0);put32(central,16,crc);
   put32(central,20,data.length);put32(central,24,data.length);
   put16(central,28,filename.length);put32(central,42,offset);central.set(filename,46);
   parts.push(local,data);directory.push(central);offset+=local.length+data.length;
  }
  const cdSize=directory.reduce((n,x)=>n+x.length,0);
  const footer=new Uint8Array(22);put32(footer,0,0x06054b50);
  put16(footer,8,directory.length);put16(footer,10,directory.length);
  put32(footer,12,cdSize);put32(footer,16,offset);
  return new Blob([...parts,...directory,footer],{type:'application/zip'});
 }
 async function unzip(data){
  const buffer=data instanceof ArrayBuffer?data:await data.arrayBuffer();
  if(buffer.byteLength>MAX_TOTAL*2)throw Error('ZIP file exceeds safe input limit');
  const b=new Uint8Array(buffer),v=new DataView(buffer);
  const u16=o=>v.getUint16(o,true),u32=o=>v.getUint32(o,true);
  let end=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){
   if(u32(i)===0x06054b50 && i+22+u16(i+20)===b.length){end=i;break;}
  }
  if(end<0)throw Error('Not a valid ZIP archive');
  const count=u16(end+10),dirOffset=u32(end+16),dirSize=u32(end+12);
  if(count>MAX_FILES||dirOffset+dirSize!==end||u16(end+4)!==0||u16(end+6)!==0||u16(end+8)!==count)throw Error('Invalid ZIP directory');
  const files=new Map();let pos=dirOffset,total=0;
  for(let i=0;i<count;i++){
   if(pos+46>b.length||u32(pos)!==0x02014b50)throw Error('Invalid ZIP central directory');
   const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16);
   const clen=u32(pos+20),ulen=u32(pos+24),nl=u16(pos+28),el=u16(pos+30),cl=u16(pos+32),offset=u32(pos+42);
   if(u16(pos+34)!==0)throw Error('Multi-disk ZIP artwork is unsupported');
   if(flags&1)throw Error('Encrypted ZIP artwork is unsupported');
   if(ulen>MAX_SINGLE||clen>MAX_TOTAL||ulen>MAX_TOTAL-total)throw Error('ZIP image exceeds safe decoded size');
   const name=safePath(td.decode(b.subarray(pos+46,pos+46+nl)));
   pos+=46+nl+el+cl;
   if(pos>dirOffset+dirSize||offset+30>b.length||u32(offset)!==0x04034b50)throw Error('Malformed ZIP offsets');
   const ln=u16(offset+26),le=u16(offset+28),start=offset+30+ln+le;
   if(start+clen>dirOffset || offset>=dirOffset ||
      u16(offset+8)!==method || u16(offset+6)!==flags ||
      td.decode(b.subarray(offset+30,offset+30+ln))!==name)throw Error('ZIP data truncated or inconsistent local header');
   if(!(flags&8)&&(u32(offset+14)!==crc||u32(offset+18)!==clen||u32(offset+22)!==ulen))throw Error('Inconsistent ZIP local sizes or CRC');
   let out=b.slice(start,start+clen);
   if(method===8){
    if(typeof DecompressionStream==='undefined')throw Error('Compressed ZIP unsupported in this browser; use a STORE ZIP or portable JSON');
    try{
     const reader=new Blob([out]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
     const chunks=[];let size=0;
     try{
      while(true){
       const {value,done}=await reader.read();if(done)break;
       size+=value.length;
       if(size>ulen||size>MAX_SINGLE){await reader.cancel();throw Error('Decompressed ZIP exceeds declared size');}
       chunks.push(value);
      }
     }finally{reader.releaseLock();}
     out=new Uint8Array(size);let at=0;for(const chunk of chunks){out.set(chunk,at);at+=chunk.length;}
    }catch(_){throw Error('Cannot decode deflate ZIP in this Safari version; use a STORE ZIP or portable JSON');}
   }else if(method!==0)throw Error('Unsupported ZIP compression method '+method);
   if(out.length!==ulen||crc32(out)!==crc)throw Error('ZIP entry integrity check failed: '+name);
   total+=out.length;if(total>MAX_TOTAL)throw Error('ZIP exceeds safe decoded size');
   if(!name.endsWith('/')){if(files.has(name))throw Error('Duplicate ZIP filename '+name);files.set(name,out);}
  }
  if(pos!==dirOffset+dirSize)throw Error('ZIP directory size mismatch');
  return files;
 }
 function fromDataUrl(url){
  if(typeof url!=='string'||!url.startsWith('data:image/png;base64,'))throw Error('Only embedded PNG data is supported');
  const b64=url.slice(22),str=atob(b64),out=new Uint8Array(str.length);
  for(let i=0;i<str.length;i++)out[i]=str.charCodeAt(i);
  return out;
 }
 function toDataUrl(bytes){
  if(!(bytes instanceof Uint8Array))throw Error('Invalid ZIP image data');
  let str='';for(let i=0;i<bytes.length;i+=32768){
   const chunk=bytes.subarray(i,i+32768);
   for(let j=0;j<chunk.length;j++)str+=String.fromCharCode(chunk[j]);
  }
  return 'data:image/png;base64,'+btoa(str);
 }
 return {zip,unzip,crc32,fromDataUrl,toDataUrl};
});
