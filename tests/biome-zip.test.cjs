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
