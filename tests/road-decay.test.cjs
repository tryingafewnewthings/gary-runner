'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
async function setup(search=''){
 const pending=[];class Image{set src(v){pending.push(loadImage(require('node:path').join(__dirname,'..',v.split('?')[0])).then(img=>{this.native=img;this.onload();}));}}
 const w={location:{search},setTimeout,devicePixelRatio:1,document:{createElement:()=>{
  const canvas=createCanvas(1,1),get=canvas.getContext.bind(canvas);
  canvas.getContext=(kind)=>{const g=get(kind);return new Proxy(g,{get:(t,k)=>typeof t[k]==='function'?(...a)=>{if(k==='drawImage')a[0]=a[0].native||a[0];return t[k](...a);}:t[k],set:(t,k,v)=>{t[k]=v;return true;}});};return canvas;
 }}};vm.runInNewContext(fs.readFileSync(require.resolve('../gary-road-evolution.js'),'utf8'),{window:w,Image,URLSearchParams,Float64Array});await Promise.all(pending);
 const canvas=createCanvas(360,640),ctx=canvas.getContext('2d');
 const proxy=new Proxy(ctx,{get:(target,k)=>typeof target[k]==='function'?(...args)=>{if(k==='drawImage')args[0]=args[0].native||args[0];return target[k](...args);}:target[k],set:(t,k,v)=>{t[k]=v;return true;}});
 const api=w.GaryRoadEvolution;await api.prepare();
 function render(d){ctx.clearRect(0,0,360,640);api.drawCobbles(proxy,{x:0,y:0,w:105,h:640,distance:d});api.drawCobbles(proxy,{x:255,y:0,w:105,h:640,distance:d});api.drawRoad(proxy,{height:640,distance:d});return ctx.getImageData(0,0,360,640).data;}
 return {api,render,canvas};
}
test('normal and historical installer links remain clean; debug requires explicit flag',async()=>{
 for(const search of ['', '?roadstage=5','?roadstage=','?debug=1&roadstage=2.5']){const f=await setup(search);assert.ok(f.render(0).every(v=>v===0));assert.equal(f.api.snapshot().debugStage,null);}
 const f=await setup('?debug=1&roadstage=5');assert.ok(f.render(0).some(v=>v>0));
});
test('settled night, artwork, 30 active seconds, encounter gate and bounded samples',async()=>{
 const {api}=await setup();for(let i=0;i<3600;i++)api.update(1/60,i*4,.9,true);assert.equal(api.snapshot().elapsed,0);
 api.update(1/60,20000,1,false);assert.equal(api.snapshot().elapsed,0);
 let d=20000;for(let i=0;i<1801;i++){api.update(1/60,d,1,true);d+=(i<900?200:300)/60;if(i===1200)assert.equal(api.encounterReady(),false);}
 assert.equal(api.snapshot().elapsed,30);assert.equal(api.encounterReady(),true);
 assert.ok(api.snapshot().samples<=1802);assert.equal(api.progressAt(19999),0);
 const p=api.progressAt(22000);for(let i=0;i<10000;i++)api.update(1/60,d+i*5,1,true);assert.equal(api.progressAt(22000),p);assert.ok(api.snapshot().samples<2048);
 api.reset();assert.equal(api.snapshot().elapsed,0);assert.equal(api.encounterReady(),false);assert.equal(api.progressAt(22000),0);
});
test('real alpha rendering covers both cobbled pavements while all lane centres stay clear',async()=>{
 const {render}=await setup('?debug=1&roadstage=5');const data=render(15000);let left=0,right=0,strip=0;
 for(let y=0;y<640;y++)for(let x=0;x<360;x++)if(data[(y*360+x)*4+3]){
  if(x<102)left++;if(x>=258)right++;if(x>=89&&x<102)strip++;
  assert.ok(x<117||x>=243,'road incursion at '+x);
 }
 assert.ok(left>500&&right>500);assert.ok(strip>100,'narrow cobbled strip must receive visible decay');
});
test('world decals remain registered to the cobbles when scrolling',async()=>{
 const {render}=await setup('?debug=1&roadstage=3');const a=render(15000),b=render(15010);
 // Compare premultiplied colour; native raster filtering rounds by up to two levels.
 let maxAlpha=0,maxColor=0;
 for(let y=25;y<610;y++)for(let x=0;x<102;x++){
  const i=(y*360+x)*4,j=((y+10)*360+x)*4;
  maxAlpha=Math.max(maxAlpha,Math.abs(a[i+3]-b[j+3]));
  for(let c=0;c<3;c++)maxColor=Math.max(maxColor,Math.abs(a[i+c]*a[i+3]/255-b[j+c]*b[j+3]/255));
 }
 assert.ok(maxAlpha<=1,`alpha drift ${maxAlpha}`);assert.ok(maxColor<=2,`colour drift ${maxColor}`);
});

test('mature decay hides at least 95 percent of the cobbled area; render work is bounded',async()=>{
 const {api,render}=await setup('?debug=1&roadstage=5');
 const initial=api.snapshot().buildCount;assert.equal(initial,10);
 const data=render(15000);let covered=0,total=0;
 for(let y=0;y<640;y++)for(let x=0;x<102;x++){total++;if(data[(y*360+x)*4+3]>=242)covered++;}
 assert.ok(covered/total>=.95,`mature cover ${covered/total}`);
 const before=api.stats().blits;for(let i=0;i<100;i++)render(15000+i*3.25);
 assert.ok((api.stats().blits-before)/100<=48);assert.equal(api.snapshot().buildCount,initial);
 console.log('mature cobble cover:',(covered/total*100).toFixed(1)+'%; cached blits/frame:',(api.stats().blits-before)/100);
});
