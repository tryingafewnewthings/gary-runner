'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const ZIP=require('../gary-biome-zip.js');
const text=new TextEncoder();
test('portable biome ZIP stores independent unchanged PNG bytes and manifest',async()=>{
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,1,2,3,4,5]);
 const manifest=text.encode('{"schema":"gary-eats-biome-workspace-v1","approved":false}');
 const blob=ZIP.zip([{name:'manifest.json',data:manifest},{name:'assets/01-prop.png',data:png}]);
 assert.equal(blob.type,'application/zip');
 const raw=new Uint8Array(await blob.arrayBuffer());
 assert.deepEqual(Array.from(raw.subarray(0,4)),[80,75,3,4]);
 const decoded=await ZIP.unzip(blob);
 assert.equal(decoded.size,2);
 assert.deepEqual(decoded.get('assets/01-prop.png'),png);
 assert.deepEqual(decoded.get('manifest.json'),manifest);
});
test('ZIP rejects path traversal, duplicates and tampering',async()=>{
 const payload=text.encode('safe');
 assert.throws(()=>ZIP.zip([{name:'../bad.png',data:payload}]),/Unsafe ZIP/);
 assert.throws(()=>ZIP.zip([{name:'a.png',data:payload},{name:'a.png',data:payload}]),/duplicate/);
 assert.throws(()=>ZIP.zip([{name:'bad\\name',data:payload}]),/Unsafe ZIP/);
 const blob=ZIP.zip([{name:'a.png',data:payload}]),raw=new Uint8Array(await blob.arrayBuffer());
 const i=raw.indexOf(115);assert.ok(i>0);raw[i]^=1;
 await assert.rejects(ZIP.unzip(new Blob([raw])),/integrity check/);
});
test('ZIP data-URL conversion preserves original PNG bytes',()=>{
 const source='data:image/png;base64,iVBORw0KGgo=';
 const bytes=ZIP.fromDataUrl(source);
 assert.equal(ZIP.toDataUrl(bytes),source);
 assert.throws(()=>ZIP.fromDataUrl('data:image/svg+xml;base64,PHN2Zz4='),/Only embedded PNG/);
});
test('ZIP rejects inconsistent local headers, multi-disk archives and forged directory sizes',async()=>{
 const blob=ZIP.zip([{name:'art.png',data:text.encode('bytes')}]);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const local=bytes.slice();new DataView(local.buffer).setUint32(22,100,true);
 await assert.rejects(ZIP.unzip(new Blob([local])),/local sizes/);
 const disk=bytes.slice();new DataView(disk.buffer).setUint16(disk.length-18,1,true);
 await assert.rejects(ZIP.unzip(new Blob([disk])),/directory/);
 const directory=bytes.slice();new DataView(directory.buffer).setUint32(directory.length-10,1,true);
 await assert.rejects(ZIP.unzip(new Blob([directory])),/directory/);
});
test('DEFLATE decoder bounds actual output even if directory advertises tiny data',async()=>{
 const data=Buffer.alloc(2*1024*1024,65),compressed=require('node:zlib').deflateRawSync(data),name=Buffer.from('a.png');
 const local=Buffer.alloc(30+name.length),central=Buffer.alloc(46+name.length),end=Buffer.alloc(22);
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(1,22);name.copy(local,30);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(1,24);central.writeUInt16LE(name.length,28);name.copy(central,46);
 end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(local.length+compressed.length,16);
 await assert.rejects(ZIP.unzip(new Blob([local,compressed,central,end])),/decode deflate/);
});
